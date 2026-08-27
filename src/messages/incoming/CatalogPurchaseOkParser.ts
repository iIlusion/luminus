import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface CatalogPurchaseOk {
  offerId: number;
  localizationId: string;
}

export class CatalogPurchaseOkParser implements PacketParser<CatalogPurchaseOk> {
  flush(): void {}

  parse(reader: PacketReader): CatalogPurchaseOk {
    const offerId = reader.readInt();
    const localizationId = reader.readString();
    return { offerId, localizationId };
  }
}
