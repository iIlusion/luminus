import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface CatalogPurchaseError {
  code: number;
}

export class CatalogPurchaseErrorParser implements PacketParser<CatalogPurchaseError> {
  flush(): void {}

  parse(reader: PacketReader): CatalogPurchaseError {
    return { code: reader.readInt() };
  }
}
