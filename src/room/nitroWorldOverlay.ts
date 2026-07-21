import type { LuminusApi } from "../ws/api";

type NitroRequire = ((id: string | number) => unknown) & {
  c?: Record<string, { exports: unknown }>;
  m?: Record<string, unknown>;
};

type NitroWindow = Window & {
  RoomEngine?: RoomEngine;
  NitroInstance?: { roomEngine?: RoomEngine; _roomEngine?: RoomEngine };
  __luminusRoomEngineProbeMatches?: number;
  __luminusRoomEngineSource?: string;
  webpackJsonpnitroReact?: {
    push: (...args: unknown[]) => unknown;
    __luminusWrapped?: boolean;
  };
  "webpackJsonpnitro-react"?: {
    push: (...args: unknown[]) => unknown;
    __luminusWrapped?: boolean;
  };
  __luminusWebpackRequire?: NitroRequire;
  __luminusEvalProbe?: boolean;
  __luminusRoomEngineDiscover?: boolean;
};

export type RoomEngine = {
  activeRoomId?: number;
  getRoomObjectScreenLocation(
    roomId: number,
    objectId: number,
    objectType: number,
    canvasId?: number,
  ): { x: number; y: number } | null;
  getRoomObject?(roomId: number, id: number, category: number): unknown;
  getRoomObjects?(roomId: number, category: number): unknown[];
};

const UNIT_CATEGORY = 100;

function isRoomEngine(value: unknown): value is RoomEngine {
  return Boolean(
    value
    && typeof value === "object"
    && typeof (value as RoomEngine).getRoomObjectScreenLocation === "function",
  );
}

function pickRoomEngine(value: unknown): RoomEngine | null {
  if (isRoomEngine(value)) return value;
  if (value && typeof value === "object") {
    const host = value as { _roomEngine?: unknown; roomEngine?: unknown };
    if (isRoomEngine(host._roomEngine)) return host._roomEngine;
    if (isRoomEngine(host.roomEngine)) return host.roomEngine;
  }
  return null;
}

function publishRoomEngine(page: NitroWindow, engine: RoomEngine, source: string): RoomEngine {
  page.RoomEngine = engine;
  page.__luminusRoomEngineSource = source;
  return engine;
}

/** Valid existing global engine, if any. */
function existingRoomEngine(page: NitroWindow): RoomEngine | null {
  if (isRoomEngine(page.RoomEngine)) return page.RoomEngine;
  const nitro = page.NitroInstance;
  const fromNitro = pickRoomEngine(nitro) ?? pickRoomEngine(nitro?._roomEngine) ?? pickRoomEngine(nitro?.roomEngine);
  if (fromNitro) return publishRoomEngine(page, fromNitro, "NitroInstance");
  return null;
}

/** Webpack module cache scan (shallow). */
function findRoomEngineInWebpack(loader: NitroRequire | undefined): RoomEngine | null {
  const cache = loader?.c;
  if (!cache) return null;
  for (const module of Object.values(cache)) {
    const exports = module.exports;
    const candidates = [
      exports,
      ...(exports && typeof exports === "object" ? Object.values(exports as object) : []),
    ];
    for (const candidate of candidates) {
      const engine = pickRoomEngine(candidate);
      if (engine) return engine;
      // static INSTANCE on Nitro-like constructors
      if (typeof candidate === "function") {
        const inst = (candidate as { INSTANCE?: unknown }).INSTANCE;
        const fromInst = pickRoomEngine(inst);
        if (fromInst) return fromInst;
      }
      if (candidate && typeof candidate === "object") {
        const inst = (candidate as { INSTANCE?: unknown }).INSTANCE;
        const fromInst = pickRoomEngine(inst);
        if (fromInst) return fromInst;
      }
    }
  }
  return null;
}

/**
 * Habblet keeps RoomEngine only on live Nitro objects reachable from React fiber
 * under the room canvas — not on webpack exports. Walk fiber from canvas parents.
 */
function findRoomEngineInReactFiber(doc: Document): RoomEngine | null {
  const canvases = doc.querySelectorAll("canvas");
  for (const canvas of canvases) {
    let node: Element | null = canvas;
    for (let up = 0; up < 6 && node; up += 1, node = node.parentElement) {
      const fiberKey = Object.keys(node).find(
        key => key.startsWith("__reactFiber") || key.startsWith("__reactInternalInstance"),
      );
      if (!fiberKey) continue;
      const engine = walkFiberForRoomEngine((node as unknown as Record<string, unknown>)[fiberKey]);
      if (engine) return engine;
    }
  }
  return null;
}

function walkFiberForRoomEngine(root: unknown): RoomEngine | null {
  if (!root || typeof root !== "object") return null;
  const seen = new Set<object>();
  const queue: unknown[] = [root];
  let steps = 0;
  let best: RoomEngine | null = null;

  while (queue.length && steps < 8_000) {
    const node = queue.shift();
    steps += 1;
    if (!node || (typeof node !== "object" && typeof node !== "function")) continue;
    if (seen.has(node as object)) continue;
    seen.add(node as object);

    const engine = pickRoomEngine(node);
    if (engine) {
      // Prefer engines that already have an active room.
      if (engine.activeRoomId != null && engine.activeRoomId > 0) return engine;
      best ??= engine;
    }

    // Also check common prop names without full key scan first.
    try {
      const rec = node as Record<string, unknown>;
      for (const key of ["_roomEngine", "roomEngine", "stateNode", "memoizedState", "memoizedProps", "pendingProps"]) {
        if (rec[key] != null) queue.push(rec[key]);
      }
      for (const key of ["child", "sibling", "return", "alternate", "dependencies", "queue", "next", "element"]) {
        if (rec[key] != null) queue.push(rec[key]);
      }
    } catch {
      /* ignore */
    }

    // Hook state linked list
    try {
      let state = (node as { memoizedState?: { memoizedState?: unknown; element?: unknown; queue?: unknown; next?: unknown } }).memoizedState;
      let i = 0;
      while (state && i < 40) {
        if (state.memoizedState != null) queue.push(state.memoizedState);
        if (state.element != null) queue.push(state.element);
        if (state.queue != null) queue.push(state.queue);
        state = state.next as typeof state;
        i += 1;
      }
    } catch {
      /* ignore */
    }

    // stateNode private fields (Nitro / previewer)
    try {
      const sn = (node as { stateNode?: object }).stateNode;
      if (sn && typeof sn === "object") {
        for (const key of Object.keys(sn)) {
          if (key.startsWith("_") || key === "props" || key === "context") {
            queue.push((sn as Record<string, unknown>)[key]);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  return best;
}

/**
 * Resolve and publish `window.RoomEngine`. Safe to call often.
 * Returns null until Nitro room is mounted.
 */
export function ensureRoomEngine(target: Window = window): RoomEngine | null {
  const page = target as NitroWindow;
  const existing = existingRoomEngine(page);
  if (existing) return existing;

  const fromFiber = findRoomEngineInReactFiber(page.document);
  if (fromFiber) return publishRoomEngine(page, fromFiber, "react-fiber");

  const fromWebpack = findRoomEngineInWebpack(page.__luminusWebpackRequire);
  if (fromWebpack) return publishRoomEngine(page, fromWebpack, "webpack");

  return null;
}

export function initNitroWorldOverlay(api: LuminusApi, target: Window): void {
  const page = target as NitroWindow;
  installRoomEngineEvalProbe(page);
  installWebpackProbe(page);
  installRoomEngineDiscoverLoop(page);

  const start = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas");
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return false;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";

    let overlay = document.getElementById("luminus-world-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "luminus-world-overlay";
      parent.appendChild(overlay);
    }

    let marker = overlay.querySelector<HTMLElement>(".luminus-world-marker");
    if (!marker) {
      marker = document.createElement("div");
      marker.className = "luminus-world-marker";
      const icon = document.querySelector<SVGElement>("#luminus-icon svg")?.cloneNode(true);
      if (icon instanceof SVGElement) {
        icon.classList.add("luminus-world-marker-icon");
        marker.appendChild(icon);
      }
      overlay.appendChild(marker);
    }

    let frame = 0;
    const update = () => {
      frame = requestAnimationFrame(update);
      if (typeof document !== "undefined" && document.hidden) return;
      updateMarker(api, page, canvas, marker!);
    };
    update();
    return () => cancelAnimationFrame(frame);
  };

  const observer = new MutationObserver(() => {
    if (start()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  start();
}

function updateMarker(api: LuminusApi, page: NitroWindow, canvas: HTMLCanvasElement, marker: HTMLElement): void {
  const roomId = api.room.id;
  const userIndex = api.myself?.index;
  const engine = ensureRoomEngine(page);
  if (!marker.firstElementChild) {
    const icon = document.querySelector<SVGElement>("#luminus-icon svg")?.cloneNode(true);
    if (icon instanceof SVGElement) {
      icon.classList.add("luminus-world-marker-icon");
      marker.appendChild(icon);
    }
  }
  if (roomId == null || userIndex == null || !engine) {
    marker.style.display = "none";
    return;
  }

  const point = engine.getRoomObjectScreenLocation(roomId, userIndex, UNIT_CATEGORY);
  if (!point) {
    marker.style.display = "none";
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  marker.style.display = "block";
  marker.style.left = `${point.x * scaleX}px`;
  marker.style.top = `${point.y * scaleY}px`;
}

export function initNitroRoomEngineProbe(target: Window): void {
  const page = target as NitroWindow;
  installRoomEngineEvalProbe(page);
  installWebpackProbe(page);
  installRoomEngineDiscoverLoop(page);
}

/** Poll until RoomEngine is published on window (room canvas mounted). */
function installRoomEngineDiscoverLoop(page: NitroWindow): void {
  if (page.__luminusRoomEngineDiscover) return;
  page.__luminusRoomEngineDiscover = true;

  const tick = () => {
    const engine = ensureRoomEngine(page);
    if (engine) return true;
    return false;
  };

  if (tick()) return;

  let attempts = 0;
  const timer = page.setInterval(() => {
    attempts += 1;
    if (tick() || attempts > 600) page.clearInterval(timer);
  }, 250);

  // Also retry when DOM gains a canvas.
  try {
    const obs = new MutationObserver(() => {
      if (tick()) obs.disconnect();
    });
    if (page.document?.body) {
      obs.observe(page.document.body, { childList: true, subtree: true });
      page.setTimeout(() => obs.disconnect(), 180_000);
    }
  } catch {
    /* ignore */
  }
}

function installRoomEngineEvalProbe(page: NitroWindow): void {
  const evalPage = page as NitroWindow & { eval?: (source: string) => unknown };
  if (page.__luminusEvalProbe || typeof evalPage.eval !== "function") return;

  const nativeEval = evalPage.eval;
  evalPage.eval = function luminusEval(source: string): unknown {
    if (typeof source === "string" && !source.includes("window.RoomEngine=this")) {
      // Minified Habblet: this._roomManager.addUpdateCategory(ve.FLOOR),...
      source = source.replace(
        /this\._roomManager\.addUpdateCategory\([^)]*FLOOR[^)]*\)([,;])/,
        match => {
          page.__luminusRoomEngineProbeMatches = (page.__luminusRoomEngineProbeMatches ?? 0) + 1;
          return match.endsWith(",")
            ? `${match}window.RoomEngine=this,window.NitroInstance=window.NitroInstance||this,`
            : `${match}window.RoomEngine=this;window.NitroInstance=window.NitroInstance||this;`;
        },
      );
      // Nitro bootstrap: XU.INSTANCE||(XU.INSTANCE=this)
      if (source.includes("INSTANCE=this") && !source.includes("window.NitroInstance=this")) {
        source = source.replace(
          /([A-Za-z_$][\w$]*)\.INSTANCE\|\|\(\1\.INSTANCE=this\)/g,
          match => `${match},window.NitroInstance=this,window.RoomEngine=this._roomEngine||window.RoomEngine`,
        );
      }
    }
    return nativeEval.call(this, source);
  };
  page.__luminusEvalProbe = true;
}

function installWebpackProbe(page: NitroWindow): void {
  const wrapQueue = (queue: NitroWindow["webpackJsonpnitroReact"]) => {
    if (!queue || queue.__luminusWrapped) return;

    const originalPush = queue.push;
    queue.push = (...args: unknown[]) => {
      const chunk = args[0] as [unknown[], Record<string, unknown>] | undefined;
      const modules = chunk?.[1];
      if (modules) {
        for (const [id, module] of Object.entries(modules)) {
          if (typeof module !== "function") continue;
          modules[id] = function wrappedModule(this: unknown, ...moduleArgs: unknown[]) {
            page.__luminusWebpackRequire = moduleArgs[2] as NitroRequire;
            const result = (module as (...a: unknown[]) => unknown).apply(this, moduleArgs);
            // After big Nitro chunk loads, try expose.
            try { ensureRoomEngine(page); } catch { /* ignore */ }
            return result;
          };
        }
      }
      return originalPush.apply(queue, args);
    };
    queue.__luminusWrapped = true;
  };

  const install = () => {
    wrapQueue(page.webpackJsonpnitroReact);
    wrapQueue(page["webpackJsonpnitro-react"]);
  };

  for (const key of ["webpackJsonpnitroReact", "webpackJsonpnitro-react"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(page, key);
    if (descriptor?.configurable === false) continue;
    let value = page[key];
    Object.defineProperty(page, key, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      get: () => value,
      set: (next: typeof value) => {
        value = next;
        if (value) wrapQueue(value);
      },
    });
  }

  install();
  captureLoadedRequire(page);
  const timer = window.setInterval(() => {
    install();
    captureLoadedRequire(page);
    ensureRoomEngine(page);
    if (page.__luminusWebpackRequire && page.RoomEngine) window.clearInterval(timer);
  }, 50);
  window.setTimeout(() => window.clearInterval(timer), 30_000);
}

function captureLoadedRequire(page: NitroWindow): void {
  if (page.__luminusWebpackRequire) return;

  const queue = page["webpackJsonpnitro-react"] ?? page.webpackJsonpnitroReact;
  if (!queue) return;

  const id = `luminus-probe-${Date.now()}`;
  queue.push([
    [id],
    {
      [id]: function probeModule(_module: unknown, _exports: unknown, require: NitroRequire): void {
        page.__luminusWebpackRequire = require;
      },
    },
    [[id]],
  ]);
}

