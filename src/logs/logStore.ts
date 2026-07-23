import { readPref, writePref } from "../util/prefs";
import { normalizeLogEntry } from "./whisperThreads";

export interface LogEntry {
  ts: number;
  type: "click" | "whisper" | "friend" | "room_enter" | "room_leave";
  actor: string;
  target?: string;
  figure?: string;
  message: string;
  duration?: number;
  groupMembers?: string[];
}

const DB_NAME = "luminus.logs";
const ENTRY_STORE = "entries";
const META_STORE = "meta";
const LEGACY_MIGRATED = "legacyMigrated";

const legacyEntries = readPref<LogEntry[]>("luminus.logs", []);
let sessionEntries: LogEntry[] = [];
let historyCache: LogEntry[] | null = null;
let historyLoad: Promise<LogEntry[]> | null = null;
let writeQueue = Promise.resolve();
let database: Promise<IDBDatabase> | null = null;
const listeners = new Set<() => void>();

export function addLog(entry: LogEntry): void {
  const normalized = normalizeLogEntry(entry);
  sessionEntries = [normalized, ...sessionEntries];
  if (historyCache) historyCache = [normalized, ...historyCache];
  notify();

  writeQueue = writeQueue
    .then(async () => addStored(await getDatabase(), normalized))
    .catch(error => console.warn("[Luminus] Não foi possível salvar o log:", error));
}

export function getLogs(): LogEntry[] {
  return historyCache ?? sessionEntries;
}

export function getSessionLogs(): LogEntry[] {
  return sessionEntries;
}

export function loadLogs(): Promise<LogEntry[]> {
  if (historyCache) return Promise.resolve(historyCache);
  if (historyLoad) return historyLoad;

  historyLoad = (async () => {
    try {
      await writeQueue;
      const stored = await readStored(await getDatabase());
      historyCache = mergeLogs(sessionEntries, stored);
    } catch (error) {
      console.warn("[Luminus] Não foi possível carregar os logs:", error);
      historyCache = mergeLogs(sessionEntries, legacyEntries);
    }
    notify();
    return historyCache;
  })().finally(() => { historyLoad = null; });

  return historyLoad;
}

export function clearLogs(): void {
  sessionEntries = [];
  historyCache = [];
  writePref("luminus.logs", []);
  notify();

  writeQueue = writeQueue
    .then(async () => clearStored(await getDatabase()))
    .catch(error => console.warn("[Luminus] Não foi possível limpar os logs:", error));
}

export function removeLogs(predicate: (entry: LogEntry) => boolean): void {
  sessionEntries = sessionEntries.filter(entry => !predicate(entry));
  if (historyCache) historyCache = historyCache.filter(entry => !predicate(entry));
  notify();

  writeQueue = writeQueue
    .then(async () => rewriteStored(await getDatabase(), entry => !predicate(entry)))
    .catch(error => console.warn("[Luminus] Nao foi possivel apagar os logs:", error));
}

export function onLogsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  listeners.forEach(fn => fn());
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ENTRY_STORE)) db.createObjectStore(ENTRY_STORE, { autoIncrement: true });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = openDatabase().then(async db => {
      await migrateLegacy(db);
      return db;
    });
  }
  return database;
}

function migrateLegacy(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ENTRY_STORE, META_STORE], "readwrite");
    const entries = transaction.objectStore(ENTRY_STORE);
    const meta = transaction.objectStore(META_STORE);
    const migrated = meta.get(LEGACY_MIGRATED);

    migrated.onsuccess = () => {
      if (migrated.result) return;
      for (const entry of legacyEntries) entries.add(normalizeLogEntry(entry));
      meta.put(true, LEGACY_MIGRATED);
    };
    transaction.oncomplete = () => {
      if (legacyEntries.length) writePref("luminus.logs", []);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function addStored(db: IDBDatabase, entry: LogEntry): Promise<void> {
  return runTransaction(db, "readwrite", store => { store.add(entry); });
}

function clearStored(db: IDBDatabase): Promise<void> {
  return runTransaction(db, "readwrite", store => { store.clear(); });
}

async function rewriteStored(db: IDBDatabase, keep: (entry: LogEntry) => boolean): Promise<void> {
  const entries = (await readStored(db)).filter(keep);
  await runTransaction(db, "readwrite", store => {
    store.clear();
    for (const entry of entries) store.add(entry);
  });
}

function runTransaction(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRY_STORE, mode);
    run(transaction.objectStore(ENTRY_STORE));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function readStored(db: IDBDatabase): Promise<LogEntry[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(ENTRY_STORE).objectStore(ENTRY_STORE).getAll();
    request.onsuccess = () => resolve((request.result as LogEntry[]).map(normalizeLogEntry).sort((a, b) => b.ts - a.ts));
    request.onerror = () => reject(request.error);
  });
}

function mergeLogs(first: LogEntry[], second: LogEntry[]): LogEntry[] {
  const seen = new Set<string>();
  return [...first, ...second]
    .map(normalizeLogEntry)
    .sort((a, b) => b.ts - a.ts)
    .filter(entry => {
      const key = `${entry.ts}\u0000${entry.type}\u0000${entry.actor}\u0000${entry.target ?? ""}\u0000${entry.message}\u0000${entry.groupMembers?.join(",") ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
