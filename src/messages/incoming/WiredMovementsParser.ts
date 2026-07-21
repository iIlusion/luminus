import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export type WiredMovement =
  | {
    type: "user";
    id: number;
    fromX: number;
    fromY: number;
    fromZ: number;
    toX: number;
    toY: number;
    toZ: number;
    animationType: number;
    bodyDirection: number;
    headDirection: number;
    duration: number;
  }
  | {
    type: "furni";
    id: number;
    fromX: number;
    fromY: number;
    fromZ: number;
    toX: number;
    toY: number;
    toZ: number;
    duration: number;
    elapsed: number;
  }
  | { type: "wallItem"; id: number; enabled: boolean; values: number[] }
  | { type: "userDirection"; id: number; headDirection: number; bodyDirection: number };

export class WiredMovementsParser implements PacketParser<WiredMovement[]> {
  flush(): void {}

  parse(reader: PacketReader): WiredMovement[] {
    const count = reader.readInt();
    const movements: WiredMovement[] = [];

    for (let index = 0; index < count; index++) {
      const type = reader.readInt();

      if (type === 0) movements.push(readUserMovement(reader));
      else if (type === 1) movements.push(readFurniMovement(reader));
      else if (type === 2) movements.push(readWallItemMovement(reader));
      else if (type === 3) movements.push(readUserDirection(reader));
      else throw new RangeError(`unknown wired movement type ${type}`);
    }

    return movements;
  }
}

function readUserMovement(reader: PacketReader): WiredMovement {
  const position = readPosition(reader);
  return {
    type: "user",
    ...position,
    id: reader.readInt(),
    animationType: reader.readInt(),
    bodyDirection: reader.readInt(),
    headDirection: reader.readInt(),
    duration: reader.readInt()
  };
}

function readFurniMovement(reader: PacketReader): WiredMovement {
  const position = readPosition(reader);
  return {
    type: "furni",
    ...position,
    id: reader.readInt(),
    duration: reader.readInt(),
    elapsed: reader.readInt()
  };
}

function readWallItemMovement(reader: PacketReader): WiredMovement {
  const id = reader.readInt();
  const enabled = reader.readBoolean();
  const values = Array.from({ length: 9 }, () => reader.readInt());
  return { type: "wallItem", id, enabled, values };
}

function readUserDirection(reader: PacketReader): WiredMovement {
  return {
    type: "userDirection",
    id: reader.readInt(),
    headDirection: reader.readInt(),
    bodyDirection: reader.readInt()
  };
}

function readPosition(reader: PacketReader) {
  return {
    fromX: reader.readInt(),
    fromY: reader.readInt(),
    toX: reader.readInt(),
    toY: reader.readInt(),
    fromZ: parseLocaleFloat(reader.readString()),
    toZ: parseLocaleFloat(reader.readString())
  };
}

function parseLocaleFloat(value: string): number {
  return Number.parseFloat(value.replace(",", ".")) || 0;
}
