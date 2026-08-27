import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomEntryTile {
  x: number;
  y: number;
  direction: number;
}

export class RoomEntryTileParser implements PacketParser<RoomEntryTile> {
  flush(): void {}

  parse(reader: PacketReader): RoomEntryTile {
    return {
      x: reader.readInt(),
      y: reader.readInt(),
      direction: reader.readInt(),
    };
  }
}
