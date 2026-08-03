import { NativeGroupWhisperMemberComposer } from "../messages/outgoing/NativeGroupWhisperMemberComposer";
import { RoomUnitWhisperComposer } from "../messages/outgoing/RoomUnitWhisperComposer";
import type { LuminusApi } from "../ws/api";
import { withGroupWhisperRoute } from "./groupWhisperRouting";
import { resetNativeGroupMembers } from "./nativeGroupWhisperReset";

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function normalizeMember(name: string): string {
  return name.trim();
}

/** Stable key for a whisper-group roster (case/accent insensitive, order-independent). */
export function nativeGroupRosterKey(members: string[]): string {
  return members
    .map(normalizeMember)
    .filter(Boolean)
    .map(name => name.toLocaleLowerCase().normalize("NFC"))
    .sort()
    .join("\u0000");
}

function isInRoom(api: LuminusApi, name: string): boolean {
  for (const unit of api.room.units.values()) {
    if (unit.type === 1 && sameName(unit.name, name)) return true;
  }
  return false;
}

/** Who among `members` (except self) is currently in the room — used to know when to re-add. */
function inRoomOthersKey(api: LuminusApi, members: string[], myself: string): string {
  return members
    .map(normalizeMember)
    .filter(name => name && !sameName(name, myself) && isInRoom(api, name))
    .map(name => name.toLocaleLowerCase().normalize("NFC"))
    .sort()
    .join("\u0000");
}

/** Logical group roster (full, even if some left the room). */
let mountedKey = "";
/** Subset of members that were in-room at last successful mount. */
let mountedInRoomKey = "";
let mountedMembers: string[] = [];

export function getMountedNativeGroupKey(): string {
  return mountedKey;
}

export function getMountedNativeGroupMembers(): readonly string[] {
  return mountedMembers;
}

/** Mark native group as cleared (after reset / clear input). */
export function markNativeGroupCleared(): void {
  mountedKey = "";
  mountedInRoomKey = "";
  mountedMembers = [];
}

/**
 * Remember a roster learned from a native Habblet group echo (user built the group in the client UI).
 * Does not send packets — only updates Luminus snapshot for history continuity.
 */
export function rememberNativeGroupRoster(members: string[], myself = ""): void {
  const roster = members.map(normalizeMember).filter(Boolean);
  if (roster.length < 2) return;
  const key = nativeGroupRosterKey(roster);
  mountedKey = key;
  mountedMembers = [...roster];
  // In-room subset unknown here; leave empty so next ensureNativeGroupMounted may remount.
  mountedInRoomKey = "";
  void myself;
}

/**
 * Ensure Habblet's native whisper group matches the *logical* roster.
 * - same logical roster and same in-room subset → no-op
 * - someone returned to the room → remount to re-add them
 * - people out of room are skipped on 1544 (cannot be added) but stay in the Luminus group identity
 */
export function ensureNativeGroupMounted(api: LuminusApi, members: string[], myself: string): boolean {
  const roster = members.map(normalizeMember).filter(Boolean);
  const key = nativeGroupRosterKey(roster);
  const inRoomKey = inRoomOthersKey(api, roster, myself);

  if (key && key === mountedKey && inRoomKey === mountedInRoomKey) return true;

  const othersInRoom = roster.filter(name => !sameName(name, myself) && isInRoom(api, name));

  if (!resetNativeGroupMembers(api, true) && mountedKey) {
    // Reset failed; still attempt adds.
  }
  markNativeGroupCleared();

  if (othersInRoom.length === 0) {
    // Nobody else in room — still remember logical roster so history stays one group.
    mountedKey = key;
    mountedInRoomKey = "";
    mountedMembers = [...roster];
    return true;
  }

  for (const name of othersInRoom) {
    // Packet send success ≠ Habblet accepted the add; we still try every in-room member.
    api.send(new NativeGroupWhisperMemberComposer(name));
  }

  mountedKey = key;
  mountedInRoomKey = inRoomKey;
  mountedMembers = [...roster];
  return true;
}

/**
 * Send a group whisper. History always uses the full logical `members` list
 * (so leaving the room does not open a new Luminus group tab).
 */
export function sendNativeGroupWhisper(api: LuminusApi, members: string[], myself: string, message: string): boolean {
  if (!ensureNativeGroupMounted(api, members, myself)) return false;
  // Route carries the full roster for pending/history even if native group is smaller.
  return withGroupWhisperRoute(members, () => api.send(new RoomUnitWhisperComposer("group", message)));
}

/** True for Habblet system lines about whisper-group membership (PT). */
export function isNativeGroupManagementNotice(message: string): boolean {
  // Live capture examples (no space before "foi"):
  //   "apmfoi adicionado ao seu grupo de sussurro!"
  //   "melancoliefoi adicionado ao seu grupo de sussurro com: apm!"
  const clean = message
    .replace(/@\w+@/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return false;
  if (/Grupo de sussurro\s*\([^)]*\):/i.test(clean)) return false; // real group chat
  return (
    /foi adicionado(?:a)? ao (?:seu )?grupo de sussurro/i.test(clean)
    || /foi removido(?:a)? do (?:seu )?grupo de sussurro/i.test(clean)
    || /adicionou\b.+\bao (?:seu )?grupo de sussurro/i.test(clean)
    || /removeu\b.+\bdo (?:seu )?grupo de sussurro/i.test(clean)
    || /você adicionou\b/i.test(clean)
    || /voce adicionou\b/i.test(clean)
    || (/grupo de sussurro/i.test(clean) && /adicion/i.test(clean) && !/:\s*\S/.test(clean))
  );
}

/**
 * Nitro paints membership notices client-side when 1544 is processed — often no 2704.
 * Strip those bubbles from the room chat so rebuilds stay silent.
 */
export function initNativeGroupNoticeHider(): () => void {
  const hide = (root: ParentNode = document) => {
    const nodes = root.querySelectorAll<HTMLElement>(
      ".bubble-container, .chat-bubble, .nitro-chat-widget .chat-content, .chat-content",
    );
    for (const el of nodes) {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 240) continue;
      if (!isNativeGroupManagementNotice(text)) continue;
      const bubble = el.closest<HTMLElement>(".bubble-container") ?? el;
      bubble.style.display = "none";
      bubble.setAttribute("data-luminus-hidden-group-notice", "1");
    }
  };

  hide();
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        hide(node);
        if (node.parentElement) hide(node.parentElement);
      }
    }
  });
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    hide();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  return () => observer.disconnect();
}
