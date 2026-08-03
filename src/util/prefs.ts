declare const GM_getValue: undefined | (<T>(name: string, defaultValue: T) => T);
declare const GM_setValue: undefined | ((name: string, value: unknown) => void);

const SHARED_PREFIX = "luminus.shared:";
const SETTINGS_KEY = "luminus.settings.v1";
const MIGRATION_KEY = "luminus.settings.migration.v1";
const SETTINGS_VERSION = 1;
const MISSING = Symbol("luminus-pref-missing");

type SettingsEnvelope = {
  version: number;
  values: Record<string, unknown>;
};

type MigrationState = {
  version: number;
  status: "complete";
  migrated: number;
  at: number;
};

// Large datasets keep their dedicated storage and lifetime policies.
const SEPARATE_KEYS = new Set([
  
  "luminus.links.store",
  "luminus.links.opened",
  "luminus.links.favorites",
  "luminus.logs",
  "luminus.player.muteAll.manual",
  "luminus.player.muteAll.whitelist",
]);

let settings: SettingsEnvelope | null = null;
let flushTimer = 0;

function usesSettingsEnvelope(key: string): boolean {
  return key.startsWith("luminus.") && !SEPARATE_KEYS.has(key) && key !== SETTINGS_KEY && key !== MIGRATION_KEY;
}

function readShared(key: string): unknown | typeof MISSING {
  try {
    const stored = localStorage.getItem(`${SHARED_PREFIX}${key}`);
    return stored === null ? MISSING : JSON.parse(stored);
  } catch {
    return MISSING;
  }
}

function writeShared(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(`${SHARED_PREFIX}${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function writeBoth(key: string, value: unknown): boolean {
  const stored = writeShared(key, value);
  try {
    if (typeof GM_setValue === "function") GM_setValue(key, value);
  } catch {}
  return stored;
}

function readLegacy(key: string): unknown | typeof MISSING {
  const shared = readShared(key);
  if (shared !== MISSING) return shared;
  try {
    return typeof GM_getValue === "function" ? GM_getValue<unknown>(key, MISSING) : MISSING;
  } catch {
    return MISSING;
  }
}

function writeSettingsNow(): boolean {
  return writeBoth(SETTINGS_KEY, settings);
}

function flushSettings(): void {
  if (!settings) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = 0;
  writeSettingsNow();
}

function scheduleSettingsFlush(): void {
  if (flushTimer) return;
  flushTimer = window.setTimeout(flushSettings, 150);
}

function migrateLegacySettings(): void {
  const state = readShared(MIGRATION_KEY) as Partial<MigrationState> | typeof MISSING;
  if (
    state !== MISSING
    && typeof state === "object"
    && state !== null
    && state.version === SETTINGS_VERSION
    && state.status === "complete"
  ) return;

  const legacyKeys: string[] = [];
  let migrated = 0;
  for (let index = 0; index < localStorage.length; index++) {
    const fullKey = localStorage.key(index);
    if (!fullKey?.startsWith(SHARED_PREFIX)) continue;
    const key = fullKey.slice(SHARED_PREFIX.length);
    if (!usesSettingsEnvelope(key)) continue;
    const value = readShared(key);
    if (value === MISSING) continue;
    if (!Object.prototype.hasOwnProperty.call(settings!.values, key)) {
      settings!.values[key] = value;
      migrated++;
    }
    legacyKeys.push(fullKey);
  }

  if (legacyKeys.length && writeSettingsNow()) {
    for (const fullKey of legacyKeys) localStorage.removeItem(fullKey);
  }
  writeShared(MIGRATION_KEY, {
    version: SETTINGS_VERSION,
    status: "complete",
    migrated,
    at: Date.now(),
  } satisfies MigrationState);
}

function getSettings(): SettingsEnvelope {
  if (settings) return settings;
  const stored = readShared(SETTINGS_KEY);
  settings = stored !== MISSING
    && typeof stored === "object"
    && stored !== null
    && !Array.isArray(stored)
    && typeof (stored as Partial<SettingsEnvelope>).values === "object"
    && (stored as Partial<SettingsEnvelope>).values !== null
    ? { version: SETTINGS_VERSION, values: { ...(stored as SettingsEnvelope).values } }
    : { version: SETTINGS_VERSION, values: {} };
  migrateLegacySettings();
  return settings;
}

export function readPref<T>(key: string, def: T): T {
  if (!usesSettingsEnvelope(key)) {
    const legacy = readLegacy(key);
    return legacy === MISSING ? def : legacy as T;
  }

  const current = getSettings().values;
  if (Object.prototype.hasOwnProperty.call(current, key)) return current[key] as T;
  const legacy = readLegacy(key);
  if (legacy === MISSING) return def;
  current[key] = legacy;
  scheduleSettingsFlush();
  return legacy as T;
}

export function writePref(key: string, value: unknown): void {
  if (!usesSettingsEnvelope(key)) {
    writeBoth(key, value);
    return;
  }
  getSettings().values[key] = value;
  scheduleSettingsFlush();
}

if (typeof window !== "undefined") window.addEventListener("pagehide", flushSettings);
