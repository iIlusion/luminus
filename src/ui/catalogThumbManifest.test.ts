import {
  frameIndexAtTick,
  parseCatalogThumbManifest,
  type CatalogThumbManifest,
  type CatalogThumbReadyEntry,
} from "./catalogThumbManifest.ts";

const HASH = "a".repeat(64);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  assert(Object.is(actual, expected), `${message}: ${String(actual)} !== ${String(expected)}`);
}

function entry(): CatalogThumbReadyEntry {
  return {
    status: "ready",
    playback: "loop",
    canvas: [64, 96],
    anchor: [32, 88],
    idleFrame: 1,
    loopTicks: 6,
    atlases: [{ file: "enables/1.hash.atlas.png", sha256: HASH, size: [128, 128] }],
    frames: [
      { ticks: 2, planes: [{ atlas: 0, rect: [0, 0, 32, 32], at: [0, 0], blend: "normal" }] },
      { ticks: 4, planes: [{ atlas: 0, rect: [32, 0, 32, 32], at: [1, 2], blend: "add" }] },
    ],
  };
}

{
  const value = { ...entry(), playback: "once" as const };
  equal(frameIndexAtTick(value, 6), 1, "animação única segura o último frame");
  equal(frameIndexAtTick(value, 60), 1, "animação única não reinicia");
}

function manifest(): CatalogThumbManifest {
  return {
    schema: 1,
    bundleDigest: HASH,
    nitroFingerprint: "runtime-1234",
    tickMs: 41,
    figure: "hd-180-1",
    gender: "M",
    scale: 64,
    bodyDirection: 2,
    headDirection: 2,
    entries: { "1": entry() },
  };
}

const parsed = parseCatalogThumbManifest(manifest());
assert(JSON.stringify(parsed) === JSON.stringify(manifest()), "manifest completo deve ser preservado");

{
  const value = entry();
  equal(frameIndexAtTick(value, 0), 0, "tick inicial");
  equal(frameIndexAtTick(value, 1), 0, "hold do primeiro frame");
  equal(frameIndexAtTick(value, 2), 1, "início do segundo frame");
  equal(frameIndexAtTick(value, 5), 1, "hold do segundo frame");
  equal(frameIndexAtTick(value, 6), 0, "reinício do ciclo");
}

{
  const value = manifest() as unknown as Record<string, unknown>;
  const entries = value.entries as Record<string, Record<string, unknown>>;
  const frames = entries["1"].frames as Array<Record<string, unknown>>;
  const planes = frames[0].planes as Array<Record<string, unknown>>;
  planes[0].rect = [120, 120, 32, 32];
  let rejected = false;
  try {
    parseCatalogThumbManifest(value);
  } catch (error) {
    rejected = error instanceof Error && /fora do atlas/.test(error.message);
  }
  assert(rejected, "plano fora da atlas deve ser rejeitado");
}

console.log("catalogThumbManifest: ok");
