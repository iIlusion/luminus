export type CatalogThumbKind = "enable" | "handitem";

export type CatalogThumbBlend = "normal" | "add";

export type CatalogThumbUnavailableReason =
  | "missing-library"
  | "missing-action-map"
  | "invalid-asset";

export type CatalogThumbAtlas = {
  file: string;
  sha256: string;
  size: [number, number];
};

export type CatalogThumbPlane = {
  atlas: number;
  rect: [number, number, number, number];
  at: [number, number];
  blend: CatalogThumbBlend;
};

export type CatalogThumbFrame = {
  ticks: number;
  planes: CatalogThumbPlane[];
};

export type CatalogThumbReadyEntry = {
  status: "ready";
  playback: "loop" | "once";
  canvas: [number, number];
  anchor: [number, number];
  idleFrame: number;
  loopTicks: number;
  atlases: CatalogThumbAtlas[];
  frames: CatalogThumbFrame[];
};

export type CatalogThumbUnavailableEntry = {
  status: "unavailable";
  reason: CatalogThumbUnavailableReason;
};

export type CatalogThumbEntry =
  | CatalogThumbReadyEntry
  | CatalogThumbUnavailableEntry;

export type CatalogThumbManifest = {
  schema: 1;
  bundleDigest: string;
  nitroFingerprint: string;
  tickMs: 41;
  figure: string;
  gender: "M" | "F";
  scale: 64;
  bodyDirection: 2;
  headDirection: 2;
  entries: Record<string, CatalogThumbEntry>;
};

const SHA256_RE = /^[a-f0-9]{64}$/;
const FILE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isPair(value: unknown, positive = false): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((item) => positive ? isPositiveInt(item) : isFiniteNumber(item));
}

function isQuad(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value)
    && value.length === 4
    && isFiniteNumber(value[0])
    && isFiniteNumber(value[1])
    && isPositiveInt(value[2])
    && isPositiveInt(value[3]);
}

function validateUnavailable(value: Record<string, unknown>): CatalogThumbUnavailableEntry {
  const reason = value.reason;
  if (
    reason !== "missing-library"
    && reason !== "missing-action-map"
    && reason !== "invalid-asset"
  ) {
    throw new Error("Motivo de indisponibilidade inválido");
  }
  return { status: "unavailable", reason };
}

function validateReady(value: Record<string, unknown>, id: string): CatalogThumbReadyEntry {
  if (!isPair(value.canvas, true)) throw new Error(`Canvas inválido para ${id}`);
  if (!isPair(value.anchor)) throw new Error(`Âncora inválida para ${id}`);
  if (!Array.isArray(value.atlases) || value.atlases.length === 0) {
    throw new Error(`Atlas ausente para ${id}`);
  }
  if (!Array.isArray(value.frames) || value.frames.length === 0) {
    throw new Error(`Frames ausentes para ${id}`);
  }

  const atlases = value.atlases.map((raw, atlasIndex): CatalogThumbAtlas => {
    if (!isRecord(raw)) throw new Error(`Atlas ${atlasIndex} inválido para ${id}`);
    if (typeof raw.file !== "string" || !FILE_RE.test(raw.file) || raw.file.includes("..")) {
      throw new Error(`Arquivo de atlas inválido para ${id}`);
    }
    if (typeof raw.sha256 !== "string" || !SHA256_RE.test(raw.sha256)) {
      throw new Error(`Hash de atlas inválido para ${id}`);
    }
    if (!isPair(raw.size, true)) throw new Error(`Dimensão de atlas inválida para ${id}`);
    return { file: raw.file, sha256: raw.sha256, size: raw.size };
  });

  const frames = value.frames.map((raw, frameIndex): CatalogThumbFrame => {
    if (!isRecord(raw) || !isPositiveInt(raw.ticks) || !Array.isArray(raw.planes)) {
      throw new Error(`Frame ${frameIndex} inválido para ${id}`);
    }
    const planes = raw.planes.map((planeRaw, planeIndex): CatalogThumbPlane => {
      if (!isRecord(planeRaw)) throw new Error(`Plano ${planeIndex} inválido para ${id}`);
      if (!Number.isInteger(planeRaw.atlas) || (planeRaw.atlas as number) < 0 || (planeRaw.atlas as number) >= atlases.length) {
        throw new Error(`Página de atlas inválida para ${id}`);
      }
      if (!isQuad(planeRaw.rect) || !isPair(planeRaw.at)) {
        throw new Error(`Geometria de plano inválida para ${id}`);
      }
      if (planeRaw.blend !== "normal" && planeRaw.blend !== "add") {
        throw new Error(`Blend de plano inválido para ${id}`);
      }
      const atlas = atlases[planeRaw.atlas as number];
      const [x, y, width, height] = planeRaw.rect;
      if ((x + width) > atlas.size[0] || (y + height) > atlas.size[1]) {
        throw new Error(`Plano fora do atlas para ${id}`);
      }
      return {
        atlas: planeRaw.atlas as number,
        rect: planeRaw.rect,
        at: planeRaw.at,
        blend: planeRaw.blend,
      };
    });
    return { ticks: raw.ticks, planes };
  });

  const idleFrame = value.idleFrame;
  if (!Number.isInteger(idleFrame) || (idleFrame as number) < 0 || (idleFrame as number) >= frames.length) {
    throw new Error(`Frame estático inválido para ${id}`);
  }
  const loopTicks = frames.reduce((total, frame) => total + frame.ticks, 0);
  if (value.loopTicks !== loopTicks) throw new Error(`Duração de ciclo inválida para ${id}`);
  if (value.playback !== "loop" && value.playback !== "once") {
    throw new Error(`Modo de reprodução inválido para ${id}`);
  }

  return {
    status: "ready",
    playback: value.playback,
    canvas: value.canvas,
    anchor: value.anchor,
    idleFrame: idleFrame as number,
    loopTicks,
    atlases,
    frames,
  };
}

export function parseCatalogThumbManifest(value: unknown): CatalogThumbManifest {
  if (!isRecord(value)) throw new Error("Manifest inválido");
  if (value.schema !== 1) throw new Error("Versão de manifest incompatível");
  if (typeof value.bundleDigest !== "string" || !SHA256_RE.test(value.bundleDigest)) {
    throw new Error("Digest do catálogo inválido");
  }
  if (typeof value.nitroFingerprint !== "string" || value.nitroFingerprint.length < 8) {
    throw new Error("Fingerprint do Nitro inválido");
  }
  if (value.tickMs !== 41 || value.scale !== 64 || value.bodyDirection !== 2 || value.headDirection !== 2) {
    throw new Error("Configuração de captura incompatível");
  }
  if (typeof value.figure !== "string" || !value.figure || (value.gender !== "M" && value.gender !== "F")) {
    throw new Error("Avatar canônico inválido");
  }
  if (!isRecord(value.entries)) throw new Error("Entradas do catálogo ausentes");

  const entries: Record<string, CatalogThumbEntry> = {};
  for (const [id, raw] of Object.entries(value.entries)) {
    if (!/^\d+$/.test(id) || !isRecord(raw)) throw new Error(`Entrada ${id} inválida`);
    if (raw.status === "unavailable") entries[id] = validateUnavailable(raw);
    else if (raw.status === "ready") entries[id] = validateReady(raw, id);
    else throw new Error(`Status inválido para ${id}`);
  }

  return {
    schema: 1,
    bundleDigest: value.bundleDigest,
    nitroFingerprint: value.nitroFingerprint,
    tickMs: 41,
    figure: value.figure,
    gender: value.gender,
    scale: 64,
    bodyDirection: 2,
    headDirection: 2,
    entries,
  };
}

export function frameIndexAtTick(entry: CatalogThumbReadyEntry, tick: number): number {
  if (entry.frames.length <= 1 || entry.loopTicks <= 0) return 0;
  let cursor = entry.playback === "once"
    ? Math.min(Math.max(0, Math.floor(tick)), entry.loopTicks - 1)
    : ((Math.floor(tick) % entry.loopTicks) + entry.loopTicks) % entry.loopTicks;
  for (let index = 0; index < entry.frames.length; index += 1) {
    const duration = entry.frames[index].ticks;
    if (cursor < duration) return index;
    cursor -= duration;
  }
  return 0;
}
