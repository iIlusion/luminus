import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { RoomUnitUpdate } from "../messages/incoming/UserUpdateParser";
import type { FloorFurni } from "../messages/incoming/FurnitureFloorParser";
import type { ObjectDataUpdate } from "../messages/incoming/ObjectsDataUpdateParser";
import type { RoomModelData } from "../messages/incoming/RoomModelParser";
import type { RoomEntryTile } from "../messages/incoming/RoomEntryTileParser";
import type { RoomThickness } from "../messages/incoming/RoomThicknessParser";
import type { WiredDefinition } from "../messages/incoming/WiredDefinitionParser";

export interface RoomStore {
  id: number | null;
  name: string | null;
  model: string | null;
  description: string | null;
  ownerId: number | null;
  ownerName: string | null;
  isOwner: boolean;
  userCount: number | null;
  maxUserCount: number | null;
  modelData: RoomModelData | null;
  entryTile: RoomEntryTile | null;
  thickness: RoomThickness | null;
  wiredDefinitions: Map<number, WiredDefinition>;
  units: Map<number, RoomUnit>;
  furnis: Map<number, FloorFurni>;
}

export function createRoomStore(): RoomStore {
  return {
    id: null,
    name: null,
    model: null,
    description: null,
    ownerId: null,
    ownerName: null,
    isOwner: false,
    userCount: null,
    maxUserCount: null,
    modelData: null,
    entryTile: null,
    thickness: null,
    wiredDefinitions: new Map(),
    units: new Map(),
    furnis: new Map()
  };
}

export function resetRoomStore(store: RoomStore): void {
  store.id = null;
  store.name = null;
  store.model = null;
  store.description = null;
  store.ownerId = null;
  store.ownerName = null;
  store.isOwner = false;
  store.userCount = null;
  store.maxUserCount = null;
  store.modelData = null;
  store.entryTile = null;
  store.thickness = null;
  store.wiredDefinitions.clear();
  store.units.clear();
  store.furnis.clear();
}

export function enterRoom(store: RoomStore, roomId: number, model: string): void {
  resetRoomStore(store);
  store.id = roomId;
  store.model = model;
}

export function upsertRoomUnits(store: RoomStore, units: RoomUnit[]): void {
  for (const unit of units) {
    const current = store.units.get(unit.index);
    if (current) Object.assign(current, unit);
    else store.units.set(unit.index, unit);
  }
}

/** Ignore delayed 2661 from the previous room after a teleporter/door enter. */
export const ROOM_ENTER_SETTLE_MS = 2000;

export type RoomEnterGuard = {
  enterAt: number;
  roster: Set<number>;
};

export type UserRemoveClass = "ignore" | "delete" | "self-leave";

export function createRoomEnterGuard(): RoomEnterGuard {
  return { enterAt: 0, roster: new Set() };
}

export function markRoomEnter(guard: RoomEnterGuard, now = Date.now()): void {
  guard.enterAt = now;
  guard.roster.clear();
}

export function noteEnterRoster(guard: RoomEnterGuard, indices: Iterable<number>, now = Date.now()): void {
  if (!guard.enterAt || now - guard.enterAt > ROOM_ENTER_SETTLE_MS) return;
  for (const index of indices) guard.roster.add(index);
}

export function classifyUserRemove(
  guard: RoomEnterGuard,
  removedIndex: number,
  myselfIndex: number | null | undefined,
  now = Date.now(),
): UserRemoveClass {
  const settling = guard.enterAt > 0 && now - guard.enterAt < ROOM_ENTER_SETTLE_MS;
  if (settling && guard.roster.has(removedIndex)) return "ignore";
  if (myselfIndex === removedIndex) return "self-leave";
  return "delete";
}

export function updateRoomUnits(store: RoomStore, updates: RoomUnitUpdate[]): void {
  for (const update of updates) {
    const unit = store.units.get(update.index);
    if (!unit) continue;

    unit.x = update.x;
    unit.y = update.y;
    unit.z = update.z;
    unit.direction = update.bodyDirection;
    unit.headDirection = update.headDirection;
    unit.actions = update.actions;
  }
}

export function setRoomFurnis(store: RoomStore, furnis: FloorFurni[]): void {
  store.furnis.clear();
  for (const furni of furnis) store.furnis.set(furni.id, furni);
}

export function addRoomFurni(store: RoomStore, furni: FloorFurni): void {
  store.furnis.set(furni.id, furni);
}

export function updateRoomFurniStates(store: RoomStore, updates: ObjectDataUpdate[]): void {
  for (const update of updates) {
    const furni = store.furnis.get(update.id);
    if (!furni) continue;
    furni.state = Number.parseInt(update.state, 10);
    furni.objectData.state = update.state;
  }
}
