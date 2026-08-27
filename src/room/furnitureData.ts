import { gmFetch } from "../util/gmFetch";

export interface FurnitureDataEntry {
  id: number;
  purchaseOfferId: number;
  className: string;
  name: string;
  type: "floor" | "wall";
}

type FurnitureDataResponse = {
  roomitemtypes?: { furnitype?: Array<Record<string, unknown>> };
  wallitemtypes?: { furnitype?: Array<Record<string, unknown>> };
};

const DEFAULT_FURNITURE_DATA_URL = "https://images.habblet.city/habblet-asset-bundles/gamedata/habblet_furni.json?v=1773";

export type FurnitureDataApi = {
  load(url?: string): Promise<void>;
  isLoaded(): boolean;
  getById(id: number): FurnitureDataEntry | null;
  getByClassName(className: string): FurnitureDataEntry | null;
  getByPurchaseOfferId(id: number): FurnitureDataEntry | null;
  resolveId(id: number): number;
  resolvePurchaseOfferId(id: number): number;
};

export function createFurnitureDataApi(): FurnitureDataApi {
  const byId = new Map<number, FurnitureDataEntry>();
  const byClassName = new Map<string, FurnitureDataEntry>();
  const byPurchaseOfferId = new Map<number, FurnitureDataEntry>();
  let loaded = false;
  let loading: Promise<void> | null = null;

  const readEntries = (items: Array<Record<string, unknown>> | undefined, type: FurnitureDataEntry["type"]): void => {
    for (const item of items ?? []) {
      const id = Number(item.id);
      const purchaseOfferId = Number(item.offerid ?? item.id);
      if (!Number.isFinite(id) || !Number.isFinite(purchaseOfferId)) continue;
      const entry: FurnitureDataEntry = {
        id,
        purchaseOfferId,
        className: String(item.classname ?? ""),
        name: String(item.name ?? item.localizedname ?? ""),
        type,
      };
      byId.set(id, entry);
      if (entry.className && !byClassName.has(entry.className)) byClassName.set(entry.className, entry);
      byPurchaseOfferId.set(purchaseOfferId, entry);
    }
  };

  const api: FurnitureDataApi = {
    async load(url = DEFAULT_FURNITURE_DATA_URL): Promise<void> {
      if (loaded) return;
      if (loading) return loading;
      loading = gmFetch<FurnitureDataResponse>(url).then(data => {
        readEntries(data.roomitemtypes?.furnitype, "floor");
        readEntries(data.wallitemtypes?.furnitype, "wall");
        loaded = true;
      }).finally(() => {
        loading = null;
      });
      return loading;
    },
    isLoaded: () => loaded,
    getById: id => byId.get(id) ?? null,
    getByClassName: className => byClassName.get(className) ?? null,
    getByPurchaseOfferId: id => byPurchaseOfferId.get(id) ?? null,
    resolveId: id => byId.get(id)?.id ?? byPurchaseOfferId.get(id)?.id ?? id,
    resolvePurchaseOfferId: id => byId.get(id)?.purchaseOfferId ?? byPurchaseOfferId.get(id)?.purchaseOfferId ?? id,
  };
  return api;
}
