import type { LuminusApi } from "../ws/api";
import {
  getChatLogs,
  loadChatLogs,
  onLogChange,
  type LogChange,
  type LogEntry,
} from "../logs/logStore";
import {
  createWhisperUserContact,
  type WhisperContact,
} from "../logs/whisperThreads";
import { readPref, writePref } from "../util/prefs";
import { applyWhisperActivity } from "./chatWorkspaceLogic";
import {
  buildChatContacts,
  createChatKeyResolver,
  getChatGroupKey,
  isChatEntryRouteVerified,
} from "./chatHistoryIndex";

const PREF_KEY = "luminus.chat.workspace.v1";
const STATE_VERSION = 4;

export type ChatVisibility = "open" | "closed" | "archived";

export interface ChatGeometry {
  left: number | null;
  top: number;
  width: number;
  height: number;
}

export interface ChatConversationState extends WhisperContact {
  visibility: ChatVisibility;
  pinned: boolean;
  customName?: string;
  figure?: string;
  openedAt: number;
  lastReadAt: number;
  unreadCount: number;
  manualUnread: boolean;
}

interface PersistedChatWorkspace {
  version: 4;
  initialized: boolean;
  selectedKey: string | null;
  geometry: ChatGeometry;
  conversations: Record<string, ChatConversationState>;
  localAccounts: string[];
}

export interface ChatWorkspaceSnapshot extends PersistedChatWorkspace {
  loading: boolean;
  /** Legacy combined counter (list or thread activity). Prefer list/thread snapshots. */
  revision: number;
  listRevision: number;
  threadRevision: number;
}

/** Sidebar / badge / geometry — does not tick on every live message of the open thread. */
export interface ChatListSnapshot {
  listRevision: number;
  loading: boolean;
  selectedKey: string | null;
  geometry: ChatGeometry;
  localAccounts: string[];
}

/** Active whisper thread content — ticks on appends to the selected conversation. */
export interface ChatThreadSnapshot {
  threadRevision: number;
  selectedKey: string | null;
  threadLength: number;
}

export interface ChatConversationView extends ChatConversationState {
  displayName: string;
  lastWhisper: LogEntry | null;
  messages: number;
}

const DEFAULT_GEOMETRY: ChatGeometry = {
  left: null,
  top: 74,
  width: 920,
  height: 600,
};

let needsConversationMigration = false;
let snapshot: ChatWorkspaceSnapshot = {
  ...readWorkspace(),
  loading: false,
  revision: 0,
  listRevision: 0,
  threadRevision: 0,
};
let listSnapshot: ChatListSnapshot = {
  listRevision: 0,
  loading: snapshot.loading,
  selectedKey: snapshot.selectedKey,
  geometry: snapshot.geometry,
  localAccounts: snapshot.localAccounts,
};
let threadSnapshot: ChatThreadSnapshot = {
  threadRevision: 0,
  selectedKey: snapshot.selectedKey,
  threadLength: 0,
};
let identity = "";
let started = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;
let windowOpen = false;
let activeKey: string | null = snapshot.selectedKey;
let threads = new Map<string, LogEntry[]>();
let aliases = new Map<string, string>();
let lastWhispers = new Map<string, LogEntry>();
const listeners = new Set<() => void>();
const listListeners = new Set<() => void>();
const threadListeners = new Set<() => void>();
/** Coalesce React notifications when many whispers arrive in the same turn. */
let listNotifyQueued = false;
let threadNotifyRaf = 0;
let threadNotifyTimer: ReturnType<typeof setTimeout> | null = null;
let lastThreadNotifyAt = 0;
/** Thread length at last UI flush — used to batch only when >1 msg arrived. */
let threadLengthAtLastNotify = 0;
/**
 * When 2+ whispers land before the next paint, wait this long so one commit
 * covers the burst. Single messages flush on the next rAF (low latency).
 */
const THREAD_BURST_MIN_MS = 100;
/** Throttle sidebar preview/unread refresh while the open thread is streaming. */
let listThrottleTimer: ReturnType<typeof setTimeout> | null = null;
let listThrottlePending = false;
const LIST_THROTTLE_MS = 280;
/** Avoid writing localStorage on every live whisper (was a major stream jank source). */
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 450;

export function startChatWorkspace(api: LuminusApi): () => void {
  if (started) return () => {};
  started = true;

  const refreshIdentity = () => {
    const next = api.myself?.username?.trim() ?? "";
    if (!next || sameName(next, identity)) return;
    if (identity) needsConversationMigration = true;
    identity = next;
    if (!isLocalChatAccount(next)) {
      needsConversationMigration = true;
      snapshot = {
        ...snapshot,
        localAccounts: uniqueNames([...snapshot.localAccounts, next]),
      };
      bumpAllRevisions();
      schedulePersist();
      scheduleListNotify();
    }
    loaded = false;
    void ensureChatWorkspaceLoaded();
  };

  refreshIdentity();
  const unsubs = [
    api.onIncoming(2725, () => queueMicrotask(refreshIdentity)),
    api.onIncoming(2031, () => queueMicrotask(refreshIdentity)),
    onLogChange(handleLogChange),
  ];
  const onFocus = () => markActiveReadIfVisible();
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    unsubs.forEach(unsub => unsub());
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
    started = false;
  };
}

/** @deprecated Prefer subscribeChatList / subscribeChatThread for perf-sensitive UI. */
export function subscribeChatWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  listListeners.add(listener);
  threadListeners.add(listener);
  return () => {
    listeners.delete(listener);
    listListeners.delete(listener);
    threadListeners.delete(listener);
  };
}

export function subscribeChatList(listener: () => void): () => void {
  listListeners.add(listener);
  return () => listListeners.delete(listener);
}

export function subscribeChatThread(listener: () => void): () => void {
  threadListeners.add(listener);
  return () => threadListeners.delete(listener);
}

export function getChatWorkspaceSnapshot(): ChatWorkspaceSnapshot {
  return snapshot;
}

export function getChatListSnapshot(): ChatListSnapshot {
  return listSnapshot;
}

export function getChatThreadSnapshot(): ChatThreadSnapshot {
  return threadSnapshot;
}

export function ensureChatWorkspaceLoaded(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  setSnapshot({ loading: true }, false);

  loadPromise = loadChatLogs()
    .then(logs => {
      rebuildIndex(logs);
      if (!snapshot.initialized) {
        snapshot = {
          ...snapshot,
          initialized: true,
          loading: false,
        };
        bumpAllRevisions();
        schedulePersist();
      } else {
        setSnapshot({ loading: false }, false);
      }
      loaded = true;
      scheduleListNotify();
      scheduleThreadNotify({ urgent: true });
    })
    .catch(error => {
      console.warn("[Luminus] Falha ao montar Chat Beta:", error);
      setSnapshot({ loading: false }, false);
    })
    .finally(() => { loadPromise = null; });

  return loadPromise;
}

export function getChatConversationViews(): ChatConversationView[] {
  return Object.values(snapshot.conversations).map(conversation => ({
    ...conversation,
    displayName: conversation.customName?.trim() || conversation.label,
    lastWhisper: lastWhispers.get(conversation.key) ?? null,
    messages: threads.get(conversation.key)?.length ?? 0,
  }));
}

export function getChatThread(key: string): LogEntry[] {
  return threads.get(key) ?? [];
}

export function isLocalChatAccount(name: string): boolean {
  return snapshot.localAccounts.some(account => sameName(account, name));
}

export function isLocalChatMessage(entry: LogEntry, conversation: WhisperContact): boolean {
  return isEntryMine(entry, conversation);
}

export function isUnverifiedChatMessage(entry: LogEntry): boolean {
  return !isChatEntryRouteVerified(entry, snapshot.localAccounts);
}

export function setChatWindowContext(open: boolean, selectedKey: string | null): void {
  windowOpen = open;
  activeKey = selectedKey;
  if (open && selectedKey) {
    selectChatConversation(selectedKey);
    markActiveReadIfVisible();
  }
}

export function selectChatConversation(key: string | null): void {
  activeKey = key;
  if (snapshot.selectedKey !== key) {
    setSnapshot({ selectedKey: key });
  } else {
    // Still refresh thread snapshot length when re-selecting.
    publishThreadSnapshot(key);
    scheduleThreadNotify({ urgent: true });
  }
  markActiveReadIfVisible();
}

export function openDirectConversation(name: string, figure?: string): string {
  const contact = createWhisperUserContact(name.trim());
  upsertConversation(contact, { visibility: "open", figure });
  selectChatConversation(contact.key);
  return contact.key;
}

export function openGroupConversation(members: string[], customName = ""): string {
  const roster = uniqueNames(members);
  const key = getChatGroupKey(roster);
  const contact: WhisperContact = {
    key,
    kind: "group",
    label: roster.filter(name => !sameName(name, identity)).join(", ") || "Grupo",
    recipient: "group",
    members: roster,
    historyKeys: [key],
  };
  upsertConversation(contact, {
    visibility: "open",
    customName: customName.trim() || undefined,
  });
  aliases.set(key, key);
  if (!threads.has(key)) threads.set(key, []);
  selectChatConversation(key);
  return key;
}

export function closeChatConversation(key: string): void {
  patchConversation(key, { visibility: "closed" });
  if (snapshot.selectedKey === key) selectChatConversation(null);
}

export function archiveChatConversation(key: string, archived: boolean): void {
  patchConversation(key, { visibility: archived ? "archived" : "open" });
}

export function pinChatConversation(key: string, pinned: boolean): void {
  patchConversation(key, { pinned });
}

export function renameChatConversation(key: string, customName: string): void {
  patchConversation(key, { customName: customName.trim() || undefined });
}

export function markChatConversationUnread(key: string): void {
  patchConversation(key, { manualUnread: true });
}

export function markChatConversationRead(key: string): void {
  patchConversation(key, {
    unreadCount: 0,
    manualUnread: false,
    lastReadAt: Date.now(),
  });
}

export function removeChatConversationState(key: string): void {
  if (!snapshot.conversations[key]) return;
  const conversations = { ...snapshot.conversations };
  delete conversations[key];
  threads.delete(key);
  lastWhispers.delete(key);
  for (const [alias, target] of aliases) if (target === key) aliases.delete(alias);
  const selectedKey = snapshot.selectedKey === key ? null : snapshot.selectedKey;
  activeKey = selectedKey;
  snapshot = {
    ...snapshot,
    conversations,
    selectedKey,
  };
  bumpAllRevisions();
  schedulePersist();
  scheduleListNotify();
  scheduleThreadNotify({ urgent: true });
}

export function closeAllChatConversations(): void {
  const conversations = mapConversations(conversation =>
    conversation.visibility === "open" ? { ...conversation, visibility: "closed" } : conversation,
  );
  activeKey = null;
  snapshot = {
    ...snapshot,
    conversations,
    selectedKey: null,
  };
  bumpAllRevisions();
  schedulePersist();
  scheduleListNotify();
  scheduleThreadNotify({ urgent: true });
}

export function setChatGeometry(geometry: Partial<ChatGeometry>): void {
  setSnapshot({ geometry: { ...snapshot.geometry, ...geometry } });
}

export function getTotalChatUnread(): number {
  return Object.values(snapshot.conversations)
    .reduce((total, conversation) => total + conversation.unreadCount, 0);
}

function handleLogChange(change: LogChange): void {
  if (!identity) return;
  if (change.type === "clear" || change.type === "remove" || change.type === "bulk") {
    rebuildIndex(getChatLogs());
    bumpAllRevisions();
    schedulePersist();
    scheduleListNotify();
    scheduleThreadNotify({ urgent: true });
    return;
  }

  const entry = change.entry;
  const rawKey = createChatKeyResolver(snapshot.localAccounts, identity)(entry);
  if (!rawKey) return;
  const key = aliases.get(rawKey) ?? rawKey;
  const existing = snapshot.conversations[key];
  if (entry.type === "click" && !existing) return;

  if (!existing) {
    rebuildIndex(getChatLogs());
    bumpAllRevisions();
    schedulePersist();
    scheduleListNotify();
    scheduleThreadNotify({ urgent: true });
    return;
  }

  const thread = threads.get(key) ?? [];
  insertChronological(thread, entry);
  threads.set(key, thread);
  if (entry.type === "whisper") {
    lastWhispers.set(key, entry);
  }

  if (entry.type !== "whisper") {
    // Clicks etc. affect list previews more than the open bubble stream.
    bumpListRevision();
    if (key === activeKey) bumpThreadRevision(key);
    schedulePersist();
    scheduleListNotify();
    if (key === activeKey) scheduleThreadNotify();
    return;
  }

  const conversation = snapshot.conversations[key];
  if (!conversation) return;
  const mine = isEntryMine(entry, conversation);
  const visible = !mine && isActiveVisible(key);
  const next = applyWhisperActivity(conversation, mine, visible, entry.ts);
  // In-place conversation patch without a full dual notify.
  snapshot = {
    ...snapshot,
    conversations: {
      ...snapshot.conversations,
      [key]: {
        ...conversation,
        ...next,
        figure: mine ? conversation.figure : entry.figure ?? conversation.figure,
      },
    },
  };
  schedulePersist();

  const openActiveThread = windowOpen && key === activeKey;
  if (openActiveThread) {
    // Hot path: stream into the open conversation — thread UI only; list is throttled.
    bumpThreadRevision(key);
    scheduleThreadNotify();
    scheduleThrottledListNotify();
  } else {
    bumpListRevision();
    scheduleListNotify();
  }
}

function insertChronological(thread: LogEntry[], entry: LogEntry): void {
  if (!thread.length || thread[thread.length - 1].ts <= entry.ts) {
    thread.push(entry);
    return;
  }
  let low = 0;
  let high = thread.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (thread[middle].ts <= entry.ts) low = middle + 1;
    else high = middle;
  }
  thread.splice(low, 0, entry);
}

function rebuildIndex(logs: LogEntry[]): void {
  threads = new Map();
  aliases = new Map();
  lastWhispers = new Map();
  const contacts = buildChatContacts(logs, snapshot.localAccounts, identity);
  const resolveKey = createChatKeyResolver(snapshot.localAccounts, identity);
  const known = new Set(contacts.map(contact => contact.key));
  for (const contact of contacts) {
    for (const historyKey of contact.historyKeys) aliases.set(historyKey, contact.key);
  }

  for (const entry of [...logs].sort((a, b) => a.ts - b.ts)) {
    const rawKey = resolveKey(entry);
    if (!rawKey) continue;
    const key = aliases.get(rawKey) ?? rawKey;
    if (!known.has(key)) continue;
    const thread = threads.get(key) ?? [];
    thread.push(entry);
    threads.set(key, thread);
    if (entry.type === "whisper") lastWhispers.set(key, entry);
  }

  const previousConversations = snapshot.conversations;
  const conversations = needsConversationMigration ? {} : { ...previousConversations };
  for (const contact of contacts) {
    const state = mergeContactState(previousConversations[contact.key], contact, "open");
    const thread = threads.get(contact.key) ?? [];
    const latestIncoming = [...thread].reverse().find(entry => !isEntryMine(entry, state) && entry.figure);
    conversations[contact.key] = {
      ...state,
      figure: latestIncoming?.figure ?? state.figure,
    };
  }
  const selectedKey = snapshot.selectedKey && conversations[snapshot.selectedKey]
    ? snapshot.selectedKey
    : null;
  activeKey = selectedKey;
  snapshot = { ...snapshot, conversations, selectedKey };
  needsConversationMigration = false;
  schedulePersist();
}

function mergeContactState(
  previous: ChatConversationState | undefined,
  contact: WhisperContact,
  visibility: ChatVisibility,
): ChatConversationState {
  const normalizedContact = contact.kind === "group"
    ? {
        ...contact,
        label: contact.members.filter(name => !sameName(name, identity)).join(", ") || "Grupo",
      }
    : contact;
  if (previous) {
    const sameIdentity = previous.label === normalizedContact.label
      && previous.recipient === normalizedContact.recipient
      && previous.members.join("\u0000") === normalizedContact.members.join("\u0000")
      && previous.historyKeys.join("\u0000") === normalizedContact.historyKeys.join("\u0000");
    return sameIdentity ? previous : { ...previous, ...normalizedContact };
  }
  return {
    ...normalizedContact,
    visibility,
    pinned: false,
    openedAt: Date.now(),
    lastReadAt: Date.now(),
    unreadCount: 0,
    manualUnread: false,
  };
}

function isEntryMine(entry: LogEntry, conversation: WhisperContact): boolean {
  if (conversation.kind === "user" && isLocalChatAccount(conversation.recipient)) {
    return sameName(entry.actor, identity);
  }
  return isLocalChatAccount(entry.actor);
}

function upsertConversation(
  contact: WhisperContact,
  patch: Partial<ChatConversationState>,
): void {
  const previous = snapshot.conversations[contact.key];
  const next = {
    ...mergeContactState(previous, contact, "open"),
    ...patch,
  };
  setSnapshot({
    conversations: {
      ...snapshot.conversations,
      [contact.key]: next,
    },
  });
}

function patchConversation(
  key: string,
  patch: Partial<ChatConversationState>,
  announce = true,
): void {
  const current = snapshot.conversations[key];
  if (!current) return;
  setSnapshot({
    conversations: {
      ...snapshot.conversations,
      [key]: { ...current, ...patch },
    },
  }, announce);
}

function markActiveReadIfVisible(): void {
  if (!activeKey || !isActiveVisible(activeKey)) return;
  const conversation = snapshot.conversations[activeKey];
  if (!conversation || (!conversation.unreadCount && !conversation.manualUnread)) return;
  markChatConversationRead(activeKey);
}

function isActiveVisible(key: string): boolean {
  return windowOpen
    && activeKey === key
    && document.visibilityState !== "hidden"
    && document.hasFocus();
}

function mapConversations(
  map: (conversation: ChatConversationState) => ChatConversationState,
): Record<string, ChatConversationState> {
  return Object.fromEntries(
    Object.entries(snapshot.conversations).map(([key, value]) => [key, map(value)]),
  );
}

function setSnapshot(
  patch: Partial<ChatWorkspaceSnapshot>,
  announce = true,
): void {
  snapshot = {
    ...snapshot,
    ...patch,
  };
  bumpAllRevisions();
  publishListSnapshot();
  publishThreadSnapshot(snapshot.selectedKey);
  schedulePersist();
  if (announce) {
    scheduleListNotify();
    scheduleThreadNotify({ urgent: true });
  }
}

function notifyRevision(): void {
  bumpAllRevisions();
  publishListSnapshot();
  publishThreadSnapshot(snapshot.selectedKey);
  scheduleListNotify();
  scheduleThreadNotify({ urgent: true });
}

function bumpAllRevisions(): void {
  const next = snapshot.revision + 1;
  snapshot = {
    ...snapshot,
    revision: next,
    listRevision: snapshot.listRevision + 1,
    threadRevision: snapshot.threadRevision + 1,
  };
  publishListSnapshot();
  publishThreadSnapshot(snapshot.selectedKey);
}

function bumpListRevision(): void {
  snapshot = {
    ...snapshot,
    revision: snapshot.revision + 1,
    listRevision: snapshot.listRevision + 1,
  };
  publishListSnapshot();
}

function bumpThreadRevision(key: string | null): void {
  snapshot = {
    ...snapshot,
    revision: snapshot.revision + 1,
    threadRevision: snapshot.threadRevision + 1,
  };
  publishThreadSnapshot(key);
}

function publishListSnapshot(): void {
  listSnapshot = {
    listRevision: snapshot.listRevision,
    loading: snapshot.loading,
    selectedKey: snapshot.selectedKey,
    geometry: snapshot.geometry,
    localAccounts: snapshot.localAccounts,
  };
}

function publishThreadSnapshot(key: string | null): void {
  threadSnapshot = {
    threadRevision: snapshot.threadRevision,
    selectedKey: key,
    threadLength: key ? (threads.get(key)?.length ?? 0) : 0,
  };
}

function schedulePersist(): void {
  if (persistTimer != null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, PERSIST_DEBOUNCE_MS);
}

function persistNow(): void {
  const persisted: PersistedChatWorkspace = {
    version: STATE_VERSION,
    initialized: snapshot.initialized,
    selectedKey: snapshot.selectedKey,
    geometry: snapshot.geometry,
    conversations: snapshot.conversations,
    localAccounts: snapshot.localAccounts,
  };
  writePref(PREF_KEY, persisted);
}

/** Flush pending workspace write (tests / shutdown). */
export function flushChatWorkspacePersist(): void {
  if (persistTimer != null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistNow();
}

function scheduleListNotify(): void {
  if (listNotifyQueued) return;
  listNotifyQueued = true;
  queueMicrotask(() => {
    listNotifyQueued = false;
    listListeners.forEach(listener => listener());
  });
}

/**
 * Coalesce thread UI updates onto rAF.
 * - 1 new message since last flush → paint on next frame (snappy normal chat)
 * - 2+ new messages → wait up to THREAD_BURST_MIN_MS so multi-append batches
 * Pass urgent for selection / structural changes that must paint immediately.
 */
function scheduleThreadNotify(options?: { urgent?: boolean }): void {
  if (options?.urgent) {
    flushThreadNotify();
    return;
  }
  if (threadNotifyRaf || threadNotifyTimer != null) return;
  threadNotifyRaf = requestAnimationFrame(() => {
    threadNotifyRaf = 0;
    const key = snapshot.selectedKey;
    const len = key ? (threads.get(key)?.length ?? 0) : 0;
    const arrived = Math.max(0, len - threadLengthAtLastNotify);
    if (arrived <= 1) {
      flushThreadNotify();
      return;
    }
    const elapsed = performance.now() - lastThreadNotifyAt;
    if (elapsed >= THREAD_BURST_MIN_MS) {
      flushThreadNotify();
      return;
    }
    threadNotifyTimer = setTimeout(() => {
      threadNotifyTimer = null;
      flushThreadNotify();
    }, Math.max(0, THREAD_BURST_MIN_MS - elapsed));
  });
}

function flushThreadNotify(): void {
  if (threadNotifyRaf) {
    cancelAnimationFrame(threadNotifyRaf);
    threadNotifyRaf = 0;
  }
  if (threadNotifyTimer != null) {
    clearTimeout(threadNotifyTimer);
    threadNotifyTimer = null;
  }
  lastThreadNotifyAt = performance.now();
  // Re-publish length in case several appends landed before this flush.
  publishThreadSnapshot(snapshot.selectedKey);
  const key = snapshot.selectedKey;
  threadLengthAtLastNotify = key ? (threads.get(key)?.length ?? 0) : 0;
  threadListeners.forEach(listener => listener());
}

function scheduleThrottledListNotify(): void {
  listThrottlePending = true;
  if (listThrottleTimer != null) return;
  listThrottleTimer = setTimeout(() => {
    listThrottleTimer = null;
    if (!listThrottlePending) return;
    listThrottlePending = false;
    bumpListRevision();
    scheduleListNotify();
  }, LIST_THROTTLE_MS);
}

function scheduleNotify(): void {
  scheduleListNotify();
  scheduleThreadNotify();
}

function notify(): void {
  scheduleNotify();
}

function readWorkspace(): PersistedChatWorkspace {
  const stored = readPref<Partial<PersistedChatWorkspace>>(PREF_KEY, {});
  needsConversationMigration = stored.version !== STATE_VERSION;
  return {
    version: STATE_VERSION,
    initialized: stored.initialized === true,
    selectedKey: null,
    geometry: normalizeGeometry(stored.geometry),
    conversations: normalizeConversations(stored.conversations),
    localAccounts: stored.version === STATE_VERSION && Array.isArray(stored.localAccounts)
      ? uniqueNames(stored.localAccounts)
      : [],
  };
}

function normalizeGeometry(value: Partial<ChatGeometry> | undefined): ChatGeometry {
  return {
    left: typeof value?.left === "number" ? value.left : null,
    top: finiteOr(value?.top, DEFAULT_GEOMETRY.top),
    width: finiteOr(value?.width, DEFAULT_GEOMETRY.width),
    height: finiteOr(value?.height, DEFAULT_GEOMETRY.height),
  };
}

function normalizeConversations(
  value: Record<string, ChatConversationState> | undefined,
): Record<string, ChatConversationState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, ChatConversationState> = {};
  for (const [key, conversation] of Object.entries(value)) {
    if (!conversation || conversation.key !== key) continue;
    result[key] = {
      ...conversation,
      visibility: conversation.visibility === "closed" || conversation.visibility === "archived"
        ? conversation.visibility
        : "open",
      pinned: Boolean(conversation.pinned),
      openedAt: finiteOr(conversation.openedAt, Date.now()),
      lastReadAt: finiteOr(conversation.lastReadAt, 0),
      unreadCount: Math.max(0, Math.floor(finiteOr(conversation.unreadCount, 0))),
      manualUnread: Boolean(conversation.manualUnread),
      members: Array.isArray(conversation.members) ? conversation.members : [],
      historyKeys: Array.isArray(conversation.historyKeys) ? conversation.historyKeys : [key],
    };
  }
  return result;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueNames(names: string[]): string[] {
  const result: string[] = [];
  for (const value of names.map(name => name.trim()).filter(Boolean)) {
    if (!result.some(name => sameName(name, value))) result.push(value);
  }
  return result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}
