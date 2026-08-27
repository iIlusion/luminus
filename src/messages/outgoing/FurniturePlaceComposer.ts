import type { PacketComposer } from "../../protocol/types";

export class FurniturePlaceComposer implements PacketComposer<[string]> {
  constructor(private readonly item: number, private readonly x: number, private readonly y: number, private readonly direction: number) {}

  getMessageArray(): [string] {
    return [`${this.item} ${this.x} ${this.y} ${this.direction}`];
  }
}
