import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { RoomUnitUpdate } from "../messages/incoming/UserUpdateParser";
import type { FloorFurni } from "../messages/incoming/FurnitureFloorParser";
import type { ObjectDataUpdate } from "../messages/incoming/ObjectsDataUpdateParser";

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

export function updateRoomUnits(store: RoomStore, updates: RoomUnitUpdate[]): void {
  for (const update of updates) {
    const unit = store.units.get(update.index);
    if (!unit) continue;

    unit.x = update.x;
    unit.y = update.y;
    unit.z = update.z;
    unit.direction = update.bodyDirection;
  }
}

export function setRoomFurnis(store: RoomStore, furnis: FloorFurni[]): void {
  store.furnis.clear();
  for (const furni of furnis) store.furnis.set(furni.id, furni);
}

export function updateRoomFurniStates(store: RoomStore, updates: ObjectDataUpdate[]): void {
  for (const update of updates) {
    const furni = store.furnis.get(update.id);
    if (!furni) continue;
    furni.state = Number.parseInt(update.state, 10);
    furni.objectData.state = update.state;
  }
}
