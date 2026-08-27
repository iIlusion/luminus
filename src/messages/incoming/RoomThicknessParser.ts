import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomThickness {
  hideWalls: boolean;
  wall: number;
  floor: number;
}

export class RoomThicknessParser implements PacketParser<RoomThickness> {
  flush(): void {}

  parse(reader: PacketReader): RoomThickness {
    const hideWalls = reader.readBoolean();
    const wall = Math.pow(2, clamp(reader.readInt(), -2, 1));
    const floor = Math.pow(2, clamp(reader.readInt(), -2, 1));
    return { hideWalls, wall, floor };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
