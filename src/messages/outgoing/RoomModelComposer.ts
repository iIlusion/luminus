import type { PacketComposer } from "../../protocol/types";

export class RoomModelComposer implements PacketComposer<[]> {
  getMessageArray(): [] {
    return [];
  }
}
