import type { LuminusApi } from "../ws/api";
import { readPref, writePref } from "../util/prefs";
import { initConsoleCapture, stopConsoleCapture, getConsoleLogs, type ConsoleQuery } from "./consoleCapture";
import { initPacketCapture, stopPacketCapture, getPackets, type PacketQuery } from "./packetCapture";
import { domQuery, domEval, type DomQueryParams, type DomEvalParams } from "./domTools";
import { compactResponse } from "./responseBudget";

const PREF_KEY = "luminus.mcpBridge.enabled";
const REQUEST_EVENT = "luminus-mcp-request";
const RESPONSE_EVENT = "luminus-mcp-response";
const STATUS_EVENT = "luminus-mcp-status";
const TOGGLE_EVENT = "luminus-mcp-toggle";
const READY_EVENT = "luminus-mcp-transport-ready";

type RpcRequest = { id: string; method: string; params?: Record<string, unknown> };
type RpcResponse = { id: string; result?: unknown; error?: string };
type Status = "disconnected" | "connecting" | "connected";
type ProbeParams = {
  dom?: DomQueryParams;
  console?: ConsoleQuery;
  packets?: PacketQuery;
  maxChars?: number;
};

let initialized = false;
let enabled = false;
let status: Status = "disconnected";
let apiRef: LuminusApi | null = null;

const handlers: Record<string, (params: any) => unknown | Promise<unknown>> = {
  "dom.query": (params: DomQueryParams) => domQuery(params),
  "dom.eval": (params: DomEvalParams) => domEval(params),
  "console.get": (params: ConsoleQuery) => getConsoleLogs(params),
  "packets.get": (params: PacketQuery) => getPackets(params),
  "packets.send": (params: { header: number | string; values?: unknown[] }) => {
    if (!apiRef) return { error: "api indisponível" };
    return { ok: apiRef.send(params.header, params.values) };
  },
  "probe": (params: ProbeParams) => {
    const result: Record<string, unknown> = {};
    if (params.dom) result.dom = domQuery(params.dom);
    if (params.console) result.console = getConsoleLogs(params.console);
    if (params.packets) result.packets = getPackets(params.packets);
    return compactResponse(result, { maxChars: params.maxChars }).value;
  }
};

export function initMcpBridge(api: LuminusApi): void {
  apiRef = api;

  if (!initialized) {
    initialized = true;
    document.addEventListener(REQUEST_EVENT, onRequest);
    document.addEventListener(STATUS_EVENT, onStatus);
    document.addEventListener(READY_EVENT, syncTransport);
  }

  enabled = readPref(PREF_KEY, false);
  syncCapture();
  setStatus(enabled ? "connecting" : "disconnected");
  syncTransport();
}

export function setMcpBridgeEnabled(value: boolean): void {
  enabled = value;
  writePref(PREF_KEY, value);
  syncCapture();
  setStatus(value ? "connecting" : "disconnected");
  // Force toggle through even if debounced READY fired recently.
  lastToggleSent = null;
  syncTransport();
}

function syncCapture(): void {
  if (enabled && apiRef) {
    initConsoleCapture();
    initPacketCapture(apiRef);
    return;
  }
  stopConsoleCapture();
  stopPacketCapture();
}

export function getMcpBridgeEnabled(): boolean {
  return enabled;
}

export function getMcpBridgeStatus(): Status {
  return status;
}

let lastToggleSent: boolean | null = null;
let lastToggleAt = 0;

function syncTransport(): void {
  // Debounce READY re-announces from the extension port (same enabled value).
  const now = Date.now();
  if (lastToggleSent === enabled && now - lastToggleAt < 800) return;
  lastToggleSent = enabled;
  lastToggleAt = now;
  dispatch(TOGGLE_EVENT, { enabled });
}

function onStatus(event: Event): void {
  const message = parse<{ status?: Status }>((event as CustomEvent<string>).detail);
  if (!message?.status || !["disconnected", "connecting", "connected"].includes(message.status)) return;
  setStatus(enabled ? message.status : "disconnected");
}

function onRequest(event: Event): void {
  void handleRequest((event as CustomEvent<string>).detail);
}

async function handleRequest(detail: string): Promise<void> {
  if (!enabled) return;
  const request = parse<RpcRequest>(detail);
  if (!request?.id || !request.method) return;

  const response: RpcResponse = { id: request.id };
  try {
    const handler = handlers[request.method];
    if (!handler) throw new Error(`Método desconhecido: ${request.method}`);
    response.result = await handler(request.params ?? {});
  } catch (error) {
    response.error = error instanceof Error ? error.message : String(error);
  }

  dispatch(RESPONSE_EVENT, response);
}

function setStatus(next: Status): void {
  if (status === next) return;
  status = next;
  console.log(`[Luminus] Bridge MCP: ${next}`);
}

function dispatch(name: string, value: unknown): void {
  document.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(value) }));
}

function parse<T>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
