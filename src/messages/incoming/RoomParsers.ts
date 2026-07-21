import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomReady {
  model: string;
  roomId: number;
}

export interface RoomEntryInfo {
  roomId: number;
  isOwner: boolean;
}

export interface GuestRoomData {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  ownerName: string;
  userCount: number;
  maxUserCount: number;
  rating: number;
  isEntering: boolean;
  doorMode: number;
  tradeMode: number;
  category: number;
}

export class RoomReadyParser implements PacketParser<RoomReady> {
  flush(): void {}

  parse(reader: PacketReader): RoomReady {
    return {
      model: reader.readString(),
      roomId: reader.readInt()
    };
  }
}

export class RoomEntryInfoParser implements PacketParser<RoomEntryInfo> {
  flush(): void {}

  parse(reader: PacketReader): RoomEntryInfo {
    return {
      roomId: reader.readInt(),
      isOwner: reader.readBoolean()
    };
  }
}

export class GetGuestRoomResultParser implements PacketParser<GuestRoomData> {
  flush(): void {}

  parse(reader: PacketReader): GuestRoomData {
    const isEntering = reader.readBoolean();
    const roomId = reader.readInt();
    const roomName = reader.readString();
    const ownerId = reader.readInt();
    const ownerName = reader.readString();
    const doorMode = reader.readInt();
    const userCount = reader.readInt();
    const maxUserCount = reader.readInt();
    const description = reader.readString();
    const tradeMode = reader.readInt();
    const rating = reader.readInt();
    const category = reader.readInt();

    return {
      id: roomId,
      name: roomName,
      description,
      ownerId,
      ownerName,
      userCount,
      maxUserCount,
      rating,
      isEntering,
      doorMode,
      tradeMode,
      category
    };
  }
}
