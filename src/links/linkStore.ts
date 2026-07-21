import { readPref, writePref } from "../util/prefs";

export interface LinkRecord {
  link: string;
  clicks: number;
  lastClickedAt: number;
  gender?: string;
  blocked?: boolean;
}

// name -> known links, most recently clicked first
export type LinkStore = Record<string, LinkRecord[]>;

export function normalizeGender(value?: string): "M" | "F" | undefined {
  const gender = value?.trim().toUpperCase();
  if (gender === "M" || gender === "MALE" || gender === "MASCULINO") return "M";
  if (gender === "F" || gender === "FEMALE" || gender === "FEMININO") return "F";
  return undefined;
}

export function normalizePersonName(value: string): string {
  return value
    .replace(/\uFFFD+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getGenderFor(name: string): "M" | "F" | undefined {
  return (store[normalizePersonName(name)] ?? []).map(record => normalizeGender(record.gender)).find(Boolean);
}

// Older versions stored plain string[] — upgrade in place so existing click history survives.
function migrate(raw: Record<string, unknown[]>): LinkStore {
  const out: LinkStore = {};
  for (const [name, links] of Object.entries(raw)) {
    const legacyName = name.includes("\uFFFD") ? name.slice(name.lastIndexOf("\uFFFD") + 1) : name;
    const cleanName = normalizePersonName(legacyName);
    const migrated = links.map(l => {
      const record = typeof l === "string" ? { link: l, clicks: 1, lastClickedAt: Date.now() } : (l as LinkRecord);
      const gender = normalizeGender(record.gender);
      return { ...record, ...(gender ? { gender } : {}) };
    });
    out[cleanName] = [...(out[cleanName] ?? []), ...migrated];
  }
  return out;
}

let store: LinkStore = migrate(readPref<Record<string, unknown[]>>("luminus.links.store", {}));
let favorites: Set<string> = new Set(readPref<string[]>("luminus.links.favorites", []));
let saveGender = readPref("luminus.links.saveGender", true);
let opened: Set<string> = new Set([
  ...readPref<string[]>("luminus.links.opened", []),
  ...Object.entries(store)
    .filter(([, links]) => links.some(record => record.clicks > 0))
    .map(([name]) => name)
]);
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach(fn => fn());
}

export function onLinksChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAllLinks(): LinkStore {
  return store;
}

export function getLinksFor(name: string): LinkRecord[] {
  return store[normalizePersonName(name)] ?? [];
}

export function hasLinks(name: string): boolean {
  return getLinksFor(name).length > 0;
}

export function hasOpenedLink(name: string): boolean {
  return opened.has(normalizePersonName(name));
}

export function getSaveGender(): boolean {
  return saveGender;
}

export function setSaveGender(value: boolean): void {
  saveGender = value;
  writePref("luminus.links.saveGender", value);
}

export function hasBlockedLink(name: string): boolean {
  return getLinksFor(name).some(record => record.blocked === true);
}

export function isLinkBlocked(name: string, link: string): boolean {
  return getLinksFor(name).some(record => record.link === link && record.blocked === true);
}

export function toggleLinkBlocked(name: string, link: string): void {
  const records = store[name] ?? [];
  store = {
    ...store,
    [name]: records.map(record => record.link === link ? { ...record, blocked: !record.blocked } : record)
  };
  writePref("luminus.links.store", store);
  notify();
}

export function rememberLink(name: string, link: string, gender?: string): void {
  name = normalizePersonName(name);
  const legacyName = Object.keys(store).find(key =>
    key !== name && key.endsWith(` ${name}`) && /^\d+\s+[A-Z0-9]+\s+/i.test(key)
  );
  if (legacyName) {
    const merged = [...(store[name] ?? []), ...(store[legacyName] ?? [])];
    store = { ...store, [name]: merged.filter((record, index, all) => all.findIndex(item => item.link === record.link) === index) };
    delete store[legacyName];
    if (opened.delete(legacyName)) opened.add(name);
    writePref("luminus.links.store", store);
    writePref("luminus.links.opened", [...opened]);
  }
  const existing = store[name] ?? [];
  const current = existing.find(record => record.link === link);
  if (current) {
    const cleanGender = normalizeGender(gender);
    if (saveGender && cleanGender && current.gender !== cleanGender) {
      current.gender = cleanGender;
      writePref("luminus.links.store", store);
      notify();
    }
    return;
  }

  store = { ...store, [name]: [{ link, clicks: 0, lastClickedAt: 0, ...(saveGender && gender ? { gender } : {}) }, ...existing] };
  writePref("luminus.links.store", store);
  notify();
}

export function recordLink(name: string, link: string, gender?: string): void {
  name = normalizePersonName(name);
  const existing = store[name] ?? [];
  const prev = existing.find(r => r.link === link);
  const rec: LinkRecord = {
    ...prev,
    link,
    clicks: (prev?.clicks ?? 0) + 1,
    lastClickedAt: Date.now(),
    ...(saveGender && normalizeGender(gender) ? { gender: normalizeGender(gender) } : {})
  };
  store = { ...store, [name]: [rec, ...existing.filter(r => r.link !== link)] };
  opened.add(name);
  writePref("luminus.links.store", store);
  writePref("luminus.links.opened", [...opened]);
  notify();
}

export function removeLink(name: string, link: string): void {
  const remaining = (store[name] ?? []).filter(r => r.link !== link);
  const next = { ...store };
  if (remaining.length) next[name] = remaining;
  else delete next[name];
  store = next;
  if (!remaining.length) opened.delete(name);
  writePref("luminus.links.store", store);
  writePref("luminus.links.opened", [...opened]);
  notify();
}

export function removePerson(name: string): void {
  const next = { ...store };
  delete next[name];
  store = next;
  favorites.delete(name);
  opened.delete(name);
  writePref("luminus.links.store", store);
  writePref("luminus.links.favorites", [...favorites]);
  writePref("luminus.links.opened", [...opened]);
  notify();
}

export function clearAllLinks(): void {
  store = {};
  opened.clear();
  writePref("luminus.links.store", store);
  writePref("luminus.links.opened", []);
  notify();
}

export function isFavorite(name: string): boolean {
  return favorites.has(name);
}

export function toggleFavorite(name: string): void {
  if (favorites.has(name)) favorites.delete(name);
  else favorites.add(name);
  writePref("luminus.links.favorites", [...favorites]);
  notify();
}

export function fmtLastClicked(rec: LinkRecord): string {
  if (rec.lastClickedAt <= 0) return "Ainda não aberto";
  const d = new Date(rec.lastClickedAt);
  const date = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${date} ${time}`;
}

// Shared by the LinkWindow and the infostand's link menu so click count/last-click date
// read identically in both places.
export function fmtClickInfo(rec: LinkRecord): string {
  return `${rec.clicks}× · ${fmtLastClicked(rec)}`;
}
