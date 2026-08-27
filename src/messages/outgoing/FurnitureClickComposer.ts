import type { PacketComposer } from "../../protocol/types";

export class FurnitureClickComposer implements PacketComposer<[number]> {
  constructor(private readonly itemId: number) {}

  getMessageArray(): [number] {
    return [this.itemId];
  }
}
