import type { PacketBridge } from "../ws/PacketBridge";
import { readPref, writePref } from "../util/prefs.ts";
import { NATIVE_GROUP_RESET_PREFIX } from "./nativeGroupWhisperResetPrefix.ts";

export const WHISPER_REPEAT_WINDOW_MS = 2 * 60 * 1000;
export const WHISPER_REPEAT_COOLDOWN_MS = 5000;
export const WHISPER_ANTISPAM_PREF = "luminus.chat.whisperAntispam";
const RETRY_MS = 500;

type Schedule = (callback: () => void, delay: number) => number;

interface QueuedWhisper {
  data: ArrayBuffer;
  contentKey: string;
}

export class WhisperQueue {
  private readonly items: QueuedWhisper[] = [];
  private repeatedAt: Array<{ contentKey: string; timestamp: number }> = [];
  private timer: number | null = null;
  private lastSentAt: number | null = null;
  private readonly send: (data: ArrayBuffer) => boolean;
  private readonly schedule: Schedule;
  private readonly now: () => number;

  constructor(
    send: (data: ArrayBuffer) => boolean,
    schedule: Schedule = (callback, delay) => window.setTimeout(callback, delay),
    now: () => number = Date.now
  ) {
    this.send = send;
    this.schedule = schedule;
    this.now = now;
  }

  enqueue(data: ArrayBuffer, contentKey = ""): void {
    this.items.push({ data: data.slice(0), contentKey });
    this.pump();
  }

  private pump(): void {
    if (this.timer !== null || !this.items.length) return;
    const now = this.now();
    this.repeatedAt = this.repeatedAt.filter(item => now - item.timestamp < WHISPER_REPEAT_WINDOW_MS);
    let repeatReadyAt = Infinity;

    for (let index = 0; index < this.items.length; index++) {
      const readyAt = this.getRepeatReadyAt(this.items[index].contentKey, now);
      repeatReadyAt = Math.min(repeatReadyAt, readyAt);
      if (readyAt <= now) break;
    }

    const delay = Math.max(0, repeatReadyAt - now);
    this.timer = this.schedule(() => {
      this.timer = null;
      if (delay > 0) {
        this.pump();
        return;
      }
      const nextIndex = this.findReadyItemIndex(this.now());
      const item = this.items[nextIndex];
      if (!item) {
        this.pump();
        return;
      }
      if (!this.send(item.data)) {
        this.timer = this.schedule(() => { this.timer = null; this.pump(); }, RETRY_MS);
        return;
      }
      this.items.splice(nextIndex, 1);
      this.lastSentAt = this.now();
      if (item.contentKey) this.repeatedAt.push({ contentKey: item.contentKey, timestamp: this.lastSentAt });
      this.pump();
    }, delay);
  }

  private findReadyItemIndex(now: number): number {
    return this.items.findIndex(item => this.getRepeatReadyAt(item.contentKey, now) <= now);
  }

  private getRepeatReadyAt(contentKey: string, now: number): number {
    if (!contentKey) return now;
    const repeated = this.repeatedAt.filter(item => item.contentKey === contentKey);
    return repeated.length < 2
      ? now
      : repeated[repeated.length - 1].timestamp + WHISPER_REPEAT_COOLDOWN_MS;
  }
}

export function normalizeWhisperContent(content: string): string {
  const normalized = content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "");
  return normalized || content.trim().toLocaleLowerCase("pt-BR");
}

export function shouldBypassWhisperQueue(value: string, myself = ""): boolean {
  const separator = value.indexOf(" ");
  const target = separator === -1 ? value : value.slice(0, separator);
  const message = separator === -1 ? "" : value.slice(separator + 1);
  if (target.toLocaleLowerCase("pt-BR") === "group") return true;
  return Boolean(myself)
    && target.localeCompare(myself, undefined, { sensitivity: "accent" }) === 0
    && message.startsWith(NATIVE_GROUP_RESET_PREFIX);
}

export function isWhisperAntispamEnabled(): boolean {
  return readPref(WHISPER_ANTISPAM_PREF, false);
}

export function setWhisperAntispamEnabled(enabled: boolean): void {
  writePref(WHISPER_ANTISPAM_PREF, enabled);
}

function readWhisperValue(body: ArrayBuffer): string {
  if (body.byteLength < 2) throw new Error("Whisper sem conteúdo");
  const length = new DataView(body).getUint16(0, false);
  if (length > body.byteLength - 2) throw new Error("Whisper truncado");
  return new TextDecoder().decode(body.slice(2, 2 + length));
}

export function initWhisperQueue(bridge: PacketBridge): () => void {
  const queue = new WhisperQueue(data => bridge.sendQueuedRaw(data));
  return bridge.deferOutgoing(1543, (data, packet) => {
    if (!isWhisperAntispamEnabled()) {
      bridge.sendQueuedRaw(data);
      return;
    }
    try {
      const value = readWhisperValue(packet.body);
      if (shouldBypassWhisperQueue(value, bridge.myself?.username ?? "")) {
        bridge.sendQueuedRaw(data);
        return;
      }
      const separator = value.indexOf(" ");
      queue.enqueue(data, separator === -1 ? "" : normalizeWhisperContent(value.slice(separator + 1)));
    } catch {
      queue.enqueue(data);
    }
  });
}
