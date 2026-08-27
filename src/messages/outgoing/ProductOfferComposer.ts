import type { PacketComposer } from "../../protocol/types";

export class ProductOfferComposer implements PacketComposer<[number]> {
  constructor(private readonly productId: number) {}

  getMessageArray(): [number] {
    return [this.productId];
  }
}
