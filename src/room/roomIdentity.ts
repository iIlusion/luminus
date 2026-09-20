import type { RoomUnit } from "../messages/incoming/UsersParser";

export function normalizeRoomUnitName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Resolve a display name without letting a bot/pet shadow a real user. */
export function resolveRoomUnitByName(units: Iterable<RoomUnit>, name: string): RoomUnit | undefined {
  const wanted = normalizeRoomUnitName(name);
  let fallback: RoomUnit | undefined;
  for (const unit of units) {
    if (normalizeRoomUnitName(unit.name) !== wanted) continue;
    if (unit.type === 1) return unit;
    fallback ??= unit;
  }
  return fallback;
}
