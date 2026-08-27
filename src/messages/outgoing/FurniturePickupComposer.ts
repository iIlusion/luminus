import type { PacketComposer } from "../../protocol/types";

export class FurniturePickupComposer implements PacketComposer<[number, number]> {
  constructor(private readonly category: number, private readonly itemId: number) {}

  getMessageArray(): [number, number] {
    return [this.category, this.itemId];
  }
}
