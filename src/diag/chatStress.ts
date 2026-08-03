/**
 * Temporary Chat Beta stress harness (dev/support).
 *
 * Seeds a huge whisper thread in memory (no IDB by default), can stream new
 * messages into whisper + room chat, and compares timer-jank while each is open.
 *
 *   await Luminus.runChatThreadStress()
 *   Luminus.chatStress.cleanup()
 */

import { addLog, addLogsBulk, removeLogs, type LogEntry } from "../logs/logStore";
import {
  openDirectConversation,
  selectChatConversation,
  getChatThread,
  getChatConversationViews,
} from "../chat/chatWorkspaceStore";
import {
  diagGetActiveRoomChatMessageCount,
  diagInjectRoomChatMessage,
} from "../chat/roomChatSessionStore";
import { createWhisperUserContact } from "../logs/whisperThreads";

export const CHAT_STRESS_MARKER = "⟦LUMINUS_STRESS⟧";

export interface ChatStressOptions {
  /** Whisper peer to seed/stream. Default: perversecorpse */
  peer?: string;
  /** Historical whisper lines to inject (memory only). Default 1200 */
  seedCount?: number;
  /** How long to stream new messages per scenario (ms). Default 2500 */
  streamMs?: number;
  /** Interval between streamed messages (ms). Default 120 */
  streamIntervalMs?: number;
  /** Load every older page into the DOM (can be heavy). Default true */
  loadAllVisible?: boolean;
  /** Probe window length per sample (ms). Default 700 */
  probeMs?: number;
  /** Samples per scenario. Default 3 */
  samples?: number;
  /** Keep stress logs after run. Default false (cleanup). */
  keepSeed?: boolean;
}

export interface ProbeSample {
  avgGapMs: number;
  p95Ms: number;
  maxMs: number;
  over33: number;
  effFps: number;
}

export interface ScenarioResult {
  id: string;
  ui: {
    roomThread: boolean;
    messageItems: number;
    nodes: number;
    active: string;
  };
  threadLen: number | null;
  roomMsgCount: number | null;
  samples: ProbeSample[];
  agg: {
    fps: number;
    fpsMin: number;
    fpsMax: number;
    p95: number;
    max: number;
  };
}

export interface ChatStressReport {
  version: 1;
  at: string;
  options: Required<Pick<ChatStressOptions, "peer" | "seedCount" | "streamMs" | "streamIntervalMs" | "loadAllVisible" | "probeMs" | "samples">>;
  meta: {
    myself: string | null;
    units: number | null;
    memMb: number | null;
    seeded: number;
    peerKey: string;
  };
  scenarios: ScenarioResult[];
  notes: string[];
}

let streamTimer: number | null = null;
let streamToken = 0;

export const chatStressApi = {
  marker: CHAT_STRESS_MARKER,
  seedWhisperThread,
  startWhisperStream,
  startRoomStream,
  stopStream,
  cleanup,
  loadAllOlderMessages,
  selectPeerInUi,
  selectRoomInUi,
  ensureChatBetaOpen,
  runChatThreadStress,
  probeTimerJank,
  listConversationSizes,
};

export async function runChatThreadStress(options: ChatStressOptions = {}): Promise<ChatStressReport> {
  const peer = (options.peer ?? "perversecorpse").trim() || "perversecorpse";
  const seedCount = Math.max(0, options.seedCount ?? 1200);
  const streamMs = Math.max(0, options.streamMs ?? 2500);
  const streamIntervalMs = Math.max(30, options.streamIntervalMs ?? 120);
  const loadAllVisible = options.loadAllVisible !== false;
  const probeMs = Math.max(300, options.probeMs ?? 700);
  const samples = Math.max(1, options.samples ?? 3);
  const keepSeed = options.keepSeed === true;
  const notes: string[] = [];

  stopStream();
  cleanup();

  const myself = (window as unknown as { Luminus?: { myself?: { username?: string }; room?: { units?: { size: number } } } })
    .Luminus?.myself?.username?.trim() || "Eu";
  const peerKey = createWhisperUserContact(peer).key;

  const seeded = seedWhisperThread(peer, seedCount, myself);
  openDirectConversation(peer);

  ensureChatBetaOpen();
  await sleep(200);
  selectPeerInUi(peer);
  await sleep(250);

  if (loadAllVisible) {
    const clicks = await loadAllOlderMessages(40);
    notes.push(`Carregar anteriores: ${clicks} clique(s) no thread de ${peer}.`);
  }

  const scenarios: ScenarioResult[] = [];

  // 1) heavy whisper static
  scenarios.push(await measureScenario({
    id: "whisper_seeded_static",
    peer,
    threadLen: getChatThread(peerKey).length,
    roomMsgCount: diagGetActiveRoomChatMessageCount(),
    probeMs,
    samples,
  }));

  // 2) heavy whisper + live stream
  if (streamMs > 0) {
    startWhisperStream({ peer, myself, intervalMs: streamIntervalMs });
    scenarios.push(await measureScenario({
      id: "whisper_seeded_streaming",
      peer,
      threadLen: getChatThread(peerKey).length,
      roomMsgCount: diagGetActiveRoomChatMessageCount(),
      probeMs: Math.max(probeMs, Math.min(streamMs, 1200)),
      samples,
    }));
    stopStream();
    await sleep(100);
  }

  // 3) real room chat static
  selectRoomInUi();
  await sleep(200);
  scenarios.push(await measureScenario({
    id: "room_real_static",
    peer,
    threadLen: getChatThread(peerKey).length,
    roomMsgCount: diagGetActiveRoomChatMessageCount(),
    probeMs,
    samples,
  }));

  // 4) room + synthetic stream on top of real traffic
  if (streamMs > 0) {
    startRoomStream({ actor: "StressBot", intervalMs: streamIntervalMs });
    scenarios.push(await measureScenario({
      id: "room_real_plus_stream",
      peer,
      threadLen: getChatThread(peerKey).length,
      roomMsgCount: diagGetActiveRoomChatMessageCount(),
      probeMs: Math.max(probeMs, Math.min(streamMs, 1200)),
      samples,
    }));
    stopStream();
    await sleep(100);
  }

  // 5) closed baseline
  closeChatBeta();
  await sleep(150);
  scenarios.push(await measureScenario({
    id: "chat_closed",
    peer,
    threadLen: null,
    roomMsgCount: diagGetActiveRoomChatMessageCount(),
    probeMs,
    samples,
  }));

  // reopen room for continuity
  ensureChatBetaOpen();
  await sleep(120);
  selectRoomInUi();

  if (!keepSeed) {
    const removed = cleanup();
    notes.push(`Cleanup removeu ${removed} entradas de stress.`);
  } else {
    notes.push("Seed mantido (keepSeed=true). Rode Luminus.chatStress.cleanup() depois.");
  }

  // compare notes
  const wh = scenarios.find(s => s.id === "whisper_seeded_static");
  const room = scenarios.find(s => s.id === "room_real_static");
  const closed = scenarios.find(s => s.id === "chat_closed");
  if (wh && room) {
    notes.push(
      `Static: whisper ${wh.agg.fps}fps (${wh.ui.messageItems} items) vs room ${room.agg.fps}fps (${room.ui.messageItems} items).`,
    );
  }
  if (wh && closed) {
    notes.push(`Whisper seeded vs closed: ${wh.agg.fps} vs ${closed.agg.fps} fps.`);
  }

  const L = (window as unknown as { Luminus?: { room?: { units?: { size: number } } } }).Luminus;
  const report: ChatStressReport = {
    version: 1,
    at: new Date().toISOString(),
    options: { peer, seedCount, streamMs, streamIntervalMs, loadAllVisible, probeMs, samples },
    meta: {
      myself,
      units: L?.room?.units?.size ?? null,
      memMb: readMemMb(),
      seeded,
      peerKey,
    },
    scenarios,
    notes,
  };

  await copyJson(report);
  console.log("[Luminus] Chat thread stress report (copiado):", report);
  return report;
}

export function seedWhisperThread(peer: string, count: number, myself = "Eu"): number {
  if (count <= 0) return 0;
  const now = Date.now();
  const start = now - count * 1000;
  const entries: LogEntry[] = [];
  for (let i = 0; i < count; i++) {
    const fromPeer = i % 2 === 0;
    entries.push({
      ts: start + i * 1000,
      type: "whisper",
      actor: fromPeer ? peer : myself,
      target: fromPeer ? myself : peer,
      message: `${CHAT_STRESS_MARKER} seed #${i + 1}/${count} lorem chat stress line`,
    });
  }
  openDirectConversation(peer);
  addLogsBulk(entries, { persist: false });
  return entries.length;
}

export function startWhisperStream(input: {
  peer: string;
  myself?: string;
  intervalMs?: number;
}): void {
  stopStream();
  const peer = input.peer;
  const myself = input.myself ?? "Eu";
  const intervalMs = input.intervalMs ?? 120;
  const token = ++streamToken;
  let n = 0;
  streamTimer = window.setInterval(() => {
    if (token !== streamToken) return;
    n += 1;
    const fromPeer = n % 2 === 1;
    addLog({
      ts: Date.now(),
      type: "whisper",
      actor: fromPeer ? peer : myself,
      target: fromPeer ? myself : peer,
      message: `${CHAT_STRESS_MARKER} live #${n}`,
    }, { persist: false });
  }, intervalMs);
}

export function startRoomStream(input: {
  actor?: string;
  intervalMs?: number;
}): void {
  stopStream();
  const actor = input.actor ?? "StressBot";
  const intervalMs = input.intervalMs ?? 120;
  const token = ++streamToken;
  let n = 0;
  streamTimer = window.setInterval(() => {
    if (token !== streamToken) return;
    n += 1;
    const ok = diagInjectRoomChatMessage({
      actor,
      message: `${CHAT_STRESS_MARKER} room live #${n}`,
    });
    if (!ok) {
      console.warn("[Luminus] chatStress: nenhuma sessão de sala ativa para injetar.");
      stopStream();
    }
  }, intervalMs);
}

export function stopStream(): void {
  streamToken += 1;
  if (streamTimer != null) {
    window.clearInterval(streamTimer);
    streamTimer = null;
  }
}

export function cleanup(): number {
  stopStream();
  let removed = 0;
  removeLogs(entry => {
    const hit = entry.message?.includes(CHAT_STRESS_MARKER);
    if (hit) removed += 1;
    return Boolean(hit);
  });
  return removed;
}

function clickElement(el: Element | null | undefined): void {
  if (!el) return;
  // Avoid `view: window` — MCP/bridge wrappers may not be a real Window and throw on MouseEvent.
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

export function ensureChatBetaOpen(): void {
  if (document.getElementById("luminus-chat-beta")) return;
  clickElement(document.querySelector(".luminus-chat-beta-trigger"));
}

export function closeChatBeta(): void {
  if (!document.getElementById("luminus-chat-beta")) return;
  clickElement(document.querySelector(".luminus-chat-beta-trigger"));
}

export function selectPeerInUi(peer: string): boolean {
  ensureChatBetaOpen();
  const want = peer.toLocaleLowerCase();
  const buttons = [...document.querySelectorAll<HTMLElement>(
    "#luminus-chat-beta .cb-contact:not(.cb-room-contact) .cb-contact-main",
  )];
  const hit = buttons.find(btn => (btn.textContent || "").toLocaleLowerCase().includes(want));
  if (!hit) {
    // conversation may exist only in store — force select by key
    selectChatConversation(createWhisperUserContact(peer).key);
    return true;
  }
  clickElement(hit);
  return true;
}

export function selectRoomInUi(): boolean {
  ensureChatBetaOpen();
  const btn = document.querySelector("#luminus-chat-beta .cb-room-contact .cb-contact-main");
  if (!btn) return false;
  clickElement(btn);
  return true;
}

export async function loadAllOlderMessages(maxClicks = 30): Promise<number> {
  let clicks = 0;
  for (let i = 0; i < maxClicks; i++) {
    const btn = document.querySelector<HTMLButtonElement>("#luminus-chat-beta .cb-load-older");
    if (!btn) break;
    btn.click();
    clicks += 1;
    await sleep(40);
  }
  return clicks;
}

export async function probeTimerJank(ms: number): Promise<ProbeSample> {
  const gaps: number[] = [];
  let last = performance.now();
  const end = last + ms;
  while (performance.now() < end) {
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 16);
    });
    const now = performance.now();
    gaps.push(now - last);
    last = now;
  }
  if (!gaps.length) {
    return { avgGapMs: 0, p95Ms: 0, maxMs: 0, over33: 0, effFps: 0 };
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return {
    avgGapMs: round1(avg),
    p95Ms: round1(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    maxMs: round1(sorted[sorted.length - 1] ?? 0),
    over33: gaps.filter(g => g > 33).length,
    effFps: round1(avg > 0 ? 1000 / avg : 0),
  };
}

async function measureScenario(input: {
  id: string;
  peer: string;
  threadLen: number | null;
  roomMsgCount: number | null;
  probeMs: number;
  samples: number;
}): Promise<ScenarioResult> {
  const samples: ProbeSample[] = [];
  for (let i = 0; i < input.samples; i++) {
    samples.push(await probeTimerJank(input.probeMs));
  }
  const ui = readUi();
  return {
    id: input.id,
    ui,
    threadLen: input.threadLen,
    roomMsgCount: input.roomMsgCount,
    samples,
    agg: {
      fps: round1(samples.reduce((a, s) => a + s.effFps, 0) / samples.length),
      fpsMin: round1(Math.min(...samples.map(s => s.effFps))),
      fpsMax: round1(Math.max(...samples.map(s => s.effFps))),
      p95: round1(samples.reduce((a, s) => a + s.p95Ms, 0) / samples.length),
      max: round1(samples.reduce((a, s) => a + s.maxMs, 0) / samples.length),
    },
  };
}

function readUi(): ScenarioResult["ui"] {
  const root = document.getElementById("luminus-chat-beta");
  if (!root) {
    return { roomThread: false, messageItems: 0, nodes: 0, active: "" };
  }
  return {
    roomThread: Boolean(root.querySelector(".cb-room-thread-header")),
    messageItems: root.querySelectorAll('[data-slot="message-scroller-item"]').length,
    nodes: root.querySelectorAll("*").length,
    active: (root.querySelector(".cb-contact.is-active")?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48),
  };
}

function readMemMb(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? round1(mem.usedJSHeapSize / 1048576) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function copyJson(value: unknown): Promise<void> {
  const text = JSON.stringify(value, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fallback */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  } catch {
    console.warn("[Luminus] Não foi possível copiar o report de stress.");
  }
}

/** Debug helper: list conversation sizes currently in workspace. */
export function listConversationSizes(): Array<{ key: string; name: string; messages: number }> {
  return getChatConversationViews()
    .map(item => ({ key: item.key, name: item.displayName, messages: item.messages }))
    .sort((a, b) => b.messages - a.messages);
}
