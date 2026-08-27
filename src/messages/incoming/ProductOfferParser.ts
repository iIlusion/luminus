import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface ProductOfferItem {
  furniClassId: number;
  productCount: number;
}

export interface ProductOffer {
  offerId: number;
  products: ProductOfferItem[];
}

export class ProductOfferParser implements PacketParser<ProductOffer> {
  flush(): void {}

  parse(reader: PacketReader): ProductOffer {
    const offerId = reader.readInt();
    reader.readString();
    reader.readBoolean();
    reader.readInt();
    reader.readInt();
    reader.readInt();
    reader.readBoolean();
    const productCount = reader.readInt();
    const products: ProductOfferItem[] = [];

    for (let index = 0; index < productCount; index++) {
      const productType = reader.readString();
      if (productType === "b") {
        reader.readString();
        continue;
      }
      const furniClassId = reader.readInt();
      reader.readString();
      const amount = reader.readInt();
      const limited = reader.readBoolean();
      if (limited) {
        reader.readInt();
        reader.readInt();
      }
      products.push({ furniClassId, productCount: amount });
    }

    reader.readInt();
    reader.readBoolean();
    reader.readBoolean();
    reader.readString();
    return { offerId, products };
  }
}
