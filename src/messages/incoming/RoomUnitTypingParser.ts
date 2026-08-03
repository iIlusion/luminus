import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomUnitTyping {
  unitId: number;
  isTyping: boolean;
}

export class RoomUnitTypingParser implements PacketParser<RoomUnitTyping> {
  flush(): void {}

  parse(reader: PacketReader): RoomUnitTyping {
    return {
      unitId: reader.readInt(),
      isTyping: reader.readInt() === 1,
    };
  }
}
