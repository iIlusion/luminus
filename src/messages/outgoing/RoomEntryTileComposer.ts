import type { PacketComposer } from "../../protocol/types";

export class RoomEntryTileComposer implements PacketComposer<[]> {
  getMessageArray(): [] {
    return [];
  }
}
