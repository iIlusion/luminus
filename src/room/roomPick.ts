import type { LuminusApi } from "../ws/api";
import { ensureRoomEngine } from "./nitroWorldOverlay";

export type RoomPickMode = "off" | "area" | "stacks" | "origin" | "place";

export type RoomTile = { x: number; y: number };

export type RoomGhostFurni = RoomTile & {
  z: number;
  spriteId: number;
  direction: number;
  state: number;
  groupId?: string;
  highlight?: boolean;
  tint?: [number, number, number];
};

export type RoomTileMark = RoomTile & {
  color: [number, number, number];
};

export type RoomPickState = {
  mode: RoomPickMode;
  tiles: RoomTile[];
  origin: RoomTile | null;
  ghost: RoomGhostFurni[];
};

export type RoomPickApi = {
  getState(): RoomPickState;
  subscribe(listener: (state: RoomPickState) => void): () => void;
  setMode(mode: RoomPickMode): void;
  toggleTile(x: number, y: number): void;
  selectRect(a: RoomTile, b: RoomTile): void;
  clearTiles(): void;
  setOrigin(tile: RoomTile | null): void;
  setGhost(tiles: Array<RoomTile & Partial<RoomGhostFurni>>): void;
  setMarks(marks: RoomTileMark[]): void;
  setOnTile(handler: ((tile: RoomTile) => void) | null): void;
  setOnHover(handler: ((tile: RoomTile) => void) | null): void;
  lockOrigin(locked?: boolean): void;
  setCameraLocked(locked: boolean): void;
};

const FLOOR_CATEGORY = 10;
const ROOM_CATEGORY = 0;
const ROOM_OBJECT_ID = -1;
const WALK_HEADER = 3320;
const CLICK_HEADER = 355;
const MOUSE_HOOK = "__luminusRoomPickHook";
const DRAG_HOOK = "__luminusRoomPickDrag";
const SELECTION_FRAG = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec3 lineColor;
uniform vec3 color;
void main(void) {
    vec4 currentColor = texture2D(uSampler, vTextureCoord);
    vec3 colorLine = lineColor * currentColor.a;
    vec3 colorOverlay = color * currentColor.a;
    if (currentColor.r == 0.0 && currentColor.g == 0.0 && currentColor.b == 0.0 && currentColor.a > 0.0) {
        gl_FragColor = vec4(colorLine.r, colorLine.g, colorLine.b, currentColor.a);
    } else if (currentColor.a > 0.0) {
        gl_FragColor = vec4(colorOverlay.r, colorOverlay.g, colorOverlay.b, currentColor.a);
    }
}
`;

type TileMouseEvent = {
  type?: string;
  tileXAsInt?: number;
  tileYAsInt?: number;
  objectId?: number;
};

type HookedHandler = {
  handleRoomObjectMouseEvent?(event: unknown, roomId: number): void;
  [MOUSE_HOOK]?: boolean;
};

type HookedEngine = {
  handleRoomDragging?: (...args: unknown[]) => boolean;
  [DRAG_HOOK]?: boolean;
};

type NitroSprite = {
  blendMode?: number;
  filters?: unknown[] | null;
};

type PixiFilterCtor = new (vertex: string | null, fragment: string, uniforms: object) => unknown;

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function readInt(body: ArrayBuffer, offset: number): number | null {
  if (body.byteLength < offset + 4) return null;
  return new DataView(body).getInt32(offset);
}

function findPixiFilter(targetWindow: Window): PixiFilterCtor | null {
  const cache = (targetWindow as Window & { __luminusWebpackRequire?: { c?: Record<string, { exports?: { Filter?: PixiFilterCtor; Sprite?: unknown } }> } }).__luminusWebpackRequire?.c;
  if (!cache) return null;
  for (const id of Object.keys(cache)) {
    const exp = cache[id]?.exports;
    if (exp?.Filter && exp.Sprite) return exp.Filter;
  }
  return null;
}

export function initRoomPick(api: LuminusApi, targetWindow: Window): RoomPickApi {
  const existing = (api as LuminusApi & { roomPick?: RoomPickApi }).roomPick;
  if (existing) return existing;

  const listeners = new Set<(state: RoomPickState) => void>();
  const selected = new Set<string>();
  const shaded = new Map<number, string>();
  const marks = new Map<string, [number, number, number]>();
  const filters = new Map<string, unknown>();
  const state: RoomPickState = { mode: "off", tiles: [], origin: null, ghost: [] };
  const ghostUrls = new Map<string, { url: string; w: number; h: number; ax: number; ay: number }>();
  const ghostPending = new Set<string>();
  let overlay: HTMLDivElement | null = null;
  let raf = 0;
  let armed = false;
  let originLocked = false;
  let drag: { start: RoomTile; last: RoomTile } | null = null;
  let onTile: ((tile: RoomTile) => void) | null = null;
  let onHover: ((tile: RoomTile) => void) | null = null;
  let lastFloorTile: RoomTile | null = null;
  let lastHoverTile: RoomTile | null = null;
  let cameraLocked = false;

  const cursorTile = (): RoomTile | null => {
    if (lastFloorTile) return { ...lastFloorTile };
    const engine = ensureRoomEngine(targetWindow);
    const roomId = engine?.activeRoomId ?? api.room.id;
    if (!engine || roomId == null) return null;
    const cursor = engine.getRoomObjectCursor?.(roomId);
    const loc = cursor?.getLocation?.() ?? cursor?.location;
    if (!loc || !Number.isFinite(loc.x) || !Number.isFinite(loc.y)) return null;
    return { x: loc.x | 0, y: loc.y | 0 };
  };

  const snapshot = (): RoomPickState => ({
    mode: state.mode,
    tiles: [...state.tiles],
    origin: state.origin ? { ...state.origin } : null,
    ghost: state.ghost.map(tile => ({ ...tile })),
  });
  const emit = () => listeners.forEach(listener => listener(snapshot()));
  const syncTiles = () => {
    state.tiles = [...selected].map(key => {
      const [x, y] = key.split(",").map(Number);
      return { x, y };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    syncShaders();
    emit();
  };

  const roomCanvas = () =>
    (targetWindow.document.querySelector(".nitro-room canvas") as HTMLCanvasElement | null)
    ?? (targetWindow.document.querySelector("canvas") as HTMLCanvasElement | null);

  const ensureOverlay = () => {
    const doc = targetWindow.document;
    overlay = doc.getElementById("luminus-room-pick") as HTMLDivElement | null;
    if (!overlay) {
      overlay = doc.createElement("div");
      overlay.id = "luminus-room-pick";
    }
    const canvas = roomCanvas();
    const host = (canvas?.parentElement as HTMLElement | null)
      ?? (doc.querySelector(".nitro-room") as HTMLElement | null)
      ?? doc.body;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    if (overlay.parentElement !== host) host.appendChild(overlay);
    if (canvas) {
      const hostRect = host.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      overlay.style.cssText = `position:absolute;left:${canvasRect.left - hostRect.left}px;top:${canvasRect.top - hostRect.top}px;width:${canvasRect.width}px;height:${canvasRect.height}px;pointer-events:none;z-index:6;overflow:hidden;`;
    } else {
      overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;";
    }
    return overlay;
  };

  const floorVisualization = () => {
    const engine = ensureRoomEngine(targetWindow);
    const roomId = engine?.activeRoomId ?? api.room.id;
    if (!engine || roomId == null) return null;
    const object = engine.getRoomObject?.(roomId, ROOM_OBJECT_ID, ROOM_CATEGORY) as { visualization?: { initializeHighlightArea?(x: number, y: number, w: number, h: number): void; clearHighlightArea?(): void } } | null | undefined;
    return object?.visualization ?? null;
  };

  const setFloorHighlight = (x: number, y: number, w: number, h: number) => {
    try { floorVisualization()?.initializeHighlightArea?.(x, y, w, h); } catch { /* room left */ }
  };

  const clearFloorHighlight = () => {
    try { floorVisualization()?.clearHighlightArea?.(); } catch { /* room left */ }
  };

  const filterFor = (color: [number, number, number]) => {
    const key = color.map(value => value.toFixed(2)).join(",");
    const cached = filters.get(key);
    if (cached) return cached;
    const Filter = findPixiFilter(targetWindow);
    if (!Filter) return null;
    try {
      const filter = new Filter(null, SELECTION_FRAG, {
        lineColor: new Float32Array([1, 1, 1]),
        color: new Float32Array(color),
      });
      filters.set(key, filter);
      return filter;
    } catch {
      return null;
    }
  };

  const shadeFurni = (itemId: number, color: [number, number, number] | null) => {
    const engine = ensureRoomEngine(targetWindow);
    const roomId = engine?.activeRoomId ?? api.room.id;
    if (!engine || roomId == null) return;
    const object = engine.getRoomObject?.(roomId, itemId, FLOOR_CATEGORY) as { visualization?: { sprites?: NitroSprite[] } } | null | undefined;
    const sprites = object?.visualization?.sprites;
    if (!sprites) return;
    const filter = color ? filterFor(color) : null;
    for (const sprite of sprites) {
      if (sprite.blendMode === 1) continue;
      sprite.filters = color && filter ? [filter] : [];
    }
  };

  const vectorCtor = () => {
    const engine = ensureRoomEngine(targetWindow);
    const roomId = engine?.activeRoomId ?? api.room.id;
    if (!engine || roomId == null) return null;
    const fromObject = (value: unknown) => {
      const object = value as { getLocation?: () => { constructor: new (x: number, y: number, z: number) => unknown }; location?: { constructor: new (x: number, y: number, z: number) => unknown } } | null;
      return object?.getLocation?.()?.constructor ?? object?.location?.constructor ?? null;
    };
    const geometry = engine.getRoomInstanceGeometry?.(roomId, engine._activeRoomActiveCanvas ?? 1) as { location?: { constructor: new (x: number, y: number, z: number) => unknown } } | null;
    return fromObject(engine.getRoomObjects?.(roomId, FLOOR_CATEGORY)?.[0])
      ?? fromObject(engine.getRoomObject?.(roomId, ROOM_OBJECT_ID, ROOM_CATEGORY))
      ?? geometry?.location?.constructor
      ?? null;
  };

  const tileScreen = (x: number, y: number, z = 0): { x: number; y: number } | null => {
    const engine = ensureRoomEngine(targetWindow);
    const roomId = engine?.activeRoomId ?? api.room.id;
    if (!engine || roomId == null) return null;
    const Vec = vectorCtor();
    const geo = engine.getRoomInstanceGeometry?.(roomId, engine._activeRoomActiveCanvas ?? 1);
    if (!Vec || !geo?.getScreenPoint) return null;
    const point = geo.getScreenPoint(new Vec(x, y, z));
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
    const canvas = engine.getActiveRoomInstanceRenderingCanvas?.();
    const scale = canvas?.scale ?? 1;
    return {
      x: Math.round(point.x * scale + (canvas?.width ?? 0) / 2 + (canvas?.screenOffsetX ?? 0)),
      y: Math.round(point.y * scale + (canvas?.height ?? 0) / 2 + (canvas?.screenOffsetY ?? 0)),
    };
  };

  const SELECT_COLOR: [number, number, number] = [0.62, 0.86, 1];

  const syncShaders = () => {
    const wanted = new Map<number, [number, number, number]>();
    if (state.mode === "area" || state.mode === "stacks" || state.mode === "place") {
      for (const furni of api.room.furnis.values()) {
        const key = tileKey(furni.x, furni.y);
        const mark = marks.get(key);
        if (mark) wanted.set(furni.id, mark);
        if (selected.has(key) && (state.mode === "area" || state.mode === "stacks")) wanted.set(furni.id, SELECT_COLOR);
      }
    }
    for (const [id, prev] of shaded) {
      const next = wanted.get(id);
      if (!next || next.join() !== prev) shadeFurni(id, null);
    }
    shaded.clear();
    for (const [id, color] of wanted) {
      shadeFurni(id, color);
      shaded.set(id, color.join());
    }
  };

  const tileOccupied = (x: number, y: number) => {
    for (const furni of api.room.furnis.values()) {
      if (furni.x === x && furni.y === y) return true;
    }
    return false;
  };

  const ghostKey = (item: RoomGhostFurni) => `${item.spriteId}:${item.direction}:${item.state}`;

  const measureAnchor = (spriteId: number, width: number, height: number): { ax: number; ay: number } => {
    const engine = ensureRoomEngine(targetWindow);
    const roomId = engine?.activeRoomId ?? api.room.id;
    const canvasId = engine?._activeRoomActiveCanvas ?? 1;
    if (engine && roomId != null) {
      for (const furni of api.room.furnis.values()) {
        if (furni.spriteId !== spriteId) continue;
        let bounds: { x: number; y: number; width: number; height: number } | null = null;
        try {
          bounds = engine.getRoomObjectBoundingRectangle?.(roomId, furni.id, FLOOR_CATEGORY, canvasId) ?? null;
        } catch {
          bounds = null;
        }
        const loc = engine.getRoomObjectScreenLocation(roomId, furni.id, FLOOR_CATEGORY);
        if (loc && bounds && bounds.width > 0 && bounds.height > 0) {
          return {
            ax: (loc.x - bounds.x) / bounds.width,
            ay: (loc.y - bounds.y) / bounds.height,
          };
        }
      }
    }
    const ground = Math.min(height * 0.48, 16);
    return { ax: 0.5, ay: height > 0 ? 1 - ground / height : 0.64 };
  };

  const requestGhostImage = (item: RoomGhostFurni, retry = true) => {
    if (!item.spriteId) return;
    const key = ghostKey(item);
    if (ghostUrls.has(key) || ghostPending.has(key)) return;
    const engine = ensureRoomEngine(targetWindow);
    const Vec = vectorCtor();
    if (!engine?.getFurnitureFloorImage || !Vec) return;
    ghostPending.add(key);
    const finish = (image: HTMLImageElement | null | undefined) => {
      if (image?.src) {
        const w = image.naturalWidth || image.width || 64;
        const h = image.naturalHeight || image.height || 64;
        const anchor = measureAnchor(item.spriteId, w, h);
        ghostUrls.set(key, { url: image.src, w, h, ...anchor });
      }
      ghostPending.delete(key);
    };
    try {
      const result = engine.getFurnitureFloorImage(
        item.spriteId,
        new Vec(item.direction, 0, 0),
        64,
        {
          imageReady: () => {
            ghostPending.delete(key);
            if (retry) requestGhostImage(item, false);
          },
          imageFailed: () => ghostPending.delete(key),
        },
        0,
        null,
        item.state,
      );
      const image = result?.getImage?.();
      if (image && typeof (image as Promise<HTMLImageElement>).then === "function") {
        (image as Promise<HTMLImageElement | null>).then(finish).catch(() => ghostPending.delete(key));
        return;
      }
      finish(image as HTMLImageElement | null);
    } catch {
      ghostPending.delete(key);
    }
  };

  const paint = () => {
    if (state.mode !== "off" && !armed) startSession();
    if (state.mode === "place") {
      const hovered = cursorTile();
      if (hovered) {
        if (!originLocked && (!state.origin || state.origin.x !== hovered.x || state.origin.y !== hovered.y)) {
          state.origin = hovered;
          emit();
        }
        if (!lastHoverTile || lastHoverTile.x !== hovered.x || lastHoverTile.y !== hovered.y) {
          lastHoverTile = hovered;
          onHover?.(hovered);
        }
      }
    }
    if (state.mode !== "off") syncShaders();
    const root = ensureOverlay();
    root.innerHTML = "";
    if (state.mode === "off" && !state.ghost.length && !state.origin) return;
    const engine = ensureRoomEngine(targetWindow);
    const roomId = api.room.id;
    if (!engine || roomId == null) return;
    const canvasEl = roomCanvas();
    const canvasRect = canvasEl?.getBoundingClientRect();
    const scaleX = canvasEl && canvasEl.width ? (canvasRect?.width ?? canvasEl.width) / canvasEl.width : 1;
    const scaleY = canvasEl && canvasEl.height ? (canvasRect?.height ?? canvasEl.height) / canvasEl.height : 1;
    const viewScale = engine.getActiveRoomInstanceRenderingCanvas?.()?.scale ?? 1;
    const tileW = Math.max(24, Math.round(64 * viewScale * scaleX));
    const tileH = Math.max(12, Math.round(32 * viewScale * scaleY));
    const place = (node: HTMLElement, loc: { x: number; y: number }) => {
      node.style.left = `${loc.x * scaleX}px`;
      node.style.top = `${loc.y * scaleY}px`;
    };
    if ((state.mode === "origin" || state.mode === "place") && state.origin) {
      setFloorHighlight(state.origin.x, state.origin.y, 1, 1);
    } else if (state.mode !== "area") {
      clearFloorHighlight();
    }
    const ghosts = [...state.ghost].sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z);
    for (const item of ghosts) {
      requestGhostImage(item);
      const loc = tileScreen(item.x, item.y, item.z);
      if (!loc) continue;
      const sprite = item.spriteId ? ghostUrls.get(ghostKey(item)) : undefined;
      if (item.tint || item.highlight) {
        const [r, g, b] = item.tint ?? [0.62, 0.86, 1];
        const alpha = item.highlight ? 0.42 : 0.2;
        const ring = item.highlight ? 0.95 : 0.55;
        const mark = targetWindow.document.createElement("div");
        mark.style.cssText = `position:absolute;width:${tileW}px;height:${tileH}px;margin-left:${-tileW / 2}px;margin-top:0;pointer-events:none;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha});box-shadow:inset 0 0 0 1px rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${ring});`;
        mark.style.zIndex = String(80 + Math.round((item.x + item.y) * 10 + item.z * 20));
        place(mark, loc);
        root.appendChild(mark);
      }
      if (sprite) {
        const image = targetWindow.document.createElement("img");
        image.src = sprite.url;
        image.alt = "";
        const width = Math.max(1, Math.round(sprite.w * viewScale * scaleX));
        const height = Math.max(1, Math.round(sprite.h * viewScale * scaleY));
        const glow = item.highlight ? "filter:drop-shadow(0 0 6px rgba(154,212,255,0.95));" : "";
        image.style.cssText = `position:absolute;width:${width}px;height:${height}px;margin-left:${-Math.round(width * sprite.ax)}px;margin-top:${-Math.round(height * sprite.ay)}px;pointer-events:none;opacity:${item.highlight ? 0.96 : 0.78};image-rendering:pixelated;${glow}`;
        image.style.zIndex = String(100 + Math.round((item.x + item.y) * 10 + item.z * 20));
        place(image, loc);
        root.appendChild(image);
        continue;
      }
      const diamond = targetWindow.document.createElement("div");
      diamond.style.cssText = `position:absolute;width:${tileW}px;height:${tileH}px;margin-left:${-tileW / 2}px;margin-top:0;pointer-events:none;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:rgba(255,209,102,0.38);box-shadow:inset 0 0 0 1px rgba(255,209,102,0.9);`;
      place(diamond, loc);
      root.appendChild(diamond);
    }
  };

  const loop = () => {
    paint();
    raf = targetWindow.requestAnimationFrame(loop);
  };

  const startPaint = () => {
    if (raf) return;
    raf = targetWindow.requestAnimationFrame(loop);
  };
  const stopPaint = () => {
    if (raf) targetWindow.cancelAnimationFrame(raf);
    raf = 0;
    overlay?.replaceChildren();
  };

  const toggleTile = (x: number, y: number) => {
    if (!tileOccupied(x, y)) return;
    const key = tileKey(x, y);
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    syncTiles();
  };

  const selectOccupiedRect = (a: RoomTile, b: RoomTile) => {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const occupied = new Set<string>();
    for (const furni of api.room.furnis.values()) occupied.add(tileKey(furni.x, furni.y));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = tileKey(x, y);
        if (occupied.has(key)) selected.add(key);
      }
    }
    syncTiles();
  };

  const pickTile = (tile: RoomTile) => {
    if (state.mode === "origin") {
      state.origin = { ...tile };
      emit();
      return true;
    }
    if (state.mode === "place") {
      if (!state.origin) {
        state.origin = { ...tile };
        emit();
        return true;
      }
      onTile?.(tile);
      return true;
    }
    if (state.mode !== "stacks") return false;
    toggleTile(tile.x, tile.y);
    return true;
  };

  const tileFromFurniId = (itemId: number): RoomTile | null => {
    const furni = api.room.furnis.get(itemId);
    return furni ? { x: furni.x, y: furni.y } : null;
  };

  const tileFromEvent = (event: TileMouseEvent, floorOnly = false): RoomTile | null => {
    if (typeof event.tileXAsInt === "number" && typeof event.tileYAsInt === "number") {
      return { x: event.tileXAsInt, y: event.tileYAsInt };
    }
    if (floorOnly) return null;
    if (typeof event.objectId === "number" && event.objectId >= 0) return tileFromFurniId(event.objectId);
    return null;
  };

  const highlightFromTiles = (a: RoomTile, b: RoomTile) => {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    setFloorHighlight(x, y, Math.abs(b.x - a.x) + 1, Math.abs(b.y - a.y) + 1);
  };

  const freezeCamera = () => {
    const engine = ensureRoomEngine(targetWindow);
    if (!engine) return;
    engine._activeRoomIsDragged = false;
    engine._activeRoomWasDragged = false;
  };

  const commitArea = () => {
    if (!drag || state.mode !== "area") {
      drag = null;
      return;
    }
    selectOccupiedRect(drag.start, drag.last);
    drag = null;
    clearFloorHighlight();
    freezeCamera();
  };

  const onPointerUp = () => {
    if (state.mode === "area") commitArea();
  };

  const hookMouse = () => {
    const handler = ensureRoomEngine(targetWindow)?.objectEventHandler as HookedHandler | undefined;
    if (!handler?.handleRoomObjectMouseEvent || handler[MOUSE_HOOK]) return;
    const original = handler.handleRoomObjectMouseEvent.bind(handler);
    handler.handleRoomObjectMouseEvent = (raw, roomId) => {
      const event = raw as TileMouseEvent;
      if (state.mode !== "off" && event) {
        const type = event.type;
        const tile = tileFromEvent(event, state.mode === "place");
        if (state.mode === "place") {
          if (typeof event.tileXAsInt === "number" && typeof event.tileYAsInt === "number") {
            lastFloorTile = { x: event.tileXAsInt, y: event.tileYAsInt };
          }
          if (type === "ROE_MOUSE_DOWN") return;
          if (type === "ROE_MOUSE_CLICK" || type === "ROE_CLICK") {
            const picked = lastFloorTile ?? cursorTile() ?? tile;
            if (picked) {
              if (!originLocked) {
                originLocked = true;
                state.origin = { ...picked };
                emit();
              }
              onTile?.(picked);
            }
            return;
          }
          return original(raw, roomId);
        }
        if (tile && type === "ROE_MOUSE_DOWN") {
          if (state.mode === "area") {
            drag = { start: tile, last: tile };
            freezeCamera();
            highlightFromTiles(tile, tile);
          } else {
            drag = null;
            pickTile(tile);
          }
          return;
        }
        if (tile && type === "ROE_MOUSE_MOVE" && state.mode === "area" && drag) {
          drag.last = tile;
          freezeCamera();
          highlightFromTiles(drag.start, tile);
        }
        if (type === "ROE_MOUSE_CLICK" || type === "ROE_CLICK") {
          if (state.mode === "area") commitArea();
          return;
        }
      }
      return original(raw, roomId);
    };
    handler[MOUSE_HOOK] = true;
  };

  const hookCamera = () => {
    const engine = ensureRoomEngine(targetWindow) as HookedEngine | null;
    if (!engine?.handleRoomDragging || engine[DRAG_HOOK]) return;
    const original = engine.handleRoomDragging.bind(engine);
    engine.handleRoomDragging = function (this: unknown, ...args: unknown[]) {
      if (cameraLocked || (state.mode === "area" && drag)) {
        freezeCamera();
        return false;
      }
      return original(...args);
    };
    engine[DRAG_HOOK] = true;
  };

  const startSession = () => {
    if (state.mode === "off" || armed) return;
    const engine = ensureRoomEngine(targetWindow);
    if (!engine?.objectEventHandler?.handleRoomObjectMouseEvent) return;
    hookMouse();
    hookCamera();
    try { engine.setMoveBlocked?.(true); } catch { /* ignore */ }
    targetWindow.addEventListener("pointerup", onPointerUp, true);
    armed = true;
    syncShaders();
  };

  const stopSession = () => {
    drag = null;
    cameraLocked = false;
    lastHoverTile = null;
    targetWindow.removeEventListener("pointerup", onPointerUp, true);
    clearFloorHighlight();
    for (const id of shaded.keys()) shadeFurni(id, null);
    shaded.clear();
    try { ensureRoomEngine(targetWindow)?.setMoveBlocked?.(false); } catch { /* ignore */ }
    freezeCamera();
    armed = false;
  };

  api.onOutgoing(WALK_HEADER, ({ packet }) => {
    if (state.mode === "off") return;
    if (armed) return "block";
    const x = readInt(packet.body, 0);
    const y = readInt(packet.body, 4);
    if (x == null || y == null) return "block";
    if (state.mode === "area") selectOccupiedRect({ x, y }, { x, y });
    else pickTile({ x, y });
    return "block";
  });
  api.onOutgoing(CLICK_HEADER, ({ packet }) => {
    if (state.mode === "off") return;
    if (armed) return "block";
    const id = readInt(packet.body, 0);
    if (id == null) return "block";
    const tile = tileFromFurniId(id);
    if (tile && state.mode !== "area") pickTile(tile);
    return "block";
  });

  const controller: RoomPickApi = {
    getState: snapshot,
    subscribe: listener => {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    setMode: mode => {
      const next = mode;
      if (state.mode !== "off" && next !== "off") {
        drag = null;
        clearFloorHighlight();
      }
      state.mode = next;
      if (next !== "place") {
        originLocked = false;
        lastFloorTile = null;
        lastHoverTile = null;
        cameraLocked = false;
      }
      if (next === "off") {
        stopSession();
        if (!state.ghost.length && !state.origin) stopPaint();
      } else {
        startSession();
        startPaint();
      }
      emit();
    },
    toggleTile: (x, y) => {
      toggleTile(x, y);
    },
    selectRect: (a, b) => {
      selectOccupiedRect(a, b);
    },
    clearTiles: () => {
      selected.clear();
      syncTiles();
    },
    setOrigin: tile => {
      state.origin = tile ? { ...tile } : null;
      if (!tile) originLocked = false;
      emit();
    },
    setGhost: tiles => {
      state.ghost = tiles.map(tile => ({
        x: tile.x,
        y: tile.y,
        z: tile.z ?? 0,
        spriteId: tile.spriteId ?? 0,
        direction: tile.direction ?? 0,
        state: tile.state ?? 0,
        groupId: tile.groupId,
        highlight: tile.highlight,
        tint: tile.tint,
      }));
      for (const item of state.ghost) requestGhostImage(item);
      if (tiles.length || state.mode !== "off") startPaint();
      else if (!state.origin) stopPaint();
      emit();
    },
    setMarks: next => {
      marks.clear();
      for (const mark of next) marks.set(tileKey(mark.x, mark.y), mark.color);
      syncShaders();
    },
    setOnTile: handler => {
      onTile = handler;
    },
    setOnHover: handler => {
      onHover = handler;
      lastHoverTile = null;
    },
    lockOrigin: (locked = true) => {
      if (locked && !state.origin) {
        const hovered = cursorTile();
        if (hovered) state.origin = hovered;
      }
      originLocked = Boolean(locked && state.origin);
      if (!locked) lastHoverTile = null;
      emit();
    },
    setCameraLocked: locked => {
      cameraLocked = locked;
      if (locked) freezeCamera();
    },
  };

  (api as LuminusApi & { roomPick?: RoomPickApi }).roomPick = controller;
  return controller;
}
