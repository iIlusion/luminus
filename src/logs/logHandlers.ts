import type { LuminusApi } from "../ws/api";
import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { MessengerUpdate, FriendUpdate } from "../messages/incoming/MessengerUpdateParser";
import type { MessengerFriends } from "../messages/incoming/MessengerFriendsParser";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { GuestRoomData } from "../messages/incoming/RoomParsers";
import { PacketReader } from "../protocol/wrapper";
import { isUsersPacketReplay } from "../room/muteAll";
import { addLog, type LogEntry } from "./logStore";
import { normalizeLogEntry } from "./whisperThreads";
import { gmPost } from "../util/gmFetch";
import { linkClickMessage } from "../ui/profileLinks";
import { consumeGroupWhisperRoute, type GroupWhisperRoute } from "../chat/groupWhisperRouting";
import {
  getMountedNativeGroupMembers,
  isNativeGroupManagementNotice,
  rememberNativeGroupRoster,
} from "../chat/nativeGroupMount";
import { NATIVE_GROUP_RESET_PREFIX } from "../chat/nativeGroupWhisperResetPrefix";

export interface LogsConfig {
  chatEnabled: boolean;
  chatWebhook: string;
  friendEnabled: boolean;
  friendWebhook: string;
  friendNames: string[];
  roomEnabled: boolean;
  roomWebhook: string;
  roomNames: string[];
}

export const LOGS_CONFIG_DEFAULT: LogsConfig = {
  chatEnabled: false, chatWebhook: "",
  friendEnabled: false, friendWebhook: "", friendNames: [],
  roomEnabled: false, roomWebhook: "", roomNames: [],
};

let unsubs: (() => void)[] = [];

// unitIndex → session data; cleared on room change (2031)
const activeSessions = new Map<number, { name: string; figure: string; ts: number; roomId: number; roomName: string }>();

// friendId → last known state; figure/motto cached from last online update
const friendStates = new Map<number, {
  online: boolean;
  followingAllowed: boolean;
  figure: string;
  motto: string;
  relationshipStatus: number;
}>();

// friendId → live "online now" session, for the Logs window's friends-online panel.
interface FriendSession {
  name: string;
  figure: string;
  onlineSince: number;
  roomLabel: string;
  roomSince: number;
  /** Guest room id from ROOM_FORWARD — used to refresh name/counts via GET_GUEST_ROOM. */
  roomId: number | null;
  ownerName: string;
  userCount: number;
  maxUserCount: number;
}
const friendSessions = new Map<number, FriendSession>();

/** Soft refresh of room name / occupancy for friends we already know a roomId for. */
const FRIEND_ROOM_POLL_MS = 10_000;
const FRIEND_ROOM_POLL_GAP_MS = 450;
let friendRoomPollTimer: ReturnType<typeof setInterval> | null = null;
let friendRoomPollApi: LuminusApi | null = null;
let friendRoomPollRunning = false;

export function getFriendSessions(): ReadonlyMap<number, FriendSession> {
  return friendSessions;
}

function fmtFriendRoom(name: string, owner: string, cur: number, max: number): string {
  return `"${name}"${owner && owner !== "?" ? ` | dono: ${owner}` : ""}${max > 0 ? ` | ${cur}/${max} pessoas` : ""}`;
}

function markFriendOnline(id: number, name: string, figure: string): void {
  const existing = friendSessions.get(id);
  if (existing) {
    if (name) existing.name = name;
    if (figure) existing.figure = figure;
    return;
  }
  friendSessions.set(id, {
    name,
    figure,
    onlineSince: Date.now(),
    roomLabel: "?",
    roomSince: Date.now(),
    roomId: null,
    ownerName: "",
    userCount: 0,
    maxUserCount: 0,
  });
}

/** Special statuses without a resolvable room id (hotel view, invisible, private). */
function markFriendRoomMeta(id: number, label: string): void {
  const s = friendSessions.get(id);
  if (!s) return;
  const roomChanged = s.roomLabel !== label || s.roomId != null;
  s.roomLabel = label;
  s.roomId = null;
  s.ownerName = "";
  s.userCount = 0;
  s.maxUserCount = 0;
  if (roomChanged) s.roomSince = Date.now();
}

/** Apply guest-room snapshot (from follow or periodic GET_GUEST_ROOM). */
function markFriendRoomData(
  id: number,
  roomId: number | null,
  name: string,
  owner: string,
  cur: number,
  max: number,
): void {
  const s = friendSessions.get(id);
  if (!s) return;
  const label = fmtFriendRoom(name, owner, cur, max);
  const roomChanged = s.roomId !== roomId || (roomId == null && s.roomLabel !== label);
  s.roomLabel = label;
  s.roomId = roomId;
  s.ownerName = owner;
  s.userCount = cur;
  s.maxUserCount = max;
  // Only reset "time in this room" when the room identity changes — occupancy ticks freely.
  if (roomChanged) s.roomSince = Date.now();
}

function markFriendOffline(id: number): void {
  friendSessions.delete(id);
}

function startFriendRoomPoll(api: LuminusApi): void {
  friendRoomPollApi = api;
  if (friendRoomPollTimer != null) return;
  friendRoomPollTimer = setInterval(() => { void pollFriendRooms(); }, FRIEND_ROOM_POLL_MS);
}

function stopFriendRoomPoll(): void {
  if (friendRoomPollTimer != null) {
    clearInterval(friendRoomPollTimer);
    friendRoomPollTimer = null;
  }
  friendRoomPollApi = null;
  friendRoomPollRunning = false;
}

async function pollFriendRooms(): Promise<void> {
  if (friendRoomPollRunning || followBusy) return;
  const api = friendRoomPollApi;
  if (!api) return;

  const targets = [...friendSessions.entries()].filter(([, s]) => s.roomId != null && s.roomId > 0);
  if (!targets.length) return;

  friendRoomPollRunning = true;
  try {
    for (const [id, session] of targets) {
      if (followBusy) break;
      const roomId = session.roomId;
      if (roomId == null) continue;
      // Fresh GET_GUEST_ROOM — cheap vs FOLLOW_FRIEND, updates name + user counts.
      const data = await resolveRoomInfo(api, roomId, 4000, true);
      if (!data || !friendSessions.has(id)) continue;
      // Friend may have moved; only apply if we still track the same roomId.
      const live = friendSessions.get(id);
      if (!live || live.roomId !== roomId) continue;
      markFriendRoomData(id, data.id, data.name, data.ownerName, data.userCount, data.maxUserCount);
      await new Promise<void>(r => setTimeout(r, FRIEND_ROOM_POLL_GAP_MS));
    }
  } finally {
    friendRoomPollRunning = false;
  }
}

const REL_LABEL: Record<number, string> = {
  0: "Nenhum",
  1: "Parceiro(a)",
  2: "Melhor amigo(a)",
  3: "Inimigo(a)",
};

interface PendingWhisper {
  target: string;
  message: string;
  groupRoute?: GroupWhisperRoute;
  at: number;
}

// Outgoing whispers waiting for 2704 echoes.
// Habblet may (1) echo the same text, (2) replace with "bobba", or (3) drop silently
// with no echo — stale entries must expire so the next real message does not desync.
const pendingWhispers: PendingWhisper[] = [];
const pendingGroupEchoes = new Map<number, { members: string[]; remaining: number; logged: boolean }>();
const PENDING_WHISPER_TTL_MS = 8_000;

/** Align echo body with the text we stored on send (strip "Grupo de sussurro (...):"). */
function whisperMatchKey(message: string): string {
  const clean = stripFormatting(message).trim();
  const match = /^Grupo de sussurro\s*\([^)]*\):\s*(.*)$/isu.exec(clean);
  return (match ? match[1] : clean).trim();
}

function isBobbaOrFilteredEcho(message: string): boolean {
  const key = whisperMatchKey(message).toLocaleLowerCase("pt-BR");
  return key === "bobba" || key === "bobba!" || /^b+o+b+b+a+!*$/i.test(key);
}

function isGroupFormattedEcho(message: string): boolean {
  return /^Grupo de sussurro\s*\(/i.test(stripFormatting(message).trim());
}

function discardPendingSlot(pending: PendingWhisper): void {
  if (!pending.groupRoute) return;
  const state = pendingGroupEchoes.get(pending.groupRoute.id);
  if (!state) return;
  state.remaining = Math.max(0, state.remaining - 1);
  if (state.remaining <= 0) pendingGroupEchoes.delete(pending.groupRoute.id);
}

function purgeStalePendingWhispers(now = Date.now()): void {
  for (let i = pendingWhispers.length - 1; i >= 0; i--) {
    if (now - pendingWhispers[i].at <= PENDING_WHISPER_TTL_MS) continue;
    const [stale] = pendingWhispers.splice(i, 1);
    if (stale) discardPendingSlot(stale);
  }
}

function takePendingWhisper(echoMessage: string): PendingWhisper | undefined {
  purgeStalePendingWhispers();
  if (!pendingWhispers.length) return undefined;

  const key = whisperMatchKey(echoMessage);
  // 1) Exact body match (normal path).
  if (key && !isBobbaOrFilteredEcho(echoMessage)) {
    const exact = pendingWhispers.findIndex(item => whisperMatchKey(item.message) === key);
    if (exact >= 0) return pendingWhispers.splice(exact, 1)[0];
  }

  // 2) Filter replaced the text with bobba, or group echo body no longer equals what we typed:
  //    bind to the oldest compatible pending slot instead of leaving it forever.
  if (isBobbaOrFilteredEcho(echoMessage) || isGroupFormattedEcho(echoMessage)) {
    if (isGroupFormattedEcho(echoMessage)) {
      const groupIdx = pendingWhispers.findIndex(
        item => item.groupRoute || item.target.toLocaleLowerCase("pt-BR") === "group",
      );
      if (groupIdx >= 0) return pendingWhispers.splice(groupIdx, 1)[0];
    }
    return pendingWhispers.shift();
  }

  // 3) FIFO only when the front entry has no usable text (legacy/malformed send).
  const front = pendingWhispers[0];
  if (front && !whisperMatchKey(front.message)) return pendingWhispers.shift();
  return undefined;
}

function normalizeWhisperGroupLog(actor: string, figure: string | undefined, message: string): LogEntry | null {
  const normalized = normalizeLogEntry({
    ts: Date.now(),
    type: "whisper",
    actor,
    target: "group",
    figure,
    message,
  });
  if (!normalized.groupMembers?.length) return null;
  return normalized;
}

/** Members for a native "group" send: route → echo prefix → mounted snapshot. */
function resolveGroupMembersForOwnEcho(
  myself: string,
  rawEcho: string,
  pending?: PendingWhisper,
): string[] | null {
  if (pending?.groupRoute?.members?.length) {
    return pending.groupRoute.members;
  }
  const fromEcho = normalizeWhisperGroupLog(myself, undefined, rawEcho);
  if (fromEcho?.groupMembers?.length) {
    rememberNativeGroupRoster(fromEcho.groupMembers, myself);
    return fromEcho.groupMembers;
  }

  const mounted = getMountedNativeGroupMembers();
  if (mounted.length >= 2) return [...mounted];
  return null;
}

function isGroupPendingTarget(pending: PendingWhisper | undefined): boolean {
  if (!pending) return false;
  if (pending.groupRoute) return true;
  return pending.target.toLocaleLowerCase("pt-BR") === "group";
}

type FollowFailReason = "invisible" | "timeout";

// Only one follow dance can run at a time (they all borrow api.room). Instead of failing
// concurrent requests, queue them and run serially — a room change never gets dropped just
// because the login snapshot or another friend's follow happens to be in flight.
interface FollowTask {
  friendId: number;
  onFound: (roomId: number, roomName: string, ownerName: string, userCount: number, maxUserCount: number) => void;
  onFail?: (reason: FollowFailReason) => void;
  timeoutMs: number;
}
let followBusy = false;
const followQueue: FollowTask[] = [];

export function getActiveSessions(): ReadonlyMap<number, { name: string; figure: string; ts: number; roomId: number; roomName: string }> {
  return activeSessions;
}

export function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

type LogWebhookType = "chat" | "click" | "whisper" | "friend" | "room_enter" | "room_leave";

const WEBHOOK_EMOJI: Record<LogWebhookType, string> = {
  chat: "💬",
  click: "👆",
  whisper: "🤫",
  friend: "👥",
  room_enter: "➡️",
  room_leave: "⬅️",
};

function sendWebhook(url: string, type: LogWebhookType, displayName: string, content: string, figure?: string): void {
  if (!url) return;
  gmPost(url, {
    content: `${WEBHOOK_EMOJI[type]} **${content}**`,
    username: `[Luminus] ${displayName}`,
    avatar_url: figure
      ? `https://imaging.habblet.city/avatarimage?figure=${figure}&direction=3&head_direction=3&size=l`
      : undefined,
  });
}

function stripFormatting(str: string): string {
  return str.replace(/@\w+@/g, "");
}

function normalizeTxt(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Fetches figure via USER_PROFILE: outgoing 3265 (userId) → incoming 3898 (profile).
// Used when cached figure is unavailable (e.g. friend was always offline since script start).
function fetchFriendFigure(api: LuminusApi, userId: number, onFigure: (fig: string) => void): void {
  const unsub = api.onIncoming(3898, ({ packet }) => {
    try {
      const reader = new PacketReader(3898, packet.body);
      reader.readInt();   // userId
      reader.readString(); // username
      const fig = reader.readString(); // figure
      if (fig) { unsub(); onFigure(fig); }
    } catch { /* ignore */ }
  });
  setTimeout(() => unsub(), 5000);
  api.send(3265, [userId]);
}

// Per-roomId GET_GUEST_ROOM (2230) → GetGuestRoomResult (687). Keyed off the packet's own
// `id` rather than api.room — friend follow also uses 687 and temporarily touches api.room.
// Successful lookups are TTL-cached so room-monitor bursts coalesce; force=true for live polls.
const ROOM_INFO_TTL_MS = 8_000;
const roomInfoCache = new Map<number, { at: number; promise: Promise<GuestRoomData | null> }>();

function resolveRoomInfo(
  api: LuminusApi,
  roomId: number,
  timeoutMs = 4000,
  force = false,
): Promise<GuestRoomData | null> {
  if (roomId <= 0) return Promise.resolve(null);

  const hit = roomInfoCache.get(roomId);
  if (!force && hit && Date.now() - hit.at < ROOM_INFO_TTL_MS) return hit.promise;

  const promise = new Promise<GuestRoomData | null>(resolve => {
    const timer = setTimeout(() => { unsub(); resolve(null); }, timeoutMs);
    const unsub = api.onIncoming(687, ({ packet }) => {
      const r = packet.parsed as GuestRoomData | undefined;
      if (r?.id === roomId) { clearTimeout(timer); unsub(); resolve(r); }
    });
    api.send(2230, [roomId, 0, 0]);
  });

  roomInfoCache.set(roomId, { at: Date.now(), promise });
  promise.then(r => {
    if (!r) roomInfoCache.delete(roomId);
  });
  return promise;
}

// Enqueue a friend-room lookup. Follows run one at a time (see followQueue); duplicate
// pending requests for the same friend collapse to the latest so bursts don't backlog.
function tryGetFriendRoom(
  api: LuminusApi,
  friendId: number,
  onFound: (roomId: number, roomName: string, ownerName: string, userCount: number, maxUserCount: number) => void,
  onFail?: (reason: FollowFailReason) => void,
  timeoutMs = 5000
): void {
  const task: FollowTask = { friendId, onFound, onFail, timeoutMs };
  const idx = followQueue.findIndex(t => t.friendId === friendId);
  if (idx !== -1) followQueue[idx] = task;
  else followQueue.push(task);
  drainFollowQueue(api);
}

function drainFollowQueue(api: LuminusApi): void {
  if (followBusy) return;
  const task = followQueue.shift();
  if (!task) return;
  followBusy = true;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    followBusy = false;
    drainFollowQueue(api);
  };

  runFollow(api, task.friendId, task.timeoutMs,
    (roomId, n, o, c, m) => { task.onFound(roomId, n, o, c, m); release(); },
    (r) => { task.onFail?.(r); release(); });
}

// Sends FOLLOW_FRIEND (3997) → blocks ROOM_FORWARD (160) navigation →
// sends GET_GUEST_ROOM (2230) → reads GetGuestRoomResult (687) → restores api.room.
// Watches for Nitro's "quarto invisível" alert; suppresses it and calls onFail("invisible").
// Always resolves via exactly one of onFound/onFail within timeoutMs so the queue never stalls.
function runFollow(
  api: LuminusApi,
  friendId: number,
  timeoutMs: number,
  onFound: (roomId: number, roomName: string, ownerName: string, userCount: number, maxUserCount: number) => void,
  onFail: (reason: FollowFailReason) => void
): void {
  let done = false;

  const cleanup = (reason: FollowFailReason) => {
    if (done) return;
    done = true;
    clearTimeout(fwdTimer);
    observer.disconnect();
    unsubFwd();
    onFail(reason);
  };

  // Suppress Nitro's "quarto invisível" alert that appears when trying to follow
  // someone in a private room. Auto-clicks the close button and reports the reason.
  const observer = new MutationObserver(() => {
    if (done) { observer.disconnect(); return; }
    const textEls = document.querySelectorAll<HTMLElement>(".nitro-alert-default .notification-text");
    for (const el of textEls) {
      if ((el.textContent ?? "").includes("invisível")) {
        const btn = el.closest<HTMLElement>(".nitro-alert")?.querySelector<HTMLElement>(".btn-secondary");
        btn?.click();
        cleanup("invisible");
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const fwdTimer = setTimeout(() => cleanup("timeout"), timeoutMs);

  const unsubFwd = api.onIncoming(160, ({ packet }) => {
    if (done) return;
    // ROOM_FORWARD arrived: friend is in a normal room. Stop watching for alert.
    done = true;
    clearTimeout(fwdTimer);
    observer.disconnect();
    unsubFwd();

    const roomId = new DataView(packet.body).getInt32(0, false);

    // Save current room metadata — updateState for 687 overwrites these fields.
    const saved = {
      id: api.room.id, name: api.room.name, description: api.room.description,
      ownerId: api.room.ownerId, ownerName: api.room.ownerName,
      userCount: api.room.userCount, maxUserCount: api.room.maxUserCount,
    };

    const infoTimer = setTimeout(() => {
      unsubInfo();
      Object.assign(api.room, saved);
      onFound(roomId, `#${roomId}`, "?", 0, 0);
    }, 4000);

    // Match by roomId: the room monitor's resolveRoomInfo may also have a 687 in flight.
    const unsubInfo = api.onIncoming(687, ({ packet: p }) => {
      const r = p.parsed as GuestRoomData | undefined;
      if (r && r.id !== roomId) return;
      clearTimeout(infoTimer);
      unsubInfo();
      Object.assign(api.room, saved);
      if (r) onFound(roomId, r.name, r.ownerName, r.userCount, r.maxUserCount);
      else onFound(roomId, `#${roomId}`, "?", 0, 0);
    });

    api.send(2230, [roomId, 0, 0]);
    return "block"; // prevent game navigation
  });

  api.send(3997, [friendId]);
}

// Shared by MESSENGER_UPDATE (2800, incremental) and MESSENGER_FRIENDS (3130, the full
// roster sent once at login) — a friend the script hasn't seen before behaves the same way
// whether it's the first incremental update or an entry in the login snapshot: if they're
// already online, start their live session and resolve their current room right away.
function processFriendUpdate(api: LuminusApi, cfg: LogsConfig, f: FriendUpdate): void {
  const watchLower = cfg.friendNames.map(n => n.toLowerCase());
  const prev = friendStates.get(f.id);
  // Preserve cached figure/motto: offline updates often send empty strings.
  const bestFigure = f.figure || (prev?.figure ?? "");
  const bestMotto  = f.motto  || (prev?.motto  ?? "");
  friendStates.set(f.id, {
    online: f.online,
    followingAllowed: f.followingAllowed,
    figure: bestFigure,
    motto: bestMotto,
    relationshipStatus: f.relationshipStatus,
  });

  if (!watchLower.includes(f.name.toLowerCase())) return;

  // Live "Amigos online agora" panel: any watched friend who is online must have a
  // session. friendStates is filled for the whole roster (even unwatched), so the
  // first *watched* update is often prev.online && f.online — without this ensure,
  // markFriendRoom was a no-op and the panel stayed empty despite "Mudou de quarto".
  if (f.online) markFriendOnline(f.id, f.name, bestFigure);
  else if (prev?.online) markFriendOffline(f.id);

  // Use best available figure; if still empty, fetch via USER_PROFILE (3265→3898).
  const post = (msg: string, fig: string = bestFigure) => {
    if (fig) {
      addLog({ ts: Date.now(), type: "friend", actor: f.name, figure: fig, message: msg });
      sendWebhook(cfg.friendWebhook, "friend", f.name, msg, fig);
    } else {
      fetchFriendFigure(api, f.id, fetchedFig => {
        friendStates.get(f.id) && (friendStates.get(f.id)!.figure = fetchedFig);
        const session = friendSessions.get(f.id);
        if (session) session.figure = fetchedFig;
        addLog({ ts: Date.now(), type: "friend", actor: f.name, figure: fetchedFig, message: msg });
        sendWebhook(cfg.friendWebhook, "friend", f.name, msg, fetchedFig);
      });
    }
  };

  const onRoomFound = (
    roomId: number,
    name: string,
    owner: string,
    cur: number,
    max: number,
    logMsg: string,
  ): void => {
    markFriendRoomData(f.id, roomId, name, owner, cur, max);
    post(logMsg.replace("%L%", fmtFriendRoom(name, owner, cur, max)));
  };

  if (prev === undefined) {
    // First sight: only log if we can determine the room; skip otherwise.
    if (f.online) {
      if (f.followingAllowed) {
        tryGetFriendRoom(api, f.id,
          (roomId, n, o, c, m) => onRoomFound(roomId, n, o, c, m, "Quarto: %L%"),
          (r) => {
            markFriendRoomMeta(f.id, r === "invisible" ? "Quarto Invisível" : "Quarto desconhecido");
            if (r === "invisible") post("Quarto Invisível");
          },
        );
      } else {
        markFriendRoomMeta(f.id, "Vista do hotel");
      }
    }
    return;
  }

  if (!prev.online && f.online) {
    if (f.followingAllowed) {
      tryGetFriendRoom(api, f.id,
        (roomId, n, o, c, m) => onRoomFound(roomId, n, o, c, m, "Ficou online — quarto: %L%"),
        (r) => {
          markFriendRoomMeta(f.id, r === "invisible" ? "Quarto Invisível" : "Quarto desconhecido");
          post(r === "invisible" ? "Ficou online (Quarto Invisível)" : "Ficou online");
        },
      );
    } else {
      markFriendRoomMeta(f.id, "Vista do hotel");
      post("Ficou online");
    }
  } else if (prev.online && !f.online) {
    post("Se desconectou");
  } else if (prev.online && f.online) {
    // Detect hotel lobby: followingAllowed flipped false while still online
    if (prev.followingAllowed && !f.followingAllowed) {
      markFriendRoomMeta(f.id, "Vista do hotel");
      post("Está na vista do hotel");
    } else if (f.followingAllowed) {
      tryGetFriendRoom(api, f.id,
        (roomId, n, o, c, m) => onRoomFound(roomId, n, o, c, m, "Mudou de quarto — %L%"),
        (r) => {
          markFriendRoomMeta(f.id, r === "invisible" ? "Quarto Invisível" : "Quarto desconhecido");
          post(r === "invisible" ? "Mudou de quarto (Quarto Invisível)" : "Fez alguma ação (quarto desconhecido)");
        },
      );
    } else {
      markFriendRoomMeta(f.id, "Quarto privado");
      post("Fez alguma ação (quarto privado)");
    }
  }

  // Side-changes: detect while online (or on reconnect vs cached state)
  if (f.online && prev) {
    const session = friendSessions.get(f.id);
    if (session && bestFigure) session.figure = bestFigure;
    if (f.motto && prev.motto && f.motto !== prev.motto) {
      post(`Mudança de Missão: ${prev.motto} > ${f.motto}`);
    }
    // Compare f.figure directly: bestFigure may fall back to prev when update omits figure.
    if (f.figure && prev.figure && f.figure !== prev.figure) {
      post("Mudou o visual (look)", f.figure);
    }
    if (prev.relationshipStatus !== f.relationshipStatus) {
      const label = REL_LABEL[f.relationshipStatus] ?? `#${f.relationshipStatus}`;
      post(`Status de relacionamento: ${label}`);
    }
  }
}

// MESSENGER_FRIENDS (3130) fragment accumulator — reset whenever a new sequence starts.
let messengerFriendsBuffer: FriendUpdate[] = [];

export function setupLogHandlers(api: LuminusApi, getConfig: () => LogsConfig): void {
  teardownLogHandlers();
  startFriendRoomPoll(api);

  // Outgoing UNIT_CHAT_WHISPER 1543 — capture recipient before echo arrives.
  // Wire format is a single string field "recipientName rest of message" (classic
  // ":w nome mensagem" syntax) — only the first token is the recipient.
  unsubs.push(api.onOutgoing(1543, ({ packet }) => {
    try {
      const reader = new PacketReader(1543, packet.body);
      const value = reader.readString();
      const separator = value.indexOf(" ");
      const target = separator === -1 ? value : value.slice(0, separator);
      const message = separator === -1 ? "" : value.slice(separator + 1);
      if (target) {
        if (normalizeTxt(target) === normalizeTxt(api.myself?.username ?? "") && message.startsWith(NATIVE_GROUP_RESET_PREFIX)) return;
        const groupRoute = consumeGroupWhisperRoute() ?? undefined;
        if (groupRoute) {
          const pending = pendingGroupEchoes.get(groupRoute.id) ?? { members: groupRoute.members, remaining: 0, logged: false };
          pending.remaining++;
          pendingGroupEchoes.set(groupRoute.id, pending);
        }
        purgeStalePendingWhispers();
        pendingWhispers.push({ target, message, groupRoute, at: Date.now() });
      }
    } catch {
      // Keep earlier queued recipients intact when one packet is malformed.
    }
  }));

  // Hide Habblet native "X foi adicionado ao seu grupo de sussurro" from the room chat.
  for (const header of [2704, 1446, 1036] as const) {
    unsubs.push(api.blockIncoming(header, packet => {
      const chat = packet.parsed as RoomChat | undefined;
      return Boolean(chat?.message && isNativeGroupManagementNotice(chat.message));
    }));
  }

  // UNIT_CHAT 1446 — "clicou em voce!" detection
  // The packet is sent FROM a system entity (not the clicker), so roomIndex ≠ clicker.
  // Extract the actor name from the message text and look up their figure by name.
  unsubs.push(api.onIncoming(1446, ({ packet }) => {
    const cfg = getConfig();
    if (!packet.parsed) return;
    const { message } = packet.parsed as RoomChat;
    const clean = stripFormatting(message);
    if (isNativeGroupManagementNotice(clean)) return;
    if (!normalizeTxt(clean).includes("clicou em voce!")) return;
    const actor = clean.match(/^(.+?)\s+clicou/i)?.[1]?.trim() ?? "?";
    linkClickMessage(api, actor, clean);
    const actorFigure = [...api.room.units.values()].find(u => u.name === actor)?.figure;
    addLog({ ts: Date.now(), type: "click", actor, figure: actorFigure, message: clean });
    if (!cfg.chatEnabled) return;
    sendWebhook(cfg.chatWebhook, "click", actor, clean, actorFigure);
  }));

  // UNIT_CHAT_WHISPER 2704 — incoming or echo of own outgoing
  unsubs.push(api.onIncoming(2704, ({ packet }) => {
    const cfg = getConfig();
    if (!packet.parsed) return;
    const { roomIndex, message, bubble } = packet.parsed as RoomChat;
    if ([34, 2].includes(bubble)) return;

    // Native group rebuild (member add/remove) must not enter history or touch the pending queue.
    if (isNativeGroupManagementNotice(message)) return;

    const myself = api.myself?.username ?? "";
    const isMine = api.myself?.index != null && roomIndex === api.myself.index;
    const figureSelf = api.myself?.figure;

    if (isMine) {
      // Content match first; bobba/silent-filter fall back to oldest compatible slot.
      const pending = takePendingWhisper(message);
      // Prefer delivered body for display; keep raw `message` for "Grupo de sussurro (...):" parse.
      const delivered = whisperMatchKey(message) || message;

      if (pending?.groupRoute) {
        const state = pendingGroupEchoes.get(pending.groupRoute.id);
        if (state && !state.logged) {
          state.logged = true;
          addLog({
            ts: Date.now(),
            type: "whisper",
            actor: myself,
            target: "group",
            figure: figureSelf,
            message: delivered,
            groupMembers: state.members,
          });
          if (cfg.chatEnabled) sendWebhook(cfg.chatWebhook, "whisper", `${myself} → Grupo`, delivered, figureSelf);
        }
        if (state && --state.remaining <= 0) pendingGroupEchoes.delete(pending.groupRoute.id);
        return;
      }

      // Native Habblet group send (target "group") without Luminus route — must still store roster.
      if (isGroupPendingTarget(pending) || isGroupFormattedEcho(message)) {
        const members = resolveGroupMembersForOwnEcho(myself, message, pending);
        if (members && members.length >= 2) {
          addLog({
            ts: Date.now(),
            type: "whisper",
            actor: myself,
            target: "group",
            figure: figureSelf,
            message: delivered,
            groupMembers: members,
          });
          if (cfg.chatEnabled) sendWebhook(cfg.chatWebhook, "whisper", `${myself} → Grupo`, delivered, figureSelf);
          return;
        }
      }

      if (pending) {
        // Never create a fake DM with recipient "group".
        if (pending.target.toLocaleLowerCase("pt-BR") === "group") return;
        const target = pending.target.trim() || "???";
        addLog({
          ts: Date.now(),
          type: "whisper",
          actor: myself || "Usuario",
          target,
          figure: figureSelf,
          message: delivered,
        });
        if (cfg.chatEnabled) sendWebhook(cfg.chatWebhook, "whisper", `${myself || "Usuario"} → ${target}`, delivered, figureSelf);
        return;
      }

      // Recovery: own group echo without a pending slot.
      const recovered = normalizeWhisperGroupLog(myself, figureSelf, message);
      if (recovered) {
        if (recovered.groupMembers?.length) rememberNativeGroupRoster(recovered.groupMembers, myself);
        addLog(recovered);
        if (cfg.chatEnabled) sendWebhook(cfg.chatWebhook, "whisper", `${myself} → Grupo`, recovered.message, figureSelf);
      }
      return;
    }

    // Incoming whisper from someone else → actor = them, target = me (always store both).
    const unit = api.room.units.get(roomIndex);
    const actor = unit?.name?.trim() || `#${roomIndex}`;
    // Incoming group lines also teach us the native roster for later own sends.
    const incomingGroup = normalizeWhisperGroupLog(actor, unit?.figure, message);
    if (incomingGroup?.groupMembers?.length) {
      rememberNativeGroupRoster(incomingGroup.groupMembers, myself);
      addLog({
        ...incomingGroup,
        actor: incomingGroup.actor || actor,
        target: "group",
      });
      if (cfg.chatEnabled) sendWebhook(cfg.chatWebhook, "whisper", `${actor} → Grupo`, incomingGroup.message, unit?.figure);
      return;
    }
    const toSelf = myself.trim() || "???";
    addLog({
      ts: Date.now(),
      type: "whisper",
      actor: actor || "Usuario",
      target: toSelf,
      figure: unit?.figure,
      message,
    });
    if (cfg.chatEnabled) sendWebhook(cfg.chatWebhook, "whisper", `${actor || "Usuario"} → ${toSelf}`, message, unit?.figure);
  }));

  // MESSENGER_UPDATE 2800 — friend state changes
  unsubs.push(api.onIncoming(2800, ({ packet }) => {
    const cfg = getConfig();
    if (!cfg.friendEnabled || !packet.parsed) return;
    const { friends } = packet.parsed as MessengerUpdate;
    for (const f of friends) processFriendUpdate(api, cfg, f);
  }));

  // MESSENGER_FRIENDS 3130 — full friend roster sent once at login, across 1+ fragments.
  // Feeding each friend through the same first-sight logic as 2800 means an already-online
  // watched friend starts their online-time/room tracking immediately instead of waiting
  // for their next incremental update.
  unsubs.push(api.onIncoming(3130, ({ packet }) => {
    const cfg = getConfig();
    if (!cfg.friendEnabled || !packet.parsed) return;
    const { totalFragments, fragmentNumber, friends } = packet.parsed as MessengerFriends;
    if (fragmentNumber === 0) messengerFriendsBuffer = [];
    messengerFriendsBuffer.push(...friends);
    if (fragmentNumber >= totalFragments - 1) {
      for (const f of messengerFriendsBuffer) processFriendUpdate(api, cfg, f);
      messengerFriendsBuffer = [];
    }
  }));

  // RoomReady 2031 — new room; open sessions for the previous room are closed below on self-leave.
  // Keep a hard clear here so a missed self-remove never leaks sessions across rooms.
  unsubs.push(api.onIncoming(2031, () => {
    activeSessions.clear();
  }));

  // Users 374 — monitored users entering room
  // Room name isn't reliably known yet at this point (normal room entry doesn't guarantee
  // GuestRoomData has arrived before the occupant list) — resolve it via GET_GUEST_ROOM and
  // cache it on the session so the eventual "Saiu de" log also gets the real name.
  unsubs.push(api.onIncoming(374, ({ packet }) => {
    // Mute-all hide injects synthetic Users packets — not real joins.
    if (isUsersPacketReplay()) return;
    const cfg = getConfig();
    if (!cfg.roomEnabled || !packet.parsed) return;
    const units = packet.parsed as RoomUnit[];
    const watchLower = cfg.roomNames.map(n => n.toLowerCase());
    const roomId = api.room.id ?? 0;
    for (const unit of units) {
      if (!watchLower.includes(unit.name.toLowerCase())) continue;
      if (activeSessions.has(unit.index)) continue;
      const session = { name: unit.name, figure: unit.figure, ts: Date.now(), roomId, roomName: api.room.name ?? "" };
      activeSessions.set(unit.index, session);

      resolveRoomInfo(api, roomId).then(r => {
        if (r?.name) session.roomName = r.name;
        const roomLabel = session.roomName ? `"${session.roomName}"` : `#${roomId}`;
        const msg = `Entrou em ${roomLabel}`;
        addLog({ ts: Date.now(), type: "room_enter", actor: unit.name, figure: unit.figure, message: msg });
        sendWebhook(cfg.roomWebhook, "room_enter", unit.name, msg, unit.figure);
      });
    }
  }));

  // UserRemove 2661 — monitored user left, or we left the room ourselves.
  // NOTE: updateState mutates room/myself BEFORE this handler fires.
  // Mute-all hide also injects synthetic 2661s — ignore those.
  unsubs.push(api.onIncoming(2661, ({ packet }) => {
    if (isUsersPacketReplay()) return;
    const cfg = getConfig();
    if (!cfg.roomEnabled || typeof packet.parsed !== "number") return;

    const removed = packet.parsed;
    const session = activeSessions.get(removed);
    if (session) {
      // Real leave of a watched user still in the room from our POV.
      endRoomSession(cfg, removed, session);
      return;
    }

    // Self-leave: store already wiped. Drop open sessions silently — we did not
    // observe them leaving; logging "Saiu" here is wrong and spammy.
    if (api.myself?.index == null && api.room.units.size === 0 && activeSessions.size > 0) {
      activeSessions.clear();
    }
  }));
}

function endRoomSession(
  cfg: LogsConfig,
  index: number,
  session: { name: string; figure: string; ts: number; roomId: number; roomName: string },
): void {
  activeSessions.delete(index);
  const duration = Date.now() - session.ts;
  const roomLabel = session.roomName ? `"${session.roomName}"` : `#${session.roomId}`;
  const msg = `Saiu de ${roomLabel} — ficou ${fmtDuration(duration)}`;
  addLog({ ts: Date.now(), type: "room_leave", actor: session.name, figure: session.figure, duration, message: msg });
  sendWebhook(cfg.roomWebhook, "room_leave", session.name, msg, session.figure);
}

export function teardownLogHandlers(): void {
  stopFriendRoomPoll();
  unsubs.forEach(u => u());
  unsubs = [];
  pendingWhispers.length = 0;
  pendingGroupEchoes.clear();
}
