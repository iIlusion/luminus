declare const GM_getValue: undefined | (<T>(name: string, defaultValue: T) => T);
declare const GM_setValue: undefined | ((name: string, value: unknown) => void);

const SHARED_PREFIX = "luminus.shared:";
const MISSING = "__luminus_pref_missing__";

export function readPref<T>(key: string, def: T): T {
  try {
    const stored = localStorage.getItem(`${SHARED_PREFIX}${key}`);
    if (stored !== null) return JSON.parse(stored) as T;
  } catch {}

  const legacy = typeof GM_getValue === "function" ? GM_getValue<unknown>(key, MISSING) : MISSING;
  if (legacy === MISSING) return def;
  writeShared(key, legacy);
  return legacy as T;
}

export function writePref(key: string, val: unknown): void {
  writeShared(key, val);
  if (typeof GM_setValue === "function") GM_setValue(key, val);
}

function writeShared(key: string, val: unknown): void {
  try {
    localStorage.setItem(`${SHARED_PREFIX}${key}`, JSON.stringify(val));
  } catch {}
}
