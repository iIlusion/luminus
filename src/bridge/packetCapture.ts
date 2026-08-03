import type { LuminusApi } from "../ws/api";
import type { ObjectDataUpdate } from "../messages/incoming/ObjectsDataUpdateParser";
import { filterObjectUpdateNoise } from "./objectUpdateNoise";

// Keep enough compact entries for long sessions. Payloads are bounded before
// stringify so noisy room updates cannot stall the game's main thread.
const MAX_ENTRIES = 3_000;
const MAX_PARSED_LEN = 800;
const MAX_PARSE_ERROR_LEN = 400;
const MAX_ARRAY_ITEMS = 64;
const MAX_QUERY_LIMIT = 100;

export interface PacketEntry {
  ts: number;
  direction: "incoming" | "outgoing";
  header: number;
  name?: string;
  parsed?: string;
  parseError?: string;
}

const buffer: PacketEntry[] = [];
let writeIndex = 0;
let stop: (() => void) | null = null;

export function initPacketCapture(api: LuminusApi): void {
  if (stop) return;

  stop = api.onPacket((packet) => {
    const parsed = packet.header === 1453 && Array.isArray(packet.parsed)
      ? filterObjectUpdateNoise(packet.parsed as ObjectDataUpdate[], true)
      : packet.parsed;
    if (packet.header === 1453 && Array.isArray(parsed) && parsed.length === 0) return;

    const entry: PacketEntry = {
      ts: Date.now(),
      direction: packet.direction,
      header: packet.header,
      name: packet.name,
      parsed: parsed === undefined ? undefined : serializeParsed(packet.header, parsed),
      parseError: packet.parseError?.slice(0, MAX_PARSE_ERROR_LEN)
    };

    if (buffer.length < MAX_ENTRIES) buffer.push(entry);
    else {
      buffer[writeIndex] = entry;
      writeIndex = (writeIndex + 1) % MAX_ENTRIES;
    }
  });
}

export function stopPacketCapture(): void {
  stop?.();
  stop = null;
  buffer.length = 0;
  writeIndex = 0;
}

function serializeParsed(header: number, value: unknown): string {
  if (header === 360 && Array.isArray(value)) {
    return JSON.stringify(value.slice(0, MAX_ARRAY_ITEMS).map((item) => {
      const movement = item as Record<string, unknown>;
      return [
        movement.type,
        movement.id,
        movement.fromX,
        movement.fromY,
        movement.toX,
        movement.toY,
        movement.duration,
        movement.elapsed
      ];
    }));
  }

  if (header === 1453 && Array.isArray(value)) {
    const updates = value.slice(0, MAX_ARRAY_ITEMS).map((item) => {
      const update = item as { id?: unknown; state?: unknown };
      return [update.id, update.state];
    });
    return JSON.stringify(value.length > MAX_ARRAY_ITEMS
      ? { updates, omitted: value.length - MAX_ARRAY_ITEMS }
      : updates);
  }

  return truncate(safeStringify(compact(value, 0)), MAX_PARSED_LEN);
}

function compact(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= 3) return "[nested]";
  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map((item) => compact(item, depth + 1));
    return value.length > items.length ? [...items, `[+${value.length - items.length}]`] : items;
  }

  const output: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, item] of entries.slice(0, 24)) output[key] = compact(item, depth + 1);
  if (entries.length > 24) output.__omitted = entries.length - 24;
  return output;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export interface PacketQuery {
  header?: number;
  direction?: "incoming" | "outgoing";
  name?: string;
  limit?: number;
  since?: number;
}

export function getPackets(query: PacketQuery = {}): PacketEntry[] {
  const limit = Math.min(MAX_QUERY_LIMIT, Math.max(1, Math.floor(query.limit ?? 10)));
  let entries = buffer.length < MAX_ENTRIES || writeIndex === 0
    ? buffer
    : [...buffer.slice(writeIndex), ...buffer.slice(0, writeIndex)];

  if (query.header !== undefined) entries = entries.filter((e) => e.header === query.header);
  if (query.direction) entries = entries.filter((e) => e.direction === query.direction);
  if (query.since) entries = entries.filter((e) => e.ts >= query.since!);
  if (query.name) {
    const needle = query.name.toLowerCase();
    entries = entries.filter((e) => e.name?.toLowerCase().includes(needle));
  }

  return entries.slice(-limit);
}
