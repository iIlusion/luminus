import type { PacketComposer } from "../../protocol/types";

export class FurnitureInventoryComposer implements PacketComposer<[]> {
  getMessageArray(): [] {
    return [];
  }
}
