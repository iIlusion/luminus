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
const TYPE_INDEX = "byType";
const LEGACY_MIGRATED = "legacyMigrated";

const legacyEntries = readPref<LogEntry[]>("luminus.logs", []);
let sessionEntries: LogEntry[] = [];
let historyCache: LogEntry[] | null = null;
let historyLoad: Promise<LogEntry[]> | null = null;
let chatHistoryCache: LogEntry[] | null = null;
let chatHistoryLoad: Promise<LogEntry[]> | null = null;
let writeQueue = Promise.resolve();
let database: Promise<IDBDatabase> | null = null;
const listeners = new Set<() => void>();
const eventListeners = new Set<(event: LogChange) => void>();

export type LogChange =
  | { type: "add"; entry: LogEntry }
  | { type: "bulk"; entries: LogEntry[] }
  | { type: "remove"; entries: LogEntry[] }
  | { type: "clear" };

export function addLog(entry: LogEntry, options?: { persist?: boolean }): void {
  const normalized = normalizeLogEntry(entry);
  sessionEntries = [normalized, ...sessionEntries];
  if (historyCache) historyCache = [normalized, ...historyCache];
  if (chatHistoryCache && isChatEntry(normalized)) chatHistoryCache = [normalized, ...chatHistoryCache];
  notify();
  emit({ type: "add", entry: normalized });

  if (options?.persist === false) return;

  writeQueue = writeQueue
    .then(async () => addStored(await getDatabase(), normalized))
    .catch(error => console.warn("[Luminus] Não foi possível salvar o log:", error));
}

/**
 * Inject many chat logs in one shot (memory only by default).
 * Emits a single `bulk` change so the workspace can rebuild once.
 */
export function addLogsBulk(entries: LogEntry[], options?: { persist?: boolean }): LogEntry[] {
  if (!entries.length) return [];
  const normalized = entries.map(entry => normalizeLogEntry(entry));
  // Newest-first caches: prepend in reverse so final order matches input chronology end.
  const newestFirst = [...normalized].reverse();
  sessionEntries = [...newestFirst, ...sessionEntries];
  if (historyCache) historyCache = [...newestFirst, ...historyCache];
  if (chatHistoryCache) {
    const chat = newestFirst.filter(isChatEntry);
    chatHistoryCache = [...chat, ...chatHistoryCache];
  }
  notify();
  emit({ type: "bulk", entries: normalized });

  if (options?.persist === false) return normalized;

  writeQueue = writeQueue
    .then(async () => {
      const db = await getDatabase();
      for (const entry of normalized) await addStored(db, entry);
    })
    .catch(error => console.warn("[Luminus] Não foi possível salvar logs em lote:", error));

  return normalized;
}

export function getLogs(): LogEntry[] {
  return historyCache ?? sessionEntries;
}

export function getSessionLogs(): LogEntry[] {
  return sessionEntries;
}

export function getChatLogs(): LogEntry[] {
  return chatHistoryCache ?? sessionEntries.filter(isChatEntry);
}

export function loadChatLogs(): Promise<LogEntry[]> {
  if (chatHistoryCache) return Promise.resolve(chatHistoryCache);
  if (chatHistoryLoad) return chatHistoryLoad;

  chatHistoryLoad = (async () => {
    try {
      await writeQueue;
      const stored = await readStoredChat(await getDatabase());
      chatHistoryCache = mergeLogs(sessionEntries.filter(isChatEntry), stored);
    } catch (error) {
      console.warn("[Luminus] Nao foi possivel carregar o historico de chat:", error);
      chatHistoryCache = mergeLogs(
        sessionEntries.filter(isChatEntry),
        legacyEntries.filter(isChatEntry),
      );
    }
    notify();
    return chatHistoryCache;
  })().finally(() => { chatHistoryLoad = null; });

  return chatHistoryLoad;
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
  chatHistoryCache = [];
  writePref("luminus.logs", []);
  notify();
  emit({ type: "clear" });

  writeQueue = writeQueue
    .then(async () => clearStored(await getDatabase()))
    .catch(error => console.warn("[Luminus] Não foi possível limpar os logs:", error));
}

export function removeLogs(predicate: (entry: LogEntry) => boolean): void {
  const removed = (chatHistoryCache ?? sessionEntries.filter(isChatEntry)).filter(predicate);
  sessionEntries = sessionEntries.filter(entry => !predicate(entry));
  if (historyCache) historyCache = historyCache.filter(entry => !predicate(entry));
  if (chatHistoryCache) chatHistoryCache = chatHistoryCache.filter(entry => !predicate(entry));
  notify();
  if (removed.length) emit({ type: "remove", entries: removed });

  writeQueue = writeQueue
    .then(async () => removeStored(await getDatabase(), predicate))
    .catch(error => console.warn("[Luminus] Nao foi possivel apagar os logs:", error));
}

export function onLogsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onLogChange(fn: (event: LogChange) => void): () => void {
  eventListeners.add(fn);
  return () => eventListeners.delete(fn);
}

function notify(): void {
  listeners.forEach(fn => fn());
}

function emit(event: LogChange): void {
  eventListeners.forEach(fn => fn(event));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      const entries = db.objectStoreNames.contains(ENTRY_STORE)
        ? request.transaction!.objectStore(ENTRY_STORE)
        : db.createObjectStore(ENTRY_STORE, { autoIncrement: true });
      if (!entries.indexNames.contains(TYPE_INDEX)) entries.createIndex(TYPE_INDEX, "type");
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

function removeStored(db: IDBDatabase, predicate: (entry: LogEntry) => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRY_STORE, "readwrite");
    const request = transaction.objectStore(ENTRY_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (predicate(normalizeLogEntry(cursor.value as LogEntry))) cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
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

function readStoredChat(db: IDBDatabase): Promise<LogEntry[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ENTRY_STORE);
    const index = transaction.objectStore(ENTRY_STORE).index(TYPE_INDEX);
    const whispers = index.getAll(IDBKeyRange.only("whisper"));
    const clicks = index.getAll(IDBKeyRange.only("click"));
    transaction.oncomplete = () => resolve(
      [...whispers.result, ...clicks.result]
        .map(entry => normalizeLogEntry(entry as LogEntry))
        .sort((a, b) => b.ts - a.ts),
    );
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function isChatEntry(entry: LogEntry): boolean {
  return entry.type === "whisper" || entry.type === "click";
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
