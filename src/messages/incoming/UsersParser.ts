import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

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
  type: number;
  sex?: string;
  groupId?: number;
  groupStatus?: number;
  groupName?: string;
  swimFigure?: string;
  activityPoints?: number;
  isModerator?: boolean;
}

interface CommonFields extends Omit<RoomUnit, "sex"> {}

export class UsersParser implements PacketParser<RoomUnit[]> {
  flush(): void {}

  parse(reader: PacketReader): RoomUnit[] {
    const count = reader.readInt();
    const users: RoomUnit[] = [];

    for (let i = 0; i < count; i++) {
      const fields = readCommonFields(reader);
      const user: RoomUnit = { ...fields };

      if (fields.type === 1) {
        user.sex = sanitize(reader.readString());
        user.groupId = reader.readInt();
        user.groupStatus = reader.readInt();
        user.groupName = sanitize(reader.readString());

        const swimFigure = sanitize(reader.readString());
        if (swimFigure) user.swimFigure = swimFigure;

        user.activityPoints = reader.readInt();
        user.isModerator = reader.readBoolean();
      } else if (fields.type === 2) {
        reader.offset += 33;
      } else if (fields.type === 4) {
        reader.offset += 39;
      }

      users.push(user);
    }

    return users;
  }
}

function readCommonFields(reader: PacketReader): CommonFields {
  const id = reader.readInt();
  const name = readBoundedString(reader, 128);
  const motto = readBoundedString(reader, 512);
  const figure = readBoundedString(reader, 1024);
  const index = reader.readInt();
  const x = reader.readInt();
  const y = reader.readInt();
  const z = Number.parseFloat(readBoundedString(reader, 32));
  const direction = reader.readInt();
  const type = reader.readInt();

  if (!Number.isFinite(z)) throw new Error("invalid room unit z");

  return { id, name, motto, figure, index, x, y, z, direction, type };
}

function readBoundedString(reader: PacketReader, maxLength: number): string {
  const length = reader.readShort();
  if (length < 0 || length > maxLength || reader.offset + length > reader.length) {
    throw new Error(`invalid string length ${length}`);
  }

  return sanitize(new TextDecoder().decode(reader.readBytes(length)));
}

function sanitize(value: string): string {
  return value
    .replace(/\uFFFD+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
