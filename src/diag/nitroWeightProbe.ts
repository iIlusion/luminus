/**
 * Nitro / Habblet session-weight probe (support + long-session comparison).
 *
 *   await Luminus.runNitroWeightProbe()
 *
 * Copies JSON to clipboard. Compare an early-session snapshot with one after 1–2h.
 */

import { ensureRoomEngine } from "../room/nitroWorldOverlay";
import { getTargetWindow } from "../ws/interceptWebSocket";

export interface NitroWeightProbeReport {
  version: 1;
  at: string;
  session: {
    href: string;
    visibility: DocumentVisibilityState;
    dpr: number;
    cores: number | null;
    deviceMemoryGb: number | null;
    userAgent: string;
  };
  luminus: {
    username: string | null;
    roomId: number | null;
    units: number | null;
    furnis: number | null;
  };
  memoryMb: { used: number; total: number; limit: number } | null;
  dom: {
    nodes: number;
    canvases: Array<{ w: number; h: number; cssW: number; cssH: number }>;
  };
  frames: {
    /** ~1.2s timer-jank sample (setTimeout 16ms). */
    sampleMs: number;
    ticks: number;
    avgGapMs: number;
    p95Ms: number;
    maxMs: number;
    over33: number;
    effFps: number;
  } | null;
  longTasks: {
    sampleMs: number;
    count: number;
    totalMs: number;
    maxMs: number;
    top: number[];
  } | null;
  webgl: {
    renderer: string;
    contextLost: boolean;
    maxTextureSize: number;
  } | null;
  nitro: {
    roomEngineFound: boolean;
    engineSource: string | null;
    activeRoomId: number | null;
    /** RoomEngine._roomInstanceDatas size — >1 may mean retained rooms. */
    roomInstanceDatas: number | null;
    roomDatas: number | null;
    /** RoomManager._rooms size. */
    managedRooms: number | null;
    imageCallbacks: number | null;
    thumbnailCallbacks: number | null;
    badgeListenerObjects: number | null;
    canvas: {
      objectCount: number | null;
      spriteCount: number | null;
      activeSpriteCount: number | null;
      width: number | null;
      height: number | null;
      /** Top object types on the active canvas (capped). */
      byTypeTop: Array<{ type: string; count: number }>;
    } | null;
    contentLoader: {
      collections: number | null;
      pendingContentTypes: number | null;
      activeObjectTypes: number | null;
      wallItemTypes: number | null;
      pets: number | null;
    } | null;
  };
  notes: string[];
}

type LooseEngine = {
  _activeRoomId?: number;
  activeRoomId?: number;
  _roomInstanceDatas?: Map<unknown, unknown> | Record<string, unknown>;
  _roomDatas?: Map<unknown, unknown> | Record<string, unknown>;
  _roomManager?: {
    _rooms?: Map<unknown, unknown> | Record<string, unknown>;
  };
  _imageCallbacks?: Map<unknown, unknown>;
  _thumbnailCallbacks?: Map<unknown, unknown>;
  _badgeListenerObjects?: Map<unknown, unknown> | unknown[];
  _roomContentLoader?: Record<string, unknown>;
  getActiveRoomInstanceRenderingCanvas?: () => LooseCanvas | null;
  getRoomInstanceRenderingCanvas?: (roomId: number, canvasId: number) => LooseCanvas | null;
};

type LooseCanvas = {
  _container?: { _objects?: Map<number, { type?: string; _type?: string }> };
  _spriteCount?: number;
  _activeSpriteCount?: number;
  _width?: number;
  _height?: number;
};

export async function runNitroWeightProbe(options?: {
  /** Frame sample length (ms). Default 1200. */
  frameSampleMs?: number;
  /** Skip frame/longtask sampling for a fast snapshot. */
  quick?: boolean;
}): Promise<NitroWeightProbeReport> {
  const frameSampleMs = Math.max(400, options?.frameSampleMs ?? 1200);
  const quick = options?.quick === true;
  const notes: string[] = [];
  const page = getTargetWindow() as Window & {
    Luminus?: {
      myself?: { username?: string } | null;
      room?: { id?: number | null; units?: { size: number }; furnis?: { size: number } };
    };
    __luminusRoomEngineSource?: string;
  };

  const L = page.Luminus;
  const engine = (ensureRoomEngine(page) ?? null) as LooseEngine | null;

  const frames = quick ? null : await sampleTimerJank(frameSampleMs);
  const longTasks = quick ? null : await sampleLongTasks(Math.min(1000, frameSampleMs));

  const nitro = collectNitro(engine, page.__luminusRoomEngineSource ?? null, notes);

  if (nitro.roomInstanceDatas != null && nitro.roomInstanceDatas > 1) {
    notes.push(
      `RoomEngine._roomInstanceDatas size=${nitro.roomInstanceDatas} (active rooms retained?). Compare early vs late session.`,
    );
  }
  if (nitro.managedRooms != null && nitro.managedRooms > 1) {
    notes.push(
      `RoomManager._rooms size=${nitro.managedRooms} (>1 may mean leftover room instances).`,
    );
  }
  if (nitro.canvas?.objectCount != null && nitro.canvas.objectCount >= 1500) {
    notes.push(`Dense room canvas: ${nitro.canvas.objectCount} objects — expected heavy feel.`);
  }
  if (L?.room?.units?.size != null && L.room.units.size >= 100) {
    notes.push(`Crowded room: ${L.room.units.size} units in Luminus room store.`);
  }
  if (frames && frames.effFps < 45) {
    notes.push(`Main-thread jank sample ~${frames.effFps} fps (p95 ${frames.p95Ms}ms).`);
  }

  const report: NitroWeightProbeReport = {
    version: 1,
    at: new Date().toISOString(),
    session: {
      href: page.location?.href ?? location.href,
      visibility: document.visibilityState,
      dpr: page.devicePixelRatio || 1,
      cores: navigator.hardwareConcurrency ?? null,
      deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      userAgent: navigator.userAgent,
    },
    luminus: {
      username: L?.myself?.username ?? null,
      roomId: L?.room?.id ?? null,
      units: L?.room?.units?.size ?? null,
      furnis: L?.room?.furnis?.size ?? null,
    },
    memoryMb: readMemory(),
    dom: {
      nodes: document.querySelectorAll("*").length,
      canvases: [...document.querySelectorAll("canvas")].map(c => ({
        w: c.width,
        h: c.height,
        cssW: c.clientWidth,
        cssH: c.clientHeight,
      })),
    },
    frames,
    longTasks,
    webgl: readWebGl(),
    nitro,
    notes,
  };

  await copyJson(report);
  console.log("[Luminus] Nitro weight probe (copiado):", report);
  return report;
}

function collectNitro(
  engine: LooseEngine | null,
  engineSource: string | null,
  notes: string[],
): NitroWeightProbeReport["nitro"] {
  if (!engine) {
    notes.push("RoomEngine não encontrado (Nitro ainda não montou?).");
    return {
      roomEngineFound: false,
      engineSource,
      activeRoomId: null,
      roomInstanceDatas: null,
      roomDatas: null,
      managedRooms: null,
      imageCallbacks: null,
      thumbnailCallbacks: null,
      badgeListenerObjects: null,
      canvas: null,
      contentLoader: null,
    };
  }

  const activeRoomId = engine._activeRoomId ?? engine.activeRoomId ?? null;
  let canvas: NitroWeightProbeReport["nitro"]["canvas"] = null;

  try {
    const c = engine.getActiveRoomInstanceRenderingCanvas?.()
      ?? (activeRoomId != null ? engine.getRoomInstanceRenderingCanvas?.(activeRoomId, 1) : null)
      ?? null;
    if (c) {
      const objects = c._container?._objects;
      const byType = new Map<string, number>();
      let objectCount: number | null = null;
      if (objects instanceof Map) {
        objectCount = objects.size;
        let n = 0;
        for (const obj of objects.values()) {
          const t = String(obj?.type ?? obj?._type ?? "?");
          byType.set(t, (byType.get(t) ?? 0) + 1);
          if (++n >= 8000) break;
        }
      }
      const byTypeTop = [...byType.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([type, count]) => ({ type, count }));
      canvas = {
        objectCount,
        spriteCount: c._spriteCount ?? null,
        activeSpriteCount: c._activeSpriteCount ?? null,
        width: c._width ?? null,
        height: c._height ?? null,
        byTypeTop,
      };
    }
  } catch (error) {
    notes.push(`Canvas probe falhou: ${error instanceof Error ? error.message : String(error)}`);
  }

  let contentLoader: NitroWeightProbeReport["nitro"]["contentLoader"] = null;
  try {
    const cl = engine._roomContentLoader;
    if (cl && typeof cl === "object") {
      contentLoader = {
        collections: mapSize(cl._collections),
        pendingContentTypes: mapSize(cl._pendingContentTypes),
        activeObjectTypes: mapSize(cl._activeObjectTypes),
        wallItemTypes: mapSize(cl._wallItemTypes),
        pets: mapSize(cl._pets),
      };
    }
  } catch {
    contentLoader = null;
  }

  return {
    roomEngineFound: true,
    engineSource,
    activeRoomId,
    roomInstanceDatas: mapSize(engine._roomInstanceDatas),
    roomDatas: mapSize(engine._roomDatas),
    managedRooms: mapSize(engine._roomManager?._rooms),
    imageCallbacks: mapSize(engine._imageCallbacks),
    thumbnailCallbacks: mapSize(engine._thumbnailCallbacks),
    badgeListenerObjects: mapOrArraySize(engine._badgeListenerObjects),
    canvas,
    contentLoader,
  };
}

function mapSize(value: unknown): number | null {
  if (value instanceof Map) return value.size;
  if (value && typeof value === "object") {
    // plain object used as dictionary
    try {
      return Object.keys(value as object).length;
    } catch {
      return null;
    }
  }
  return null;
}

function mapOrArraySize(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  return mapSize(value);
}

function readMemory(): NitroWeightProbeReport["memoryMb"] {
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

function readWebGl(): NitroWeightProbeReport["webgl"] {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER)),
      contextLost: gl.isContextLost(),
      maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
    };
  } catch {
    return null;
  }
}

async function sampleTimerJank(ms: number): Promise<NitroWeightProbeReport["frames"]> {
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
    return {
      sampleMs: ms,
      ticks: 0,
      avgGapMs: 0,
      p95Ms: 0,
      maxMs: 0,
      over33: 0,
      effFps: 0,
    };
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return {
    sampleMs: ms,
    ticks: gaps.length,
    avgGapMs: round1(avg),
    p95Ms: round1(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    maxMs: round1(sorted[sorted.length - 1] ?? 0),
    over33: gaps.filter(g => g > 33).length,
    effFps: round1(avg > 0 ? 1000 / avg : 0),
  };
}

async function sampleLongTasks(ms: number): Promise<NitroWeightProbeReport["longTasks"]> {
  const durs: number[] = [];
  let obs: PerformanceObserver | null = null;
  try {
    obs = new PerformanceObserver(list => {
      for (const e of list.getEntries()) durs.push(e.duration);
    });
    obs.observe({ type: "longtask", buffered: false } as PerformanceObserverInit);
  } catch {
    return null;
  }
  await new Promise<void>(resolve => {
    window.setTimeout(resolve, ms);
  });
  obs.disconnect();
  const total = durs.reduce((a, b) => a + b, 0);
  return {
    sampleMs: ms,
    count: durs.length,
    totalMs: round1(total),
    maxMs: durs.length ? round1(Math.max(...durs)) : 0,
    top: durs.filter(d => d >= 50).sort((a, b) => b - a).slice(0, 8).map(round1),
  };
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
    console.warn("[Luminus] Não foi possível copiar o probe Nitro.");
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
