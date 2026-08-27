import type { PacketComposer } from "../../protocol/types";

export class FurnitureMultiStateComposer implements PacketComposer<[number, number]> {
  constructor(private readonly itemId: number, private readonly state = 0) {}

  getMessageArray(): [number, number] {
    return [this.itemId, this.state];
  }
}
