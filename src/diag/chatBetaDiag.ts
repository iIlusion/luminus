/**
 * Chat Beta performance diagnostic for support (works on production builds).
 * Run via: Luminus.runChatBetaDiag()  or Tampermonkey menu.
 * Copies a JSON report to the clipboard and returns it.
 */

export interface ChatBetaDiagReport {
  version: 1;
  at: string;
  session: {
    href: string;
    userAgent: string;
    language: string;
    dpr: number;
    cores: number | null;
    deviceMemoryGb: number | null;
    visibility: DocumentVisibilityState;
    hwAccelHint: string;
  };
  luminus: {
    hasApi: boolean;
    username: string | null;
    roomId: number | null;
    roomUnits: number | null;
    roomFurnis: number | null;
    scriptHint: string | null;
  };
  memoryMb: { used: number; total: number; limit: number } | null;
  storage: {
    estimateMb: { usage: number; quota: number } | null;
    idbDatabases: Array<{ name: string; version: number | null }>;
    logs: {
      total: number | null;
      whispers: number | null;
      clicks: number | null;
      jsonMb: number | null;
      error?: string;
    };
    heavyLocalStorage: Array<{ key: string; kb: number }>;
  };
  graphics: {
    canvases: Array<{ w: number; h: number; cssW: number; cssH: number }>;
    webgl: { vendor: string; renderer: string; contextLost: boolean } | null;
  };
  chatBeta: {
    wasOpen: boolean;
    openCostMs: number | null;
    nodes: number;
    domDelta: number;
    avatars: number;
    messageItems: number;
    contactRows: number;
    backdrop: string | null;
    geometry: { w: number; h: number } | null;
  };
  frames: {
    closed: FrameSummary | null;
    open: FrameSummary | null;
    openNoBlur: FrameSummary | null;
  };
  longTasks: {
    duringOpen: Array<{ durMs: number; startMs: number }>;
    duringOpenSample: number;
    duringOpenMaxMs: number;
  };
  notes: string[];
}

interface FrameSummary {
  samples: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  over33ms: number;
  fpsEst: number;
}

const SAMPLE_MS = 1800;
const NO_BLUR_CSS = `
#luminus-chat-beta.lm-float-window,
.lm-float-window,
#luminus-panel {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background: rgba(18, 20, 28, 0.96) !important;
}
`;

export async function runChatBetaDiag(options?: {
  /** Keep Chat Beta open if it was closed when the diag started. Default false. */
  leaveOpen?: boolean;
}): Promise<ChatBetaDiagReport> {
  const leaveOpen = options?.leaveOpen === true;
  const notes: string[] = [];
  const longTaskBuf: Array<{ durMs: number; startMs: number }> = [];
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        longTaskBuf.push({
          durMs: round1(entry.duration),
          startMs: round1(entry.startTime),
        });
      }
    });
    observer.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
  } catch {
    notes.push("PerformanceObserver longtask indisponivel neste navegador.");
  }

  const wasOpen = Boolean(document.getElementById("luminus-chat-beta"));
  const trigger = document.querySelector<HTMLElement>(".luminus-chat-beta-trigger");
  if (!trigger) notes.push("Botao Chat Beta nao encontrado na toolbar.");

  const framesClosed = wasOpen ? null : await sampleFrames(SAMPLE_MS);

  let openCostMs: number | null = null;
  const beforeDom = document.querySelectorAll("*").length;
  const beforeLt = longTaskBuf.length;

  if (!wasOpen && trigger) {
    const t0 = performance.now();
    click(trigger);
    await waitFrames(2);
    await sleep(80);
    openCostMs = round1(performance.now() - t0);
  }

  const beta = document.getElementById("luminus-chat-beta");
  if (!beta) notes.push("Chat Beta nao montou apos clique.");

  const afterDom = document.querySelectorAll("*").length;
  const betaNodes = beta ? beta.querySelectorAll("*").length : 0;
  const avatars = beta ? beta.querySelectorAll("img").length : 0;
  const messageItems = beta
    ? beta.querySelectorAll('[data-slot="message-scroller-item"], .cb-ui-message-scroller-item').length
    : 0;
  const contactRows = beta
    ? beta.querySelectorAll(".cb-contact, .cb-row").length
    : 0;
  const backdrop = beta
    ? (() => {
      const cs = getComputedStyle(beta) as CSSStyleDeclaration & { webkitBackdropFilter?: string };
      const value = cs.backdropFilter || cs.webkitBackdropFilter || "";
      return value && value !== "none" ? value : value || null;
    })()
    : null;
  const geometry = beta
    ? { w: Math.round(beta.getBoundingClientRect().width), h: Math.round(beta.getBoundingClientRect().height) }
    : null;

  const openTasksStart = beforeLt;
  const framesOpen = beta ? await sampleFrames(SAMPLE_MS) : null;

  let framesNoBlur: FrameSummary | null = null;
  if (beta) {
    const style = document.createElement("style");
    style.id = "luminus-chat-beta-diag-noblur";
    style.textContent = NO_BLUR_CSS;
    document.documentElement.appendChild(style);
    await sleep(50);
    framesNoBlur = await sampleFrames(SAMPLE_MS);
    style.remove();
  }

  const duringOpen = longTaskBuf.slice(openTasksStart);
  const duringOpenMaxMs = duringOpen.reduce((max, item) => Math.max(max, item.durMs), 0);

  if (beta && !wasOpen && !leaveOpen && trigger) {
    click(trigger);
    await waitFrames(1);
  } else if (beta && wasOpen && leaveOpen === false) {
    // leave as found
  }

  observer?.disconnect();

  const L = (window as unknown as { Luminus?: LuminusDiagApi }).Luminus;
  const storage = await collectStorage();
  const report: ChatBetaDiagReport = {
    version: 1,
    at: new Date().toISOString(),
    session: {
      href: location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      dpr: devicePixelRatio || 1,
      cores: navigator.hardwareConcurrency ?? null,
      deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      visibility: document.visibilityState,
      hwAccelHint: guessHwAccel(),
    },
    luminus: {
      hasApi: Boolean(L),
      username: L?.myself?.username ?? null,
      roomId: L?.room?.id ?? null,
      roomUnits: L?.room?.units?.size ?? null,
      roomFurnis: L?.room?.furnis?.size ?? null,
      scriptHint: findUserscriptHint(),
    },
    memoryMb: readMemory(),
    storage,
    graphics: {
      canvases: [...document.querySelectorAll("canvas")].map(c => ({
        w: c.width,
        h: c.height,
        cssW: c.clientWidth,
        cssH: c.clientHeight,
      })),
      webgl: readWebGl(),
    },
    chatBeta: {
      wasOpen,
      openCostMs,
      nodes: betaNodes,
      domDelta: afterDom - beforeDom,
      avatars,
      messageItems,
      contactRows,
      backdrop,
      geometry,
    },
    frames: {
      closed: framesClosed,
      open: framesOpen,
      openNoBlur: framesNoBlur,
    },
    longTasks: {
      duringOpen: duringOpen
        .filter(item => item.durMs >= 50)
        .sort((a, b) => b.durMs - a.durMs)
        .slice(0, 20),
      duringOpenSample: duringOpen.length,
      duringOpenMaxMs: round1(duringOpenMaxMs),
    },
    notes: [
      ...notes,
      ...buildAutoNotes({
        framesClosed,
        framesOpen,
        framesNoBlur,
        units: L?.room?.units?.size ?? null,
        backdrop,
        duringOpenMaxMs,
        logTotal: storage.logs.total,
      }),
    ],
  };

  await copyReport(report);
  console.log("[Luminus] Diagnostico Chat Beta (tambem copiado para a area de transferencia):", report);
  return report;
}

interface LuminusDiagApi {
  myself?: { username?: string } | null;
  room?: {
    id?: number | null;
    units?: { size: number };
    furnis?: { size: number };
  };
}

function buildAutoNotes(input: {
  framesClosed: FrameSummary | null;
  framesOpen: FrameSummary | null;
  framesNoBlur: FrameSummary | null;
  units: number | null;
  backdrop: string | null;
  duringOpenMaxMs: number;
  logTotal: number | null;
}): string[] {
  const notes: string[] = [];
  const { framesClosed, framesOpen, framesNoBlur } = input;
  if (framesClosed && framesOpen && framesOpen.fpsEst + 8 < framesClosed.fpsEst) {
    notes.push(
      `FPS caiu com Chat Beta aberto (${framesClosed.fpsEst} -> ${framesOpen.fpsEst}).`,
    );
  }
  if (framesOpen && framesNoBlur && framesNoBlur.fpsEst > framesOpen.fpsEst + 5) {
    notes.push(
      `Remover backdrop-filter melhorou FPS (${framesOpen.fpsEst} -> ${framesNoBlur.fpsEst}).`,
    );
  }
  if (framesOpen && framesNoBlur && framesNoBlur.fpsEst + 5 < (framesClosed?.fpsEst ?? 60)) {
    notes.push("Ainda ha custo alem do blur (DOM/React/reatividade de sala).");
  }
  if (input.units != null && input.units >= 80) {
    notes.push(`Sala cheia: ${input.units} units (re-render de presenca pode pesar com o chat aberto).`);
  }
  if (input.backdrop && input.backdrop !== "none") {
    notes.push(`backdrop-filter ativo no Chat Beta: ${input.backdrop}`);
  }
  if (input.duringOpenMaxMs >= 200) {
    notes.push(`Long task max ${input.duringOpenMaxMs}ms com chat aberto (main thread bloqueada).`);
  }
  if (input.logTotal != null && input.logTotal >= 5000) {
    notes.push(`Historico local grande: ${input.logTotal} entradas no IndexedDB luminus.logs.`);
  }
  return notes;
}

async function collectStorage(): Promise<ChatBetaDiagReport["storage"]> {
  let estimateMb: { usage: number; quota: number } | null = null;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      estimateMb = {
        usage: round2((est.usage ?? 0) / 1048576),
        quota: round1((est.quota ?? 0) / 1048576),
      };
    }
  } catch {
    estimateMb = null;
  }

  let idbDatabases: Array<{ name: string; version: number | null }> = [];
  try {
    const dbs = await indexedDB.databases?.();
    idbDatabases = (dbs ?? [])
      .filter(db => db.name)
      .map(db => ({ name: db.name!, version: db.version ?? null }));
  } catch {
    idbDatabases = [];
  }

  const logs = await readLogsSummary();
  const heavyLocalStorage = listHeavyLocalStorage(12);

  return { estimateMb, idbDatabases, logs, heavyLocalStorage };
}

async function readLogsSummary(): Promise<ChatBetaDiagReport["storage"]["logs"]> {
  try {
    const db = await openDb("luminus.logs");
    const storeName = db.objectStoreNames.contains("entries") ? "entries" : db.objectStoreNames[0];
    if (!storeName) {
      db.close();
      return { total: 0, whispers: 0, clicks: 0, jsonMb: 0 };
    }
    const all = await idbGetAll(db, storeName);
    db.close();
    const whispers = all.filter(e => e && e.type === "whisper").length;
    const clicks = all.filter(e => e && e.type === "click").length;
    let jsonMb = 0;
    try {
      jsonMb = round2(JSON.stringify(all).length / 1048576);
    } catch {
      jsonMb = 0;
    }
    return { total: all.length, whispers, clicks, jsonMb };
  } catch (error) {
    return {
      total: null,
      whispers: null,
      clicks: null,
      jsonMb: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function listHeavyLocalStorage(limit: number): Array<{ key: string; kb: number }> {
  const rows: Array<{ key: string; kb: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? "";
      if (value.length < 2048 && !/luminus/i.test(key)) continue;
      rows.push({ key, kb: round1(value.length / 1024) });
    }
  } catch {
    return [];
  }
  return rows.sort((a, b) => b.kb - a.kb).slice(0, limit);
}

function readMemory(): ChatBetaDiagReport["memoryMb"] {
  const mem = (performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  }).memory;
  if (!mem) return null;
  return {
    used: round1(mem.usedJSHeapSize / 1048576),
    total: round1(mem.totalJSHeapSize / 1048576),
    limit: round1(mem.jsHeapSizeLimit / 1048576),
  };
}

function readWebGl(): ChatBetaDiagReport["graphics"]["webgl"] {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: String(gl.getParameter(gl.VENDOR)),
      renderer: dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER)),
      contextLost: gl.isContextLost(),
    };
  } catch {
    return null;
  }
}

function guessHwAccel(): string {
  const gl = readWebGl();
  if (!gl) return "webgl-unavailable";
  if (gl.contextLost) return "context-lost";
  const r = gl.renderer.toLowerCase();
  if (r.includes("swiftshader") || r.includes("llvmpipe") || r.includes("software")) {
    return "software-like";
  }
  return "gpu-like";
}

function findUserscriptHint(): string | null {
  try {
    const scripts = [...document.querySelectorAll("script")];
    const hit = scripts.find(s => /luminus/i.test(s.textContent?.slice(0, 200) ?? "") || /luminus/i.test(s.src));
    if (hit?.src) return hit.src.slice(0, 160);
    const meta = document.querySelector("script[data-luminus], #luminus-root, #luminus-icon");
    if (meta) return "dom-injected";
  } catch {
    /* ignore */
  }
  return document.getElementById("luminus-icon") ? "toolbar-present" : null;
}

async function sampleFrames(ms: number): Promise<FrameSummary> {
  const frames = await new Promise<number[]>(resolve => {
    const out: number[] = [];
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      out.push(now - last);
      last = now;
      if (now - start < ms) requestAnimationFrame(tick);
      else resolve(out);
    };
    requestAnimationFrame(tick);
  });
  return summarizeFrames(frames);
}

function summarizeFrames(frames: number[]): FrameSummary {
  if (!frames.length) {
    return { samples: 0, avgMs: 0, p95Ms: 0, maxMs: 0, over33ms: 0, fpsEst: 0 };
  }
  const sorted = [...frames].sort((a, b) => a - b);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  return {
    samples: frames.length,
    avgMs: round2(avg),
    p95Ms: round2(p95),
    maxMs: round2(max),
    over33ms: frames.filter(f => f > 33).length,
    fpsEst: round1(avg > 0 ? 1000 / avg : 0),
  };
}

function click(el: HTMLElement): void {
  // Avoid `view: window` — bridge/page wrappers may not be a real Window.
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function waitFrames(n: number): Promise<void> {
  return new Promise(resolve => {
    let left = n;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onsuccess = () => resolve(req.result);
  });
}

function idbGetAll(db: IDBDatabase, store: string): Promise<Array<{ type?: string }>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as Array<{ type?: string }>) ?? []);
    req.onerror = () => reject(req.error ?? new Error("idb getAll failed"));
  });
}

async function copyReport(report: ChatBetaDiagReport): Promise<void> {
  const text = JSON.stringify(report, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fallback */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  } catch {
    console.warn("[Luminus] Nao foi possivel copiar o diagnostico. Use o objeto retornado no console.");
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
