import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export type FurnitureObjectData =
  | { dataType: "legacy"; flags: number; state: string; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "map"; flags: number; values: Record<string, string>; state: string; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "string"; flags: number; values: string[]; state: string; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "vote"; flags: number; state: string; result: number; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "number"; flags: number; values: number[]; state: string; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "highScore"; flags: number; state: string; scoreName: string; scoreType: number; levelName: string; pointName: string; unknown: number[]; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "highScoreRanking"; clearType: number; entries: Array<{ rank: number; score: number; users: string[] }>; flags: number; scoreType: number; state: string; unknown: number[]; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "crackable"; flags: number; hits: number; state: string; target: number; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "empty"; flags: number; state: string; uniqueNumber: number | null; uniqueSeries: number | null }
  | { dataType: "unknown"; flags: number; formatKey: number; state: string; uniqueNumber: number | null; uniqueSeries: number | null };

export interface FloorFurni {
  id: number;
  spriteId: number;
  spriteName: string | null;
  x: number;
  y: number;
  z: number;
  direction: number;
  stackHeight: number;
  extra: number;
  objectData: FurnitureObjectData;
  state: number;
  expires: number;
  usagePolicy: number;
  ownerId: number;
  ownerName: string | null;
  allowStack: boolean;
  allowSit: boolean;
  allowLay: boolean;
  allowWalk: boolean;
  dimensionsX: number;
  dimensionsY: number;
  teleportTargetId: number;
}

export interface FurnitureFloor {
  items: FloorFurni[];
  owners: Array<{ id: number; username: string }>;
}

export class FurnitureFloorParser implements PacketParser<FurnitureFloor> {
  flush(): void {}

  parse(reader: PacketReader): FurnitureFloor {
    const owners = readOwners(reader);
    const itemCount = reader.readInt();
    const items: FloorFurni[] = [];

    for (let index = 0; index < itemCount && reader.bytesAvailable; index++) {
      items.push(readFloorItem(reader, owners));
    }

    return {
      items,
      owners: Array.from(owners.entries()).map(([id, username]) => ({ id, username }))
    };
  }
}

function readOwners(reader: PacketReader): Map<number, string> {
  const ownerCount = reader.readInt();
  const owners = new Map<number, string>();

  for (let index = 0; index < ownerCount; index++) {
    owners.set(reader.readInt(), reader.readString());
  }

  return owners;
}

function readFloorItem(reader: PacketReader, owners: Map<number, string>): FloorFurni {
  const id = reader.readInt();
  const spriteId = reader.readInt();
  const x = reader.readInt();
  const y = reader.readInt();
  const direction = (((reader.readInt() % 8) + 8) % 8) * 45;
  const z = parseLocaleFloat(reader.readString());
  const stackHeight = parseLocaleFloat(reader.readString());
  const extra = reader.readInt();
  const objectData = readFurnitureObjectData(reader);
  const state = Number.parseInt(objectData.state, 10);
  const expires = reader.readInt();
  const usagePolicy = reader.readInt();
  const ownerId = reader.readInt();

  return {
    id,
    spriteId,
    spriteName: null,
    x,
    y,
    z,
    direction,
    stackHeight,
    extra,
    objectData,
    state: Number.isNaN(state) ? 0 : state,
    expires,
    usagePolicy,
    ownerId,
    ownerName: owners.get(ownerId) ?? null,
    allowStack: false,
    allowSit: false,
    allowLay: false,
    allowWalk: false,
    dimensionsX: 0,
    dimensionsY: 0,
    teleportTargetId: 0
  };
}

function readFurnitureObjectData(reader: PacketReader): FurnitureObjectData {
  const rawFormat = reader.readInt();
  const formatKey = rawFormat & 0xff;
  const flags = rawFormat & 0xff00;

  if (formatKey === 0) {
    return { dataType: "legacy", flags, state: reader.readString(), ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 1) {
    const totalSets = reader.readInt();
    const values: Record<string, string> = {};

    for (let index = 0; index < totalSets; index++) {
      values[reader.readString()] = reader.readString();
    }

    return { dataType: "map", flags, values, state: values.state ?? "", ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 2) {
    const totalStrings = reader.readInt();
    const values: string[] = [];

    for (let index = 0; index < totalStrings; index++) {
      values.push(reader.readString());
    }

    return { dataType: "string", flags, values, state: values[0] ?? "", ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 4) {
    return { dataType: "empty", flags, state: "", ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 3) {
    const state = reader.readString();
    return { dataType: "vote", flags, state, result: reader.readInt(), ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 5) {
    const totalNumbers = reader.readInt();
    const values: number[] = [];

    for (let index = 0; index < totalNumbers; index++) {
      values.push(reader.readInt());
    }

    return { dataType: "number", flags, values, state: values[0]?.toString() ?? "", ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 6) {
    const state = reader.readString();
    const nextOffset = reader.offset;
    const nextStringLength = reader.readShort();
    reader.offset = nextOffset;

    if (nextStringLength === 0) {
      const scoreType = reader.readInt();
      const clearType = reader.readShort();
      const unknown = [reader.readShort(), reader.readInt()];
      let entryCount = reader.readInt();
      if (entryCount === 0) {
        const variantOffset = reader.offset;
        const extraUnknown = reader.readInt();
        const shortEntryCount = reader.readShort();
        if (extraUnknown === 0 && shortEntryCount > 0) {
          unknown.push(entryCount, extraUnknown);
          entryCount = shortEntryCount;
        } else {
          reader.offset = variantOffset;
          const shortUnknown = reader.readShort();
          const intEntryCount = reader.readInt();
          if (shortUnknown > 0 && intEntryCount > 0) {
            unknown.push(entryCount, shortUnknown);
            entryCount = intEntryCount;
          } else {
            reader.offset = variantOffset;
          }
        }
      }
      const entries: Array<{ rank: number; score: number; users: string[] }> = [];

      for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
        const rank = reader.readInt();
        const score = reader.readInt();
        const userCount = reader.readInt();
        const users: string[] = [];

        for (let userIndex = 0; userIndex < userCount; userIndex++) users.push(reader.readString());
        entries.push({ rank, score, users });
      }

      return { dataType: "highScoreRanking", flags, state, scoreType, clearType, unknown, entries, ...readObjectDataTail(reader, flags) };
    }

    const scoreName = reader.readString();
    const scoreType = reader.readInt();
    const levelName = reader.readString();
    const pointName = reader.readString();
    const unknown = [reader.readInt(), reader.readInt(), reader.readInt()];

    return { dataType: "highScore", flags, state, scoreName, scoreType, levelName, pointName, unknown, ...readObjectDataTail(reader, flags) };
  }

  if (formatKey === 7) {
    const state = reader.readString();
    return { dataType: "crackable", flags, state, hits: reader.readInt(), target: reader.readInt(), ...readObjectDataTail(reader, flags) };
  }

  return { dataType: "unknown", flags, formatKey, state: "", ...readObjectDataTail(reader, flags) };
}

function readObjectDataTail(reader: PacketReader, flags: number): { uniqueNumber: number | null; uniqueSeries: number | null } {
  if ((flags & 0x100) === 0) return { uniqueNumber: null, uniqueSeries: null };

  return {
    uniqueNumber: reader.readInt(),
    uniqueSeries: reader.readInt()
  };
}

function parseLocaleFloat(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
}
