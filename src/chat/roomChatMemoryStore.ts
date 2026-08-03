export interface RoomChatMessage {
  id: number;
  ts: number;
  roomIndex: number;
  actor: string;
  figure?: string;
  message: string;
  kind: "chat" | "shout" | "whisper";
  bubble: number;
  /** RoomObjectUserType number: 1 user, 2 pet, 3 bot, 4 rentable_bot. */
  unitType?: number;
}

export interface RoomChatSession {
  roomId: number;
  name: string;
  messages: RoomChatMessage[];
  enteredAt: number;
  leftAt: number | null;
}

export interface RoomChatSessionSnapshot {
  activeRoomId: number | null;
  revision: number;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export const ROOM_CHAT_RETENTION_MS = 5 * 60 * 1000;

export class RoomChatMemoryStore {
  private readonly sessions = new Map<number, RoomChatSession>();
  private readonly expiryTimers = new Map<number, TimerHandle>();
  private readonly listeners = new Set<() => void>();
  private snapshot: RoomChatSessionSnapshot = { activeRoomId: null, revision: 0 };
  private nextMessageId = 1;
  private readonly retentionMs: number;
  private readonly now: () => number;
  /** Coalesce rapid chat packets into one React notify per microtask. */
  private publishQueued = false;

  constructor(retentionMs = ROOM_CHAT_RETENTION_MS, now: () => number = Date.now) {
    this.retentionMs = retentionMs;
    this.now = now;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): RoomChatSessionSnapshot {
    return this.snapshot;
  }

  getActiveSession(): RoomChatSession | null {
    return this.snapshot.activeRoomId == null
      ? null
      : this.sessions.get(this.snapshot.activeRoomId) ?? null;
  }

  enter(roomId: number, name = ""): void {
    if (roomId <= 0) return;
    const now = this.now();
    const previousId = this.snapshot.activeRoomId;
    if (previousId != null && previousId !== roomId) this.markLeft(previousId, now);

    const timer = this.expiryTimers.get(roomId);
    if (timer != null) clearTimeout(timer);
    this.expiryTimers.delete(roomId);

    const previous = this.sessions.get(roomId);
    const expired = previous?.leftAt != null && now - previous.leftAt >= this.retentionMs;
    const session: RoomChatSession = !previous || expired
      ? {
          roomId,
          name: name.trim() || `Sala #${roomId}`,
          messages: [],
          enteredAt: now,
          leftAt: null,
        }
      : {
          ...previous,
          name: name.trim() || previous.name,
          enteredAt: now,
          leftAt: null,
        };
    this.sessions.set(roomId, session);
    this.publish(roomId);
  }

  leave(): void {
    const roomId = this.snapshot.activeRoomId;
    if (roomId == null) return;
    this.markLeft(roomId, this.now());
    this.publish(null);
  }

  setRoomName(roomId: number, name: string): void {
    const session = this.sessions.get(roomId);
    const clean = name.trim();
    if (!session || !clean || session.name === clean) return;
    this.sessions.set(roomId, { ...session, name: clean });
    this.publish(this.snapshot.activeRoomId);
  }

  addMessage(roomId: number, message: Omit<RoomChatMessage, "id" | "ts">): void {
    const session = this.sessions.get(roomId);
    if (!session || this.snapshot.activeRoomId !== roomId) return;
    session.messages.push({ ...message, id: this.nextMessageId++, ts: this.now() });
    this.publish(roomId);
  }

  prune(now = this.now()): void {
    let changed = false;
    for (const [roomId, session] of this.sessions) {
      if (
        roomId === this.snapshot.activeRoomId
        || session.leftAt == null
        || now - session.leftAt < this.retentionMs
      ) continue;
      this.sessions.delete(roomId);
      const timer = this.expiryTimers.get(roomId);
      if (timer != null) clearTimeout(timer);
      this.expiryTimers.delete(roomId);
      changed = true;
    }
    if (changed) this.publish(this.snapshot.activeRoomId);
  }

  dispose(): void {
    for (const timer of this.expiryTimers.values()) clearTimeout(timer);
    this.expiryTimers.clear();
    this.sessions.clear();
    this.listeners.clear();
    this.snapshot = { activeRoomId: null, revision: this.snapshot.revision + 1 };
  }

  private markLeft(roomId: number, leftAt: number): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    this.sessions.set(roomId, { ...session, leftAt });
    const previousTimer = this.expiryTimers.get(roomId);
    if (previousTimer != null) clearTimeout(previousTimer);
    this.expiryTimers.set(roomId, setTimeout(() => {
      this.expiryTimers.delete(roomId);
      this.prune();
    }, this.retentionMs));
  }

  private publish(activeRoomId: number | null): void {
    // Keep session state synchronous for readers; only coalesce listener fan-out.
    this.snapshot = {
      activeRoomId,
      revision: this.snapshot.revision + 1,
    };
    if (this.publishQueued) return;
    this.publishQueued = true;
    // rAF: multiple room chat lines in one frame → one React commit.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        this.publishQueued = false;
        this.listeners.forEach(listener => listener());
      });
      return;
    }
    queueMicrotask(() => {
      this.publishQueued = false;
      this.listeners.forEach(listener => listener());
    });
  }
}
