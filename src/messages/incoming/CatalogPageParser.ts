import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface CatalogProduct {
  productType: string;
  furniClassId: number;
  extraParam: string;
  productCount: number;
  uniqueLimitedItem: boolean;
  uniqueLimitedItemSeriesSize: number;
  uniqueLimitedItemsLeft: number;
}

export interface CatalogOffer {
  offerId: number;
  localizationId: string;
  rent: boolean;
  priceCredits: number;
  priceActivityPoints: number;
  priceActivityPointsType: number;
  giftable: boolean;
  products: CatalogProduct[];
  clubLevel: number;
  bundlePurchaseAllowed: boolean;
  isPet: boolean;
  previewImage: string;
}

export interface CatalogPage {
  pageId: number;
  catalogType: string;
  layoutCode: string;
  images: string[];
  texts: string[];
  offers: CatalogOffer[];
  offerId: number;
  acceptSeasonCurrencyAsCredits: boolean;
}

function readProduct(reader: PacketReader): CatalogProduct {
  const productType = reader.readString();
  if (productType === "b") {
    return {
      productType,
      furniClassId: -1,
      extraParam: reader.readString(),
      productCount: 1,
      uniqueLimitedItem: false,
      uniqueLimitedItemSeriesSize: 0,
      uniqueLimitedItemsLeft: 0,
    };
  }
  const furniClassId = reader.readInt();
  const extraParam = reader.readString();
  const productCount = reader.readInt();
  const uniqueLimitedItem = reader.readBoolean();
  const uniqueLimitedItemSeriesSize = uniqueLimitedItem ? reader.readInt() : 0;
  const uniqueLimitedItemsLeft = uniqueLimitedItem ? reader.readInt() : 0;
  return {
    productType,
    furniClassId,
    extraParam,
    productCount,
    uniqueLimitedItem,
    uniqueLimitedItemSeriesSize,
    uniqueLimitedItemsLeft,
  };
}

function readOffer(reader: PacketReader): CatalogOffer {
  const offerId = reader.readInt();
  const localizationId = reader.readString();
  const rent = reader.readBoolean();
  const priceCredits = reader.readInt();
  const priceActivityPoints = reader.readInt();
  const priceActivityPointsType = reader.readInt();
  const giftable = reader.readBoolean();
  const productCount = reader.readInt();
  const products: CatalogProduct[] = [];
  for (let index = 0; index < productCount; index++) products.push(readProduct(reader));
  return {
    offerId,
    localizationId,
    rent,
    priceCredits,
    priceActivityPoints,
    priceActivityPointsType,
    giftable,
    products,
    clubLevel: reader.readInt(),
    bundlePurchaseAllowed: reader.readBoolean(),
    isPet: reader.readBoolean(),
    previewImage: reader.readString(),
  };
}

export function limitedStockOf(offer: CatalogOffer): CatalogProduct | null {
  return offer.products.find(product => product.uniqueLimitedItem) ?? null;
}

export function firstOfferWithStock(offers: CatalogOffer[]): { offer: CatalogOffer; product: CatalogProduct } | null {
  for (const offer of offers) {
    const product = offer.products.find(item => item.uniqueLimitedItem && item.uniqueLimitedItemsLeft >= 1);
    if (product) return { offer, product };
  }
  return null;
}

export class CatalogPageParser implements PacketParser<CatalogPage> {
  flush(): void {}

  parse(reader: PacketReader): CatalogPage {
    const pageId = reader.readInt();
    const catalogType = reader.readString();
    const layoutCode = reader.readString();
    const imageCount = reader.readInt();
    const images: string[] = [];
    for (let index = 0; index < imageCount; index++) images.push(reader.readString());
    const textCount = reader.readInt();
    const texts: string[] = [];
    for (let index = 0; index < textCount; index++) texts.push(reader.readString());
    const offerCount = reader.readInt();
    const offers: CatalogOffer[] = [];
    for (let index = 0; index < offerCount; index++) offers.push(readOffer(reader));
    return {
      pageId,
      catalogType,
      layoutCode,
      images,
      texts,
      offers,
      offerId: reader.readInt(),
      acceptSeasonCurrencyAsCredits: reader.readBoolean(),
    };
  }
}
