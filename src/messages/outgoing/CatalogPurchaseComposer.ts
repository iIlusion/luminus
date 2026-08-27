import type { PacketComposer } from "../../protocol/types";

export class CatalogPurchaseComposer implements PacketComposer<[number, number, string, number]> {
  constructor(private readonly pageId: number, private readonly offerId: number, private readonly extraData: string, private readonly quantity: number) {}

  getMessageArray(): [number, number, string, number] {
    return [this.pageId, this.offerId, this.extraData, this.quantity];
  }
}
