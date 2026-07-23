import type { LuminusApi } from "../ws/api";
import type { MessengerSearch } from "../messages/incoming/MessengerSearchParser";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import { UserProfileComposer } from "../messages/outgoing/UserProfileComposer";
import { HabboSearchComposer } from "../messages/outgoing/HabboSearchComposer";
import { ensureRoomEngine } from "../room/nitroWorldOverlay";
import { getTargetWindow } from "../ws/interceptWebSocket";
import { findRoomUnitByName, handleCtrlUserClick } from "./userClickActions";

const ROOM_UNIT_CATEGORY = 100;

interface NitroRoomEngine {
  objectEventHandler?: {
    setSelectedObject?(roomId: number, objectId: number, category: number): void;
  };
}

export function openUserProfile(api: LuminusApi, name: string): void {
  const roomUnit = findRoomUnitByName(api, name);
  if (roomUnit) {
    openRoomUserUi(api, roomUnit);
    api.send(new UserProfileComposer(roomUnit.id));
    return;
  }

  let done = false;
  const unsubscribe = api.onIncoming(973, ({ packet }) => {
    if (done) return;

    const search = packet.parsed as MessengerSearch | undefined;
    const result = search?.users.find(user => user.name === name);
    if (!result) return;

    done = true;
    unsubscribe();
    api.send(new UserProfileComposer(result.id));
  });

  const timeout = window.setTimeout(() => {
    done = true;
    unsubscribe();
  }, 5000);

  if (!api.send(new HabboSearchComposer(name))) {
    window.clearTimeout(timeout);
    done = true;
    unsubscribe();
  }
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function openRoomUserUi(api: LuminusApi, unit: RoomUnit): void {
  const roomId = api.room.id;
  const roomEngine = ensureRoomEngine(getTargetWindow()) as NitroRoomEngine | null;
  if (roomId == null) return;
  roomEngine?.objectEventHandler?.setSelectedObject?.(roomId, unit.index, ROOM_UNIT_CATEGORY);
}

export function bindProfileLink(element: HTMLElement, name: string, api: LuminusApi): void {
  if (element.dataset.luminusProfileName === name) return;

  element.dataset.luminusProfileName = name;
  element.classList.add("luminus-profile-link");
  element.setAttribute("role", "button");
  element.tabIndex = 0;
  let lastOpenAt = 0;
  const open = (event: Event) => {
    if (event instanceof MouseEvent && handleCtrlUserClick(event, api, name)) return;
    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - lastOpenAt < 350) return;
    lastOpenAt = now;
    openUserProfile(api, name);
  };
  element.addEventListener("pointerup", open, true);
  element.addEventListener("click", open);
  element.addEventListener("keydown", event => {
    if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) open(event);
  });
}

function wrapActor(bubble: HTMLElement, actor: string, api: LuminusApi): boolean {
  if (bubble.querySelector(".luminus-chat-profile-link")) return true;

  const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const start = node.nodeValue?.indexOf(actor) ?? -1;
    if (start < 0) continue;

    const actorNode = node.splitText(start);
    actorNode.splitText(actor.length);
    const link = document.createElement("span");
    link.className = "luminus-chat-profile-link";
    link.textContent = actor;
    bindProfileLink(link, actor, api);
    actorNode.parentNode?.replaceChild(link, actorNode);
    return true;
  }

  return false;
}

export function linkClickMessage(api: LuminusApi, actor: string, message: string): void {
  const expected = normalizeText(message);
  const actorText = normalizeText(actor);
  const tryLink = (): boolean => {
    const bubbles = [...document.querySelectorAll<HTMLElement>(".nitro-chat-widget .chat-bubble")].reverse();
    const bubble = bubbles.find(element => {
      const text = normalizeText(element.textContent ?? "");
      return text.includes(expected) || (text.includes(actorText) && text.includes("clicou em voce"));
    });
    return bubble ? wrapActor(bubble, actor, api) : false;
  };

  if (tryLink() || !document.body) return;

  const observer = new MutationObserver(() => {
    if (tryLink()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 3000);
}

export function initHighScoreProfileLinks(api: LuminusApi): void {
  if (!document.body || document.body.dataset.luminusHighScoreProfiles === "1") return;

  document.body.dataset.luminusHighScoreProfiles = "1";
  const scan = () => {
    document.querySelectorAll<HTMLElement>(
      ".nitro-widget-high-score .menu-list .overflow-auto.flex-column.gap-1.h-100.w-100 > .d-flex.align-items-center"
    ).forEach(row => {
      const name = row.querySelector<HTMLElement>(".col-7");
      const value = name?.textContent?.trim();
      if (name && value) bindProfileLink(name, value, api);
    });
  };

  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}
