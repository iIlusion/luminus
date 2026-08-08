import type { CatalogThumbKind } from "./catalogThumbManifest";

const NATIVE_SCALE_ENABLES = new Set([1, 730]);
const DEAD_AMONG_FIRST = 595;
const DEAD_AMONG_LAST = 606;

export function catalogThumbFit(
  kind: CatalogThumbKind,
  id: number,
  canvas: readonly [number, number],
): number {
  if (kind === "enable" && NATIVE_SCALE_ENABLES.has(id)) return 1;
  return Math.min(1, 104 / canvas[0], 160 / canvas[1]);
}

export function catalogThumbStillFrame(
  kind: CatalogThumbKind,
  id: number,
  idleFrame: number,
  frameCount: number,
): number {
  if (kind === "enable" && id >= DEAD_AMONG_FIRST && id <= DEAD_AMONG_LAST) {
    return Math.max(0, frameCount - 1);
  }
  return idleFrame;
}
