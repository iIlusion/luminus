import { gmFetch } from "../util/gmFetch";
import { readPref, writePref } from "../util/prefs";

/** jsDelivr mirrors the public GitHub tree after push to `dev`. */
export const CATALOG_BASE =
  "https://cdn.jsdelivr.net/gh/iIlusion/luminus@dev/assets";

export type EnableEntry = {
  enable: number;
  lib?: string;
  name: string;
  img: string;
  isFavorite?: boolean;
};

export type HanditemEntry = {
  handitem: number;
  name: string;
  img: string;
  isFavorite?: boolean;
};

export type CatalogEntry = EnableEntry | HanditemEntry;

const FAV_ENABLES_KEY = "luminus.enables.favorites";
const FAV_HANDITEMS_KEY = "luminus.handitems.favorites";

let enablesCache: EnableEntry[] | null = null;
let handitemsCache: HanditemEntry[] | null = null;
let enablesPromise: Promise<EnableEntry[]> | null = null;
let handitemsPromise: Promise<HanditemEntry[]> | null = null;

function catalogUrl(file: "enables.json" | "handitems.json"): string {
  return `${CATALOG_BASE}/${file}`;
}

export async function getEnables(): Promise<EnableEntry[]> {
  if (enablesCache) return enablesCache;
  if (!enablesPromise) {
    enablesPromise = gmFetch<EnableEntry[]>(catalogUrl("enables.json"))
      .then((data) => {
        enablesCache = Array.isArray(data) ? data : [];
        return enablesCache;
      })
      .catch((err) => {
        enablesPromise = null;
        throw err instanceof Error ? err : new Error(String(err));
      });
  }
  return enablesPromise;
}

export async function getHanditems(): Promise<HanditemEntry[]> {
  if (handitemsCache) return handitemsCache;
  if (!handitemsPromise) {
    handitemsPromise = gmFetch<HanditemEntry[]>(catalogUrl("handitems.json"))
      .then((data) => {
        handitemsCache = Array.isArray(data) ? data : [];
        return handitemsCache;
      })
      .catch((err) => {
        handitemsPromise = null;
        throw err instanceof Error ? err : new Error(String(err));
      });
  }
  return handitemsPromise;
}

export function getFavoriteEnables(): number[] {
  const raw = readPref<number[]>(FAV_ENABLES_KEY, []);
  return Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : [];
}

export function getFavoriteHanditems(): number[] {
  const raw = readPref<number[]>(FAV_HANDITEMS_KEY, []);
  return Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : [];
}

export function setFavoriteEnables(ids: number[]): void {
  writePref(FAV_ENABLES_KEY, ids);
}

export function setFavoriteHanditems(ids: number[]): void {
  writePref(FAV_HANDITEMS_KEY, ids);
}

export function toggleFavoriteEnable(id: number): number[] {
  const cur = getFavoriteEnables();
  const next = cur.includes(id) ? cur.filter((n) => n !== id) : [...cur, id];
  setFavoriteEnables(next);
  return next;
}

export function toggleFavoriteHanditem(id: number): number[] {
  const cur = getFavoriteHanditems();
  const next = cur.includes(id) ? cur.filter((n) => n !== id) : [...cur, id];
  setFavoriteHanditems(next);
  return next;
}

/** Minimal empty preview for the synthetic "remove" row (id 0). */
export const REMOVE_PLACEHOLDER_IMG =
  "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";

export function entryId(entry: CatalogEntry): number {
  return "enable" in entry && entry.enable !== undefined
    ? entry.enable
    : (entry as HanditemEntry).handitem;
}

export function entryCommand(entry: CatalogEntry): string {
  if ("enable" in entry && entry.enable !== undefined) {
    return `:enable ${entry.enable}`;
  }
  return `:handitem ${(entry as HanditemEntry).handitem}`;
}
