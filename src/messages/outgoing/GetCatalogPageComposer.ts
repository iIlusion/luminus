import type { PacketComposer } from "../../protocol/types";

export class GetCatalogPageComposer implements PacketComposer<[number, number, string]> {
  constructor(
    private readonly pageId: number,
    private readonly offerId = -1,
    private readonly catalogType = "NORMAL",
  ) {}

  getMessageArray(): [number, number, string] {
    return [this.pageId, this.offerId, this.catalogType];
  }
}
