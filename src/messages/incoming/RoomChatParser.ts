import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomChat {
  roomIndex: number;
  message: string;
  bubble: number;
}

export class RoomChatParser implements PacketParser<RoomChat> {
  flush(): void {}
  parse(reader: PacketReader): RoomChat {
    const roomIndex = reader.readInt();
    const message   = reader.readString();
    reader.readInt(); // gesture
    const bubble    = reader.readInt();
    return { roomIndex, message, bubble };
  }
}
