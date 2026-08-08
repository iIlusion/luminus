import { ensureRoomEngine } from "../room/nitroWorldOverlay";
import { getTargetWindow } from "../ws/interceptWebSocket";
import type { LuminusApi } from "../ws/api";
import { canonicalizeAdditiveRgba } from "./catalogThumbAdditive";
import type { CatalogThumbBlend, CatalogThumbKind } from "./catalogThumbManifest";

type Loose = Record<string, any>;

const CATALOG_FIGURE = "hd-180-1.ch-210-66.lg-270-82.sh-290-62.hr-100-61";

export type BakeCatalogThumbOptions = {
  kinds?: CatalogThumbKind[];
  ids?: number[];
  items?: Array<{
    kind: CatalogThumbKind;
    id: number;
    available?: boolean;
  }>;
  endpoint?: string;
  maxTicks?: number;
};

type BakeProgress = {
  running: boolean;
  done: number;
  total: number;
  currentKind: CatalogThumbKind | null;
  currentId: number | null;
  ready: number;
  unavailable: number;
  failed: number;
  message: string;
};

type SpriteSnapshot = {
  sourceIndex: number;
  texture: Loose;
  offsetX: number;
  offsetY: number;
  relativeDepth: number;
  alpha: number;
  color: number;
  blend: CatalogThumbBlend;
  flipH: boolean;
  flipV: boolean;
  filters: unknown;
  signature: string;
  rasterSignature: string;
};

type FrameSnapshot = {
  signature: string;
  sprites: SpriteSnapshot[];
};

type CapturedPlane = {
  hash: string;
  png: string;
  width: number;
  height: number;
  boundsX: number;
  boundsY: number;
  alphaWeight: number;
};

const PREVIEW_ROOM_ID = 0x7ffffffe;
const PREVIEW_OBJECT_ID = 1;
const PREVIEW_CANVAS_ID = 1;
const DEFAULT_ENDPOINT = "http://127.0.0.1:8935";
const TICK_MS = 41;
const DEFAULT_MAX_TICKS = 512;

let aborted = false;
let receiverRequestId = 0;
type BakeChunk = {
  messageId: number;
  index: number;
  total: number;
  data: string;
};
const progress: BakeProgress = {
  running: false,
  done: 0,
  total: 0,
  currentKind: null,
  currentId: null,
  ready: 0,
  unavailable: 0,
  failed: 0,
  message: "",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeBlend(value: unknown): CatalogThumbBlend {
  if (value === 0 || value === "normal") return "normal";
  if (value === 1 || value === "add") return "add";
  throw new Error(`Blend do Nitro não suportado: ${String(value)}`);
}

function assertRunning(): void {
  if (aborted) throw new DOMException("Bake cancelado", "AbortError");
}

async function sha256(value: ArrayBuffer | string): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function postJson(_endpoint: string, path: string, payload: unknown): Promise<void> {
  const page = getTargetWindow() as unknown as Loose & { __luminusCatalogBakeChunks?: BakeChunk[] };
  const queue = page.__luminusCatalogBakeChunks ?? (page.__luminusCatalogBakeChunks = []);
  const data = JSON.stringify({ path, payload });
  // The MCP bridge compacts individual strings near 1 KB even when the total
  // response budget is larger. Keep every transport fragment below that cap.
  const chunkSize = 900;
  const total = Math.ceil(data.length / chunkSize);
  const messageId = ++receiverRequestId;
  for (let index = 0; index < total; index += 1) {
    while (queue.length >= 80) {
      assertRunning();
      await sleep(50);
    }
    queue.push({
      messageId,
      index,
      total,
      data: data.slice(index * chunkSize, (index + 1) * chunkSize),
    });
  }
}

function findPreviewMap(engine: Loose): unknown {
  const roomIds = Array.from((engine._roomInstanceDatas as Map<number, unknown>)?.keys?.() ?? []);
  for (const roomId of roomIds) {
    if (roomId < 0x7fff0000 || roomId === PREVIEW_ROOM_ID) continue;
    const roomObject = engine.getRoomObject(roomId, -1, 0);
    const map = roomObject?.logic?._planeParser?.getMapData?.();
    if (map) return map;
  }
  throw new Error("Room de preview do Nitro não encontrada");
}

function createScene(api: LuminusApi): {
  engine: Loose;
  Vec: new (x: number, y: number, z?: number) => Loose;
  dispose(): void;
} {
  const engine = ensureRoomEngine(getTargetWindow()) as Loose | null;
  if (!engine?.ready) throw new Error("RoomEngine ainda não está pronto");
  const roomId = api.room.id;
  const ownIndex = api.myself?.index;
  if (!roomId || !ownIndex) throw new Error("Entre em uma room antes de iniciar o bake");
  const ownObject = engine.getRoomObjectUser(roomId, ownIndex);
  const location = ownObject?.getLocation?.();
  if (!location?.constructor) throw new Error("Vector3d do Nitro não encontrado");

  engine.removeRoomInstance(PREVIEW_ROOM_ID);
  engine.createRoomInstance(PREVIEW_ROOM_ID, findPreviewMap(engine));

  return {
    engine,
    Vec: location.constructor,
    dispose() {
      try { engine.removeRoomObjectUser(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID); } catch {}
      try { engine.removeRoomInstance(PREVIEW_ROOM_ID); } catch {}
    },
  };
}

function initializeCanvas(engine: Loose, Vec: new (x: number, y: number, z?: number) => Loose): Loose {
  engine.initializeRoomInstanceRenderingCanvas(PREVIEW_ROOM_ID, PREVIEW_CANVAS_ID, 512, 512);
  engine.getRoomInstanceDisplay(PREVIEW_ROOM_ID, PREVIEW_CANVAS_ID, 512, 512, 64);
  const geometry = engine.getRoomInstanceGeometry(PREVIEW_ROOM_ID, PREVIEW_CANVAS_ID);
  if (!geometry) throw new Error("Geometria da room de preview não inicializou");
  geometry.adjustLocation?.(new Vec(2, 2, 0), 30);
  return geometry;
}

async function addAvatar(
  engine: Loose,
  Vec: new (x: number, y: number, z?: number) => Loose,
  kind: CatalogThumbKind,
  id: number,
): Promise<Loose> {
  engine.removeRoomObjectUser(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID);
  const added = engine.addRoomObjectUser(
    PREVIEW_ROOM_ID,
    PREVIEW_OBJECT_ID,
    new Vec(2, 2, 0),
    new Vec(90, 0, 0),
    90,
    1,
    CATALOG_FIGURE,
  );
  if (!added) throw new Error("Não foi possível criar o avatar de preview");

  engine.updateRoomObjectUserGesture(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID, 0);
  engine.updateRoomObjectUserPosture(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID, "std", "");
  engine.updateRoomObjectUserEffect(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID, kind === "enable" ? id : 0);
  engine.updateRoomObjectUserAction(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID, "figure_carry_object", kind === "handitem" ? id : 0);
  engine.updateRoomObjectUserAction(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID, "figure_use_object", 0);

  const deadline = performance.now() + 12_000;
  let stable = 0;
  let lastSignature = "";
  while (performance.now() < deadline) {
    assertRunning();
    await sleep(82);
    const object = engine.getRoomObjectUser(PREVIEW_ROOM_ID, PREVIEW_OBJECT_ID);
    const visualization = object?.visualization;
    const avatar = visualization?._avatarImage;
    const sprite = visualization?.getSprite?.(0);
    const signature = `${visualization?.totalSprites ?? 0}:${sprite?.texture ? 1 : 0}:${avatar ? 1 : 0}`;
    stable = signature === lastSignature ? stable + 1 : 0;
    lastSignature = signature;
    if (avatar && sprite?.texture && stable >= 4) return visualization;
  }
  throw new Error("Assets do avatar não ficaram prontos");
}

function handitemHasMapping(visualization: Loose, id: number): boolean {
  const structure = visualization?._avatarImage?._structure;
  const definition = structure?.getActionDefinition?.("CarryItem")
    ?? structure?.getActionDefinition?.("cri");
  const params = definition?.params;
  return params instanceof Map && params.has(String(id));
}

function textureFrame(texture: Loose): string {
  const frame = texture?.frame;
  return frame
    ? `${frame.x ?? 0},${frame.y ?? 0},${frame.width ?? frame.w ?? 0},${frame.height ?? frame.h ?? 0}`
    : "0,0,0,0";
}

function texturePixelSignature(
  page: Loose,
  texture: Loose,
  cache: WeakMap<object, string>,
  Sprite: new (texture: Loose) => Loose,
): string {
  const cached = cache.get(texture);
  if (cached) return cached;
  const display = new Sprite(texture);
  const extracted = page.NitroInstance.renderer.extract.pixels(display);
  display.destroy?.({ texture: false, baseTexture: false });
  const pixels = (extracted?.pixels ?? extracted) as Uint8Array;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < pixels.length; index += 1) {
    const value = pixels[index];
    first = Math.imul(first ^ value, 0x01000193);
    second = Math.imul(second ^ (value + index), 0x85ebca6b);
  }
  const signature = `${pixels.length}:${first >>> 0}:${second >>> 0}:${textureFrame(texture)}`;
  cache.set(texture, signature);
  return signature;
}

function stableFilterValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (depth >= 3) return undefined;
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return Array.from(value as ArrayLike<unknown>, (item) => stableFilterValue(item, depth + 1));
  }
  if (typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (key.startsWith("_") || key === "program" || key === "state") continue;
    const normalized = stableFilterValue(record[key], depth + 1);
    if (normalized !== undefined) result[key] = normalized;
  }
  return result;
}

function filterSignature(filters: unknown): string {
  if (!Array.isArray(filters) || filters.length === 0) return "none";
  return JSON.stringify(filters.map((filter) => ({
    type: filter?.constructor?.name ?? "Filter",
    padding: filter?.padding ?? 0,
    resolution: filter?.resolution ?? 1,
    enabled: filter?.enabled !== false,
    autoFit: filter?.autoFit !== false,
    uniforms: stableFilterValue(filter?.uniforms),
  })));
}

function snapshotFrame(
  page: Loose,
  visualization: Loose,
  textureSignatures: WeakMap<object, string>,
  Sprite: new (texture: Loose) => Loose,
): FrameSnapshot {
  const sprites: SpriteSnapshot[] = [];
  for (let index = 0; index < (visualization.totalSprites ?? 0); index += 1) {
    const sprite = visualization.getSprite(index);
    // Nitro briefly exposes textures without a base texture while swapping
    // frames. The room renderer treats those ticks as an empty sprite too.
    if (!sprite?.visible || !sprite.texture?.baseTexture) continue;
    const textureSignature = texturePixelSignature(page, sprite.texture, textureSignatures, Sprite);
    const filtersId = filterSignature(sprite.filters);
    const blend = normalizeBlend(sprite.blendMode);
    const shared = [
      textureSignature,
      sprite.alpha,
      sprite.color,
      sprite.flipH ? 1 : 0,
      sprite.flipV ? 1 : 0,
      filtersId,
    ].join(":");
    const signature = [
      index,
      shared,
      sprite.offsetX,
      sprite.offsetY,
      sprite.relativeDepth,
      blend,
    ].join(":");
    sprites.push({
      sourceIndex: index,
      texture: sprite.texture,
      offsetX: sprite.offsetX,
      offsetY: sprite.offsetY,
      relativeDepth: sprite.relativeDepth,
      alpha: sprite.alpha,
      color: sprite.color,
      blend,
      flipH: !!sprite.flipH,
      flipV: !!sprite.flipV,
      filters: sprite.filters,
      signature,
      rasterSignature: shared,
    });
  }
  sprites.sort((a, b) => b.relativeDepth - a.relativeDepth || a.sourceIndex - b.sourceIndex);
  return { signature: sprites.map((sprite) => sprite.signature).join("|"), sprites };
}

function findPeriod(signatures: string[]): number | null {
  const limit = Math.floor(signatures.length / 2);
  for (let period = 1; period <= limit; period += 1) {
    let matches = true;
    for (let index = period; index < signatures.length; index += 1) {
      if (signatures[index] !== signatures[index % period]) {
        matches = false;
        break;
      }
    }
    if (matches) return period;
  }
  return null;
}

function findPixiConstructors(page: Loose): { Container: new () => Loose; Sprite: new (texture: Loose) => Loose } {
  const stage = page.NitroInstance?.stage;
  if (!stage) throw new Error("Stage do Nitro não encontrado");
  const queue: Loose[] = [stage];
  const seen = new WeakSet<object>();
  let sprite: Loose | null = null;
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (current.isSprite && current.texture) {
      sprite = current;
      break;
    }
    for (const child of current.children ?? []) queue.push(child);
  }
  if (!sprite) throw new Error("Sprite PIXI não encontrado");
  return {
    Container: stage.constructor as new () => Loose,
    Sprite: sprite.constructor as new (texture: Loose) => Loose,
  };
}

async function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao serializar PNG"));
    reader.readAsDataURL(blob);
  });
}

async function extractPlane(
  page: Loose,
  constructors: ReturnType<typeof findPixiConstructors>,
  sprite: SpriteSnapshot,
): Promise<CapturedPlane> {
  const container = new constructors.Container();
  const clone = new constructors.Sprite(sprite.texture);
  clone.alpha = sprite.alpha / 255;
  clone.tint = sprite.color;
  clone.filters = sprite.filters;
  clone.x = 0;
  clone.y = 0;
  clone.blendMode = 0;
  if (sprite.flipH) clone.scale.x = -1;
  if (sprite.flipV) clone.scale.y = -1;
  container.addChild(clone);
  const bounds = container.getLocalBounds();
  const texture = page.NitroInstance.renderer.generateTexture(container);
  const canvas = page.NitroInstance.renderer.extract.canvas(texture) as HTMLCanvasElement;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D indisponível");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  if (sprite.blend === "add") {
    canonicalizeAdditiveRgba(pixels);
    context.putImageData(image, 0, 0);
  }
  let alphaWeight = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) alphaWeight += pixels[offset];
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Falha ao gerar PNG")), "image/png");
  });
  const bytes = await blob.arrayBuffer();
  const result = {
    hash: await sha256(bytes),
    png: await blobDataUrl(blob),
    width: canvas.width,
    height: canvas.height,
    boundsX: bounds.x,
    boundsY: bounds.y,
    alphaWeight,
  };
  texture.destroy?.(true);
  container.destroy?.({ children: true });
  return result;
}

async function captureItem(
  page: Loose,
  engine: Loose,
  Vec: new (x: number, y: number, z?: number) => Loose,
  geometry: Loose,
  kind: CatalogThumbKind,
  id: number,
  maxTicks: number,
): Promise<Loose> {
  const visualization = await addAvatar(engine, Vec, kind, id);
  if (kind === "handitem" && !handitemHasMapping(visualization, id)) {
    return { status: "unavailable", reason: "missing-action-map" };
  }

  const instance = engine.getRoomInstance(PREVIEW_ROOM_ID);
  instance?.destroyRenderer?.(PREVIEW_CANVAS_ID);
  const avatarImage = visualization._avatarImage;
  avatarImage?.resetAnimationFrameCounter?.();
  visualization._lastUpdate = 0;
  visualization._updatesUntilFrameUpdate = 0;
  visualization._forcedAnimFrames = 0;

  const textureSignatures = new WeakMap<object, string>();
  const snapshots: FrameSnapshot[] = [];
  const constructors = findPixiConstructors(page);
  for (let tick = 1; tick <= maxTicks; tick += 1) {
    assertRunning();
    visualization.update(geometry, tick * TICK_MS, true, false);
    snapshots.push(snapshotFrame(page, visualization, textureSignatures, constructors.Sprite));
  }
  const period = findPeriod(snapshots.map((frame) => frame.signature));
  const playback = period === null ? "once" : "loop";
  let captureLength = period ?? snapshots.length;
  if (period === null) {
    let lastChange = 0;
    for (let index = 1; index < snapshots.length; index += 1) {
      if (snapshots[index].signature !== snapshots[index - 1].signature) lastChange = index;
    }
    captureLength = lastChange + 1;
  }
  const cycle = snapshots.slice(0, captureLength);
  const captured = new Map<string, CapturedPlane>();

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const rawFrames: Loose[] = [];

  for (const frame of cycle) {
    const planes: Loose[] = [];
    let score = 0;
    for (const sprite of frame.sprites) {
      let plane = captured.get(sprite.rasterSignature);
      if (!plane) {
        plane = await extractPlane(page, constructors, sprite);
        captured.set(sprite.rasterSignature, plane);
      }
      const atX = sprite.offsetX + plane.boundsX;
      const atY = sprite.offsetY + plane.boundsY;
      minX = Math.min(minX, atX);
      minY = Math.min(minY, atY);
      maxX = Math.max(maxX, atX + plane.width);
      maxY = Math.max(maxY, atY + plane.height);
      if (sprite.sourceIndex >= 2) score += plane.alphaWeight;
      planes.push({
        hash: plane.hash,
        at: [atX, atY],
        blend: sprite.blend,
      });
    }
    rawFrames.push({ ticks: 1, planes, score, signature: frame.signature });
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) throw new Error("Captura sem sprites");
  const normalizedFrames: Loose[] = [];
  for (const frame of rawFrames) {
    const previous = normalizedFrames[normalizedFrames.length - 1];
    if (previous?.signature === frame.signature) {
      previous.ticks += 1;
      continue;
    }
    normalizedFrames.push({
      ticks: 1,
      score: frame.score,
      signature: frame.signature,
      planes: frame.planes.map((plane: Loose) => ({
        hash: plane.hash,
        at: [plane.at[0] - minX, plane.at[1] - minY],
        blend: plane.blend,
      })),
    });
  }
  let idleFrame = 0;
  for (let index = 1; index < normalizedFrames.length; index += 1) {
    if (normalizedFrames[index].score > normalizedFrames[idleFrame].score) idleFrame = index;
  }

  const planes = Object.fromEntries(Array.from(captured.values(), (plane) => [plane.hash, {
    png: plane.png,
    width: plane.width,
    height: plane.height,
  }]));
  return {
    status: "ready",
    playback,
    canvas: [Math.ceil(maxX - minX), Math.ceil(maxY - minY)],
    anchor: [-minX, -minY],
    idleFrame,
    loopTicks: captureLength,
    frames: normalizedFrames.map(({ ticks, planes: framePlanes }) => ({ ticks, planes: framePlanes })),
    planes,
  };
}

async function nitroFingerprint(page: Loose): Promise<string> {
  const modules = page.__luminusWebpackRequire?.m ?? {};
  for (const factory of Object.values(modules)) {
    const source = String(factory);
    if (source.includes("addAvatarIntoRoom") && source.includes("getRoomPreviewObject")) {
      return sha256(source);
    }
  }
  throw new Error("Módulo principal do Nitro não encontrado");
}

export function getCatalogThumbBakeProgress(): BakeProgress {
  return { ...progress };
}

export function abortCatalogThumbBake(): void {
  aborted = true;
}

export async function bakeCatalogThumbs(
  api: LuminusApi,
  options: BakeCatalogThumbOptions = {},
): Promise<BakeProgress> {
  if (progress.running) throw new Error("Já existe um bake em andamento");
  const endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, "");
  const kinds: CatalogThumbKind[] = options.kinds?.length ? options.kinds : ["enable", "handitem"];
  const work = options.items?.length
    ? options.items.filter((item) => kinds.includes(item.kind))
    : (options.ids ?? []).flatMap((id) => kinds.map((kind) => ({ kind, id, available: true })));
  if (work.length === 0) throw new Error("Informe ids ou items para o bake");

  Object.assign(progress, {
    running: true,
    done: 0,
    total: work.length,
    currentKind: null,
    currentId: null,
    ready: 0,
    unavailable: 0,
    failed: 0,
    message: "Preparando RoomEngine",
  });
  aborted = false;
  const page = getTargetWindow() as unknown as Loose;
  let scene: ReturnType<typeof createScene> | null = null;
  try {
    scene = createScene(api);
    const fingerprint = await nitroFingerprint(page);
    await postJson(endpoint, "/reset", {
      nitroFingerprint: fingerprint,
      figure: CATALOG_FIGURE,
    });
    let geometry = initializeCanvas(scene.engine, scene.Vec);
    for (const item of work) {
      assertRunning();
      progress.currentKind = item.kind;
      progress.currentId = item.id;
      progress.message = `Capturando ${item.kind} ${item.id}`;
      let result: Loose;
      try {
        if (item.kind === "enable" && item.available === false) {
          result = { status: "unavailable", reason: "missing-library" };
        } else {
          let lastError: unknown;
          let captured: Loose | null = null;
          for (let attempt = 0; attempt < 2 && !captured; attempt += 1) {
            try {
              captured = await captureItem(
                page,
                scene.engine,
                scene.Vec,
                geometry,
                item.kind,
                item.id,
                Math.max(32, options.maxTicks ?? DEFAULT_MAX_TICKS),
              );
            } catch (error) {
              if (error instanceof DOMException && error.name === "AbortError") throw error;
              lastError = error;
              if (attempt === 0) {
                geometry = initializeCanvas(scene.engine, scene.Vec);
                await sleep(164);
              }
            }
          }
          if (!captured) throw lastError;
          result = captured;
        }
        if (result.status === "ready") progress.ready += 1;
        else progress.unavailable += 1;
      } catch (error) {
        progress.failed += 1;
        result = {
          status: "unavailable",
          reason: "invalid-asset",
          detail: error instanceof Error ? error.message : String(error),
        };
      }
      await postJson(endpoint, "/item", { kind: item.kind, id: item.id, result });
      progress.done += 1;
      geometry = initializeCanvas(scene.engine, scene.Vec);
    }
    progress.message = "Empacotando atlases";
    await postJson(endpoint, "/finish", {});
    progress.message = "Bake concluído";
    return {
      ...progress,
      running: false,
      currentKind: null,
      currentId: null,
    };
  } finally {
    scene?.dispose();
    progress.running = false;
    progress.currentKind = null;
    progress.currentId = null;
  }
}
