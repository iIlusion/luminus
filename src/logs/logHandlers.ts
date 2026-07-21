import type { LuminusApi } from "../ws/api";
import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { MessengerUpdate, FriendUpdate } from "../messages/incoming/MessengerUpdateParser";
import type { MessengerFriends } from "../messages/incoming/MessengerFriendsParser";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { GuestRoomData } from "../messages/incoming/RoomParsers";
import { PacketReader } from "../protocol/wrapper";
import { addLog } from "./logStore";
import { gmPost } from "../util/gmFetch";
import { linkClickMessage } from "../ui/profileLinks";

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
}
const friendSessions = new Map<number, FriendSession>();

export function getFriendSessions(): ReadonlyMap<number, FriendSession> {
  return friendSessions;
}

function markFriendOnline(id: number, name: string, figure: string): void {
  if (friendSessions.has(id)) return;
  friendSessions.set(id, { name, figure, onlineSince: Date.now(), roomLabel: "?", roomSince: Date.now() });
}

function markFriendRoom(id: number, label: string): void {
  const s = friendSessions.get(id);
  if (!s) return;
  s.roomLabel = label;
  s.roomSince = Date.now();
}

function markFriendOffline(id: number): void {
  friendSessions.delete(id);
}

const REL_LABEL: Record<number, string> = {
  0: "Nenhum",
  1: "Parceiro(a)",
  2: "Melhor amigo(a)",
  3: "Inimigo(a)",
};

// Last outgoing whisper recipient (captured from outgoing 1543, consumed by incoming 2704 echo)
let pendingWhisperTarget: string | null = null;

type FollowFailReason = "invisible" | "timeout";

// Only one follow dance can run at a time (they all borrow api.room). Instead of failing
// concurrent requests, queue them and run serially — a room change never gets dropped just
// because the login snapshot or another friend's follow happens to be in flight.
interface FollowTask {
  friendId: number;
  onFound: (roomName: string, ownerName: string, userCount: number, maxUserCount: number) => void;
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

// Memoized per-roomId GET_GUEST_ROOM (2230) → GetGuestRoomResult (687) lookup, keyed off the
// packet's own `id` field rather than api.room — the friend follow-dance below also uses 687
// and temporarily repurposes api.room for a foreign room, so reading api.room here would race it.
const roomInfoCache = new Map<number, Promise<GuestRoomData | null>>();

function resolveRoomInfo(api: LuminusApi, roomId: number, timeoutMs = 4000): Promise<GuestRoomData | null> {
  const cached = roomInfoCache.get(roomId);
  if (cached) return cached;

  const promise = new Promise<GuestRoomData | null>(resolve => {
    const timer = setTimeout(() => { unsub(); resolve(null); }, timeoutMs);
    const unsub = api.onIncoming(687, ({ packet }) => {
      const r = packet.parsed as GuestRoomData | undefined;
      if (r?.id === roomId) { clearTimeout(timer); unsub(); resolve(r); }
    });
    api.send(2230, [roomId, 0, 0]);
  });

  roomInfoCache.set(roomId, promise);
  promise.then(r => { if (!r) roomInfoCache.delete(roomId); }); // allow retry after a failed lookup
  return promise;
}

// Enqueue a friend-room lookup. Follows run one at a time (see followQueue); duplicate
// pending requests for the same friend collapse to the latest so bursts don't backlog.
function tryGetFriendRoom(
  api: LuminusApi,
  friendId: number,
  onFound: (roomName: string, ownerName: string, userCount: number, maxUserCount: number) => void,
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
    (n, o, c, m) => { task.onFound(n, o, c, m); release(); },
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
  onFound: (roomName: string, ownerName: string, userCount: number, maxUserCount: number) => void,
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
      onFound(`#${roomId}`, "?", 0, 0);
    }, 4000);

    // Match by roomId: the room monitor's resolveRoomInfo may also have a 687 in flight.
    const unsubInfo = api.onIncoming(687, ({ packet: p }) => {
      const r = p.parsed as GuestRoomData | undefined;
      if (r && r.id !== roomId) return;
      clearTimeout(infoTimer);
      unsubInfo();
      Object.assign(api.room, saved);
      if (r) onFound(r.name, r.ownerName, r.userCount, r.maxUserCount);
      else onFound(`#${roomId}`, "?", 0, 0);
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

  // Use best available figure; if still empty, fetch via USER_PROFILE (3265→3898).
  const post = (msg: string, fig: string = bestFigure) => {
    if (fig) {
      addLog({ ts: Date.now(), type: "friend", actor: f.name, figure: fig, message: msg });
      sendWebhook(cfg.friendWebhook, "friend", f.name, msg, fig);
    } else {
      fetchFriendFigure(api, f.id, fetchedFig => {
        friendStates.get(f.id) && (friendStates.get(f.id)!.figure = fetchedFig);
        addLog({ ts: Date.now(), type: "friend", actor: f.name, figure: fetchedFig, message: msg });
        sendWebhook(cfg.friendWebhook, "friend", f.name, msg, fetchedFig);
      });
    }
  };

  const fmtRoom = (name: string, owner: string, cur: number, max: number) =>
    `"${name}"${owner && owner !== "?" ? ` | dono: ${owner}` : ""}${max > 0 ? ` | ${cur}/${max} pessoas` : ""}`;

  if (prev === undefined) {
    // First sight: only log if we can determine the room; skip otherwise.
    if (f.online) {
      markFriendOnline(f.id, f.name, bestFigure);
      if (f.followingAllowed) {
        tryGetFriendRoom(api, f.id,
          (n, o, c, m) => { const label = fmtRoom(n, o, c, m); markFriendRoom(f.id, label); post(`Quarto: ${label}`); },
          (r) => {
            markFriendRoom(f.id, r === "invisible" ? "Quarto Invisível" : "Quarto desconhecido");
            if (r === "invisible") post("Quarto Invisível");
          },
        );
      } else {
        markFriendRoom(f.id, "Vista do hotel");
      }
    }
    return;
  }

  if (!prev.online && f.online) {
    markFriendOnline(f.id, f.name, bestFigure);
    if (f.followingAllowed) {
      tryGetFriendRoom(api, f.id,
        (n, o, c, m) => { const label = fmtRoom(n, o, c, m); markFriendRoom(f.id, label); post(`Ficou online — quarto: ${label}`); },
        (r) => {
          markFriendRoom(f.id, r === "invisible" ? "Quarto Invisível" : "Quarto desconhecido");
          post(r === "invisible" ? "Ficou online (Quarto Invisível)" : "Ficou online");
        },
      );
    } else {
      markFriendRoom(f.id, "Vista do hotel");
      post("Ficou online");
    }
  } else if (prev.online && !f.online) {
    markFriendOffline(f.id);
    post("Se desconectou");
  } else if (prev.online && f.online) {
    // Detect hotel lobby: followingAllowed flipped false while still online
    if (prev.followingAllowed && !f.followingAllowed) {
      markFriendRoom(f.id, "Vista do hotel");
      post("Está na vista do hotel");
    } else if (f.followingAllowed) {
      tryGetFriendRoom(api, f.id,
        (n, o, c, m) => { const label = fmtRoom(n, o, c, m); markFriendRoom(f.id, label); post(`Mudou de quarto — ${label}`); },
        (r) => {
          markFriendRoom(f.id, r === "invisible" ? "Quarto Invisível" : "Quarto desconhecido");
          post(r === "invisible" ? "Mudou de quarto (Quarto Invisível)" : "Fez alguma ação (quarto desconhecido)");
        },
      );
    } else {
      markFriendRoom(f.id, "Quarto privado");
      post("Fez alguma ação (quarto privado)");
    }
  }

  // Side-changes: detect while online (or on reconnect vs cached state)
  if (f.online) {
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

  // Outgoing UNIT_CHAT_WHISPER 1543 — capture recipient before echo arrives.
  // Wire format is a single string field "recipientName rest of message" (classic
  // ":w nome mensagem" syntax) — only the first token is the recipient.
  unsubs.push(api.onOutgoing(1543, ({ packet }) => {
    try {
      const reader = new PacketReader(1543, packet.body);
      pendingWhisperTarget = reader.readString().split(" ")[0] || null;
    } catch {
      pendingWhisperTarget = null;
    }
  }));

  // UNIT_CHAT 1446 — "clicou em voce!" detection
  // The packet is sent FROM a system entity (not the clicker), so roomIndex ≠ clicker.
  // Extract the actor name from the message text and look up their figure by name.
  unsubs.push(api.onIncoming(1446, ({ packet }) => {
    const cfg = getConfig();
    if (!packet.parsed) return;
    const { message } = packet.parsed as RoomChat;
    const clean = stripFormatting(message);
    if (!normalizeTxt(clean).includes("clicou em voce!")) return;
    const actor = clean.match(/^(.+?)\s+clicou/i)?.[1]?.trim() ?? "?";
    linkClickMessage(api, actor, clean);
    if (!cfg.chatEnabled) return;
    const actorFigure = [...api.room.units.values()].find(u => u.name === actor)?.figure;
    const myself = api.myself?.username ?? "";
    addLog({ ts: Date.now(), type: "click", actor, figure: actorFigure, message: clean });
    sendWebhook(cfg.chatWebhook, "click", actor, clean, actorFigure);
  }));

  // UNIT_CHAT_WHISPER 2704 — incoming or echo of own outgoing
  unsubs.push(api.onIncoming(2704, ({ packet }) => {
    const cfg = getConfig();
    if (!cfg.chatEnabled || !packet.parsed) return;
    const { roomIndex, message, bubble } = packet.parsed as RoomChat;
    if ([34, 2].includes(bubble)) return;

    const myself = api.myself?.username ?? "";
    const isMine = api.myself?.index !== null && roomIndex === api.myself?.index;

    if (isMine) {
      // Echo of my own whisper — actor = me, target = who I sent it to
      const target = pendingWhisperTarget ?? "?";
      pendingWhisperTarget = null;
      const figure = api.myself?.figure;
      addLog({ ts: Date.now(), type: "whisper", actor: myself, target, figure, message });
      sendWebhook(cfg.chatWebhook, "whisper", `${myself} → ${target}`, message, figure);
    } else {
      // Incoming whisper from someone else → actor = them, target = me
      const unit = api.room.units.get(roomIndex);
      const actor = unit?.name ?? `#${roomIndex}`;
      addLog({ ts: Date.now(), type: "whisper", actor, target: myself || undefined, figure: unit?.figure, message });
      sendWebhook(cfg.chatWebhook, "whisper", `${actor} → ${myself}`, message, unit?.figure);
    }
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

  // RoomReady 2031 — clear sessions on room change
  unsubs.push(api.onIncoming(2031, () => {
    activeSessions.clear();
  }));

  // Users 374 — monitored users entering room
  // Room name isn't reliably known yet at this point (normal room entry doesn't guarantee
  // GuestRoomData has arrived before the occupant list) — resolve it via GET_GUEST_ROOM and
  // cache it on the session so the eventual "Saiu de" log also gets the real name.
  unsubs.push(api.onIncoming(374, ({ packet }) => {
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

  // UserRemove 2661 — monitored user left
  // NOTE: updateState deletes unit from api.room.units BEFORE this handler fires;
  // rely on activeSessions for name/figure/room data.
  unsubs.push(api.onIncoming(2661, ({ packet }) => {
    const cfg = getConfig();
    if (!cfg.roomEnabled || typeof packet.parsed !== "number") return;
    const session = activeSessions.get(packet.parsed);
    if (!session) return;
    activeSessions.delete(packet.parsed);
    const duration = Date.now() - session.ts;
    const roomLabel = session.roomName ? `"${session.roomName}"` : `#${session.roomId}`;
    const msg = `Saiu de ${roomLabel} — ficou ${fmtDuration(duration)}`;
    addLog({ ts: Date.now(), type: "room_leave", actor: session.name, figure: session.figure, duration, message: msg });
    sendWebhook(cfg.roomWebhook, "room_leave", session.name, msg, session.figure);
  }));
}

export function teardownLogHandlers(): void {
  unsubs.forEach(u => u());
  unsubs = [];
  pendingWhisperTarget = null;
}
