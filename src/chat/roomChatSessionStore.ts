import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { GuestRoomData, RoomReady } from "../messages/incoming/RoomParsers";
import type { LuminusApi } from "../ws/api";
import { isNativeGroupManagementNotice } from "./nativeGroupMount";
import {
  RoomChatMemoryStore,
  type RoomChatSession,
  type RoomChatSessionSnapshot,
} from "./roomChatMemoryStore";

export type { RoomChatMessage, RoomChatSession } from "./roomChatMemoryStore";

const roomChatStore = new RoomChatMemoryStore();
const roomNames = new Map<number, string>();
let started = false;

export function startRoomChatSessions(api: LuminusApi): void {
  if (started) return;
  started = true;

  api.onPacket(packet => {
    if (packet.direction !== "incoming") return;

    if (packet.header === 2031 && packet.parsed) {
      const room = packet.parsed as RoomReady;
      roomChatStore.enter(room.roomId, roomNames.get(room.roomId));
      return;
    }

    if (packet.header === 687 && packet.parsed) {
      const room = packet.parsed as GuestRoomData;
      roomNames.set(room.id, room.name);
      if (room.id === roomChatStore.getSnapshot().activeRoomId) {
        roomChatStore.setRoomName(room.id, room.name);
      }
      return;
    }

    if (packet.header === 2661) {
      if (roomChatStore.getSnapshot().activeRoomId != null && api.room.id == null) {
        roomChatStore.leave();
      }
      return;
    }

    // Room chat history: speak + shout only. Whispers (2704) stay in private threads, not the room log.
    if (![1446, 1036].includes(packet.header) || !packet.parsed) return;
    const roomId = roomChatStore.getSnapshot().activeRoomId;
    if (roomId == null || api.room.id !== roomId) return;
    const chat = packet.parsed as RoomChat;
    if (!chat.message || isNativeGroupManagementNotice(chat.message)) return;
    const unit = api.room.units.get(chat.roomIndex);
    const isMine = api.myself?.index != null && chat.roomIndex === api.myself.index;
    roomChatStore.addMessage(roomId, {
      roomIndex: chat.roomIndex,
      actor: unit?.name ?? (isMine ? api.myself?.username : undefined) ?? "Sistema",
      figure: unit?.figure ?? (isMine ? api.myself?.figure : undefined),
      message: chat.message,
      kind: packet.header === 1036 ? "shout" : "chat",
      bubble: chat.bubble,
      unitType: unit?.type,
    });
  });
}

export function subscribeRoomChatSessions(listener: () => void): () => void {
  return roomChatStore.subscribe(listener);
}

export function getRoomChatSessionSnapshot(): RoomChatSessionSnapshot {
  return roomChatStore.getSnapshot();
}

export function getActiveRoomChatIdSnapshot(): number | null {
  return roomChatStore.getSnapshot().activeRoomId;
}

export function getActiveRoomChatSession(): RoomChatSession | null {
  return roomChatStore.getActiveSession();
}

/** Diag/stress only: push a synthetic room chat line into the active session memory. */
export function diagInjectRoomChatMessage(input: {
  actor: string;
  message: string;
  figure?: string;
  roomIndex?: number;
  kind?: "chat" | "shout" | "whisper";
  bubble?: number;
}): boolean {
  const roomId = roomChatStore.getSnapshot().activeRoomId;
  if (roomId == null) return false;
  roomChatStore.addMessage(roomId, {
    roomIndex: input.roomIndex ?? -1,
    actor: input.actor,
    figure: input.figure,
    message: input.message,
    kind: input.kind ?? "chat",
    bubble: input.bubble ?? 0,
  });
  return true;
}

/** Diag/stress only: active room session message count (0 if none). */
export function diagGetActiveRoomChatMessageCount(): number {
  return roomChatStore.getActiveSession()?.messages.length ?? 0;
}
