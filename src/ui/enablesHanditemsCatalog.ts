import { readPref, writePref } from "../util/prefs";
import enableNames from "../data/enableNames.json";
import handitemNames from "../data/handitemNames.json";
import type { CatalogThumbKind } from "./catalogThumbManifest";

export type EnableEntry = {
  enable: number;
  lib?: string;
  name: string;
};

export type HanditemEntry = {
  handitem: number;
  name: string;
};

export type CatalogEntry = EnableEntry | HanditemEntry;

const CATALOGS: Record<CatalogThumbKind, readonly CatalogEntry[]> = {
  enable: enableNames as EnableEntry[],
  handitem: handitemNames as HanditemEntry[],
};

const FAVORITE_KEYS: Record<CatalogThumbKind, string> = {
  enable: "luminus.enables.favorites",
  handitem: "luminus.handitems.favorites",
};

const REMOVE_ENTRIES: Record<CatalogThumbKind, CatalogEntry> = {
  enable: { enable: 0, name: "Remover efeito" },
  handitem: { handitem: 0, name: "Remover handitem" },
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getCatalogEntries(kind: CatalogThumbKind): readonly CatalogEntry[] {
  return CATALOGS[kind];
}

export function getCatalogFavorites(kind: CatalogThumbKind): number[] {
  const raw = readPref<number[]>(FAVORITE_KEYS[kind], []);
  return Array.isArray(raw) ? raw.filter((id) => typeof id === "number") : [];
}

export function toggleCatalogFavorite(kind: CatalogThumbKind, id: number): number[] {
  const current = getCatalogFavorites(kind);
  const next = current.includes(id)
    ? current.filter((favoriteId) => favoriteId !== id)
    : [...current, id];
  writePref(FAVORITE_KEYS[kind], next);
  return next;
}

export function buildCatalogList(
  kind: CatalogThumbKind,
  search: string,
  favorites: readonly number[],
): CatalogEntry[] {
  const wanted = normalizeSearch(search);
  const filtered = CATALOGS[kind].filter((entry) => {
    const id = entryId(entry);
    return (
      !wanted
      || normalizeSearch(entry.name).includes(wanted)
      || String(id).includes(wanted)
    );
  });
  const byId = new Map(filtered.map((entry) => [entryId(entry), entry]));
  const favoriteIds = new Set(favorites.filter((id) => byId.has(id)));

  return [
    REMOVE_ENTRIES[kind],
    ...favorites.flatMap((id) => {
      const entry = byId.get(id);
      return entry ? [entry] : [];
    }),
    ...filtered.filter((entry) => !favoriteIds.has(entryId(entry))),
  ];
}

export function entryId(entry: CatalogEntry): number {
  return "enable" in entry ? entry.enable : entry.handitem;
}

export function entryCommand(entry: CatalogEntry): string {
  return "enable" in entry
    ? `:enable ${entry.enable}`
    : `:handitem ${entry.handitem}`;
}
