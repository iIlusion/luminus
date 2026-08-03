import { ensureRoomEngine } from "./nitroWorldOverlay.ts";
import { readPref, writePref } from "../util/prefs.ts";

const AVATARS_PER_FRAME = 1;
const OBJECTS_PER_FRAME = 50;
const SETTLE_MS = 900;
const DISCOVERY_INTERVAL_MS = 50;
const DISCOVERY_ATTEMPTS = 600;
const ENABLED_PREF = "luminus.visual.incrementalRoomCanvas";

type RoomObject = {
  type?: string;
};

type RoomRenderer = {
  _objects: Map<number, RoomObject>;
};

type RoomCanvas = {
  _container?: RoomRenderer;
  render: (time: number, update?: boolean) => void;
};

type RoomEngineCanvasHost = {
  getRoomInstanceDisplay: (
    roomId: number,
    canvasId: number,
    width: number,
    height: number,
    scale: number,
  ) => unknown;
  getRoomInstanceRenderingCanvas?: (roomId: number, canvasId: number) => RoomCanvas | null;
};

type PendingObject = [number, RoomObject];

type CanvasState = {
  source: Map<number, RoomObject>;
  visible: Map<number, RoomObject>;
  pending: PendingObject[];
  pendingIds: Set<number>;
  cursor: number;
  lastGrowthAt: number;
  complete: boolean;
};

const patchedEngines = new WeakSet<object>();
const patchedCanvases = new WeakSet<object>();

export function getIncrementalRoomCanvasEnabled(): boolean {
  return readPref(ENABLED_PREF, true);
}

export function setIncrementalRoomCanvasEnabled(enabled: boolean): void {
  writePref(ENABLED_PREF, enabled);
}

function isAvatar(object: RoomObject): boolean {
  const type = String(object.type ?? "").toLowerCase();
  return type === "user" || type === "pet" || type.includes("bot");
}

function createState(source: Map<number, RoomObject>, now: number): CanvasState {
  const pending = Array.from(source.entries());
  return {
    source,
    visible: new Map(),
    pending,
    pendingIds: new Set(source.keys()),
    cursor: 0,
    lastGrowthAt: now,
    complete: false,
  };
}

function syncState(state: CanvasState, now: number): void {
  for (const id of state.visible.keys()) {
    if (!state.source.has(id)) state.visible.delete(id);
  }

  let added = false;
  for (const [id, object] of state.source) {
    if (state.visible.has(id) || state.pendingIds.has(id)) continue;
    state.pending.push([id, object]);
    state.pendingIds.add(id);
    added = true;
  }
  if (added) state.lastGrowthAt = now;
}

function exposeNextBatch(state: CanvasState): void {
  let avatars = 0;
  let objects = 0;

  while (state.cursor < state.pending.length) {
    const [id, object] = state.pending[state.cursor];
    const avatar = isAvatar(object);
    if ((avatar && avatars >= AVATARS_PER_FRAME) || (!avatar && objects >= OBJECTS_PER_FRAME)) break;

    state.cursor += 1;
    state.pendingIds.delete(id);
    if (state.source.get(id) !== object) continue;

    state.visible.set(id, object);
    if (avatar) avatars += 1;
    else objects += 1;
  }

  if (state.cursor > 1_000) {
    state.pending = state.pending.slice(state.cursor);
    state.cursor = 0;
  }
}

export function installIncrementalRoomCanvas(
  canvas: RoomCanvas,
  isEnabled: () => boolean = getIncrementalRoomCanvasEnabled,
): boolean {
  if (
    !canvas
    || patchedCanvases.has(canvas)
    || typeof canvas.render !== "function"
    || !(canvas._container?._objects instanceof Map)
  ) return false;

  const originalRender = canvas.render;
  let state = createState(canvas._container._objects, performance.now());

  canvas.render = function luminusIncrementalRoomRender(time: number, update = false): void {
    const renderer = this._container;
    const source = renderer?._objects;
    if (!renderer || !(source instanceof Map)) {
      originalRender.call(this, time, update);
      return;
    }
    if (!isEnabled()) {
      state.complete = true;
      state.pending.length = 0;
      state.pendingIds.clear();
      state.visible.clear();
      originalRender.call(this, time, update);
      return;
    }
    if (state.complete) {
      originalRender.call(this, time, update);
      return;
    }
    if (state.source !== source) state = createState(source, performance.now());

    const now = performance.now();
    syncState(state, now);
    exposeNextBatch(state);

    const actualObjects = renderer._objects;
    renderer._objects = state.visible;
    try {
      originalRender.call(this, time, update);
    } finally {
      renderer._objects = actualObjects;
    }

    const pending = state.cursor < state.pending.length;
    if (!pending && state.visible.size === source.size && now - state.lastGrowthAt >= SETTLE_MS) {
      state.complete = true;
      state.pending.length = 0;
      state.pendingIds.clear();
      state.visible.clear();
    }
  };

  patchedCanvases.add(canvas);
  return true;
}

function patchRoomEngine(engine: RoomEngineCanvasHost): boolean {
  if (
    !engine
    || patchedEngines.has(engine as object)
    || typeof engine.getRoomInstanceDisplay !== "function"
    || typeof engine.getRoomInstanceRenderingCanvas !== "function"
  ) return false;

  const originalGetDisplay = engine.getRoomInstanceDisplay;
  engine.getRoomInstanceDisplay = function luminusGetRoomInstanceDisplay(
    roomId: number,
    canvasId: number,
    width: number,
    height: number,
    scale: number,
  ): unknown {
    const display = originalGetDisplay.call(this, roomId, canvasId, width, height, scale);
    const canvas = this.getRoomInstanceRenderingCanvas?.(roomId, canvasId);
    if (canvas && getIncrementalRoomCanvasEnabled()) installIncrementalRoomCanvas(canvas);
    return display;
  };

  patchedEngines.add(engine as object);
  return true;
}

export function initIncrementalRoomCanvas(target: Window): void {
  const install = () => {
    const engine = ensureRoomEngine(target) as RoomEngineCanvasHost | null;
    return engine ? patchRoomEngine(engine) : false;
  };

  if (install()) return;

  let attempts = 0;
  const timer = target.setInterval(() => {
    attempts += 1;
    if (install() || attempts >= DISCOVERY_ATTEMPTS) target.clearInterval(timer);
  }, DISCOVERY_INTERVAL_MS);
}
