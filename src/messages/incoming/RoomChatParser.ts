import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomChat {
  roomIndex: number;
  message: string;
  gesture: number;
  bubble: number;
  urls: string[];
  messageLength: number;
}

export class RoomChatParser implements PacketParser<RoomChat> {
  flush(): void {}
  parse(reader: PacketReader): RoomChat {
    const roomIndex = reader.readInt();
    const message = reader.readString();
    const gesture = reader.readInt();
    const bubble = reader.readInt();
    const urlCount = reader.readInt();
    const urls: string[] = [];
    for (let index = 0; index < urlCount; index++) urls.push(reader.readString());
    const messageLength = reader.readInt();
    return { roomIndex, message, gesture, bubble, urls, messageLength };
  }
}
