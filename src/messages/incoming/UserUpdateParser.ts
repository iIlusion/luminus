import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomUnitUpdate {
  index: number;
  x: number;
  y: number;
  z: number;
  headDirection: number;
  bodyDirection: number;
  actions: string;
}

export class UserUpdateParser implements PacketParser<RoomUnitUpdate[]> {
  flush(): void {}

  parse(reader: PacketReader): RoomUnitUpdate[] {
    const count = reader.readInt();
    const updates: RoomUnitUpdate[] = [];

    for (let i = 0; i < count; i++) {
      updates.push({
        index: reader.readInt(),
        x: reader.readInt(),
        y: reader.readInt(),
        z: Number.parseFloat(reader.readString()),
        headDirection: reader.readInt(),
        bodyDirection: reader.readInt(),
        actions: reader.readString()
      });
    }

    return updates;
  }
}
