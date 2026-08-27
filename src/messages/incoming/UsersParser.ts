import type { PacketParser } from "../../protocol/types";
import { PacketReader } from "../../protocol/wrapper";

export interface RoomUnit {
  id: number;
  name: string;
  motto: string;
  figure: string;
  index: number;
  x: number;
  y: number;
  z: number;
  direction: number;
  headDirection?: number;
  actions?: string;
  type: number;
  sex?: string;
  /** Same value as `sex` — some UI reads `gender`. */
  gender?: string;
  groupId?: number;
  groupStatus?: number;
  groupName?: string;
  swimFigure?: string;
  activityPoints?: number;
  isModerator?: boolean;
}

export interface RoomUnitPacketEntry {
  index: number;
  start: number;
  end: number;
}

interface CommonFields extends Omit<RoomUnit, "sex"> {}

export class UsersParser implements PacketParser<RoomUnit[]> {
  flush(): void {}

  parse(reader: PacketReader): RoomUnit[] {
    const count = reader.readInt();
    const users: RoomUnit[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const fields = readCommonFields(reader);
        const user: RoomUnit = { ...fields };
        readTypeSpecific(reader, user);
        users.push(user);
      } catch {
        break;
      }
    }

    return users;
  }
}

/** Returns raw entry boundaries so callers can filter UNIT without re-encoding fields. */
export function readRoomUnitPacketEntries(body: ArrayBuffer): RoomUnitPacketEntry[] {
  const reader = new PacketReader(374, body);
  const count = reader.readInt();
  if (count < 0 || count > 10000) throw new Error("invalid room unit count");

  const entries: RoomUnitPacketEntry[] = [];
  for (let i = 0; i < count; i++) {
    const start = reader.offset;
    reader.readInt();
    skipString(reader, 128);
    skipString(reader, 512);
    skipString(reader, 4096);
    const index = reader.readInt();
    reader.readInt();
    reader.readInt();
    skipString(reader, 32);
    reader.readInt();
    const type = reader.readInt();

    skipTypeSpecific(reader, type);

    entries.push({ index, start, end: reader.offset });
  }

  return entries;
}

function readCommonFields(reader: PacketReader): CommonFields {
  const id = reader.readInt();
  const name = readBoundedString(reader, 128);
  const motto = readBoundedString(reader, 512);
  const figure = readBoundedString(reader, 4096);
  const index = reader.readInt();
  const x = reader.readInt();
  const y = reader.readInt();
  const z = Number.parseFloat(readBoundedString(reader, 32));
  const direction = reader.readInt();
  const type = reader.readInt();

  if (!Number.isFinite(z)) throw new Error("invalid room unit z");

  return { id, name, motto, figure, index, x, y, z, direction, type };
}

function applySex(user: RoomUnit, value: string): void {
  const sex = sanitize(value);
  user.sex = sex;
  user.gender = sex;
}

function readTypeSpecific(reader: PacketReader, user: RoomUnit): void {
  if (user.type === 1) {
    applySex(user, reader.readString());
    user.groupId = reader.readInt();
    user.groupStatus = reader.readInt();
    user.groupName = sanitize(reader.readString());

    const swimFigure = sanitize(reader.readString());
    if (swimFigure) user.swimFigure = swimFigure;

    user.activityPoints = reader.readInt();
    user.isModerator = reader.readBoolean();
    return;
  }

  if (user.type === 2) {
    skipPetFields(reader);
    return;
  }

  if (user.type === 4) {
    applySex(user, reader.readString());
    skipRentableBotFields(reader);
  }
}

function skipTypeSpecific(reader: PacketReader, type: number): void {
  if (type === 1) {
    skipString(reader, 16);
    reader.readInt();
    reader.readInt();
    skipString(reader, 128);
    skipString(reader, 4096);
    reader.readInt();
    reader.readByte();
    return;
  }

  if (type === 2) {
    skipPetFields(reader);
    return;
  }

  if (type === 4) {
    skipString(reader, 16);
    skipRentableBotFields(reader);
  }
}

function skipPetFields(reader: PacketReader): void {
  reader.readInt();
  reader.readInt();
  skipString(reader, 128);
  reader.readInt();
  // Habblet writes 7 booleans after rarity. Five or six leaves the next
  // unit's id one byte early and drops the rest of the roster.
  for (let index = 0; index < 7; index++) reader.readByte();
  reader.readInt();
  skipString(reader, 128);
}

function skipRentableBotFields(reader: PacketReader): void {
  reader.readInt();
  skipString(reader, 128);
  const skillCount = reader.readInt();
  if (skillCount < 0 || skillCount > 64) throw new Error("invalid rentable bot skill count");
  for (let index = 0; index < skillCount; index++) reader.readShort();
}

function readBoundedString(reader: PacketReader, maxLength: number): string {
  const length = reader.readShort();
  if (length < 0 || length > maxLength || reader.offset + length > reader.length) {
    throw new Error(`invalid string length ${length}`);
  }

  return sanitize(new TextDecoder().decode(reader.readBytes(length)));
}

function skipString(reader: PacketReader, maxLength: number): void {
  const length = reader.readShort();
  if (length < 0 || length > maxLength) throw new Error("invalid room unit string length");
  reader.readBytes(length);
}

function sanitize(value: string): string {
  return value
    .replace(/\uFFFD+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
