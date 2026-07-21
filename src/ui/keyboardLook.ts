import type { LuminusApi } from "../ws/api";

const DIR_OFFSETS: [number, number][] = [
  [-1, -1], // 0 NW
  [ 0, -1], // 1 N
  [ 1, -1], // 2 NE
  [ 1,  0], // 3 E
  [ 1,  1], // 4 SE
  [ 0,  1], // 5 S
  [-1,  1], // 6 SW
  [-1,  0], // 7 W
];

function offsetToDir(dx: number, dy: number): number {
  return DIR_OFFSETS.findIndex(([ox, oy]) => ox === dx && oy === dy);
}

function dirDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 8;
  return Math.min(d, 8 - d);
}

export function sendLookAt(luminusApi: LuminusApi, dx: number, dy: number): void {
  const idx = luminusApi.myself?.index;
  if (idx == null) return;
  const unit = luminusApi.room.units.get(idx);
  if (!unit) return;

  const desired = offsetToDir(dx, dy);
  if (desired === -1) return;

  // ponytail: kick to opposite direction to force full body rotation when diff ≤ 1
  if (dirDiff(desired, unit.direction) <= 1) {
    const [ox, oy] = DIR_OFFSETS[(desired + 4) % 8];
    luminusApi.send("UNIT_LOOK", [unit.x + ox, unit.y + oy]);
  }

  luminusApi.send("UNIT_LOOK", [unit.x + dx, unit.y + dy]);
}

const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const held   = new Set<string>();

let enabled = false;
let api: LuminusApi | null = null;

function sendFromHeld(): void {
  if (!api) return;
  const dx = (held.has("ArrowRight") ? 1 : 0) - (held.has("ArrowLeft") ? 1 : 0);
  const dy = (held.has("ArrowDown")  ? 1 : 0) - (held.has("ArrowUp")   ? 1 : 0);
  if (dx === 0 && dy === 0) return;
  sendLookAt(api, dx, dy);
}

function onKeyDown(e: KeyboardEvent): void {
  if (!enabled || !api) return;
  if (!e.ctrlKey || !ARROWS.has(e.key)) return;
  const t = e.target as Element | null;
  if (t?.closest?.("#luminus-panel")) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  held.add(e.key);
  sendFromHeld();
}

function onKeyUp(e: KeyboardEvent): void {
  held.delete(e.key);
  if (!e.ctrlKey) held.clear();
}

export function initKeyboardLook(luminusApi: LuminusApi): void {
  api = luminusApi;
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup",   onKeyUp,   true);
}

export function setLookEnabled(v: boolean): void {
  enabled = v;
  if (!v) held.clear();
}
