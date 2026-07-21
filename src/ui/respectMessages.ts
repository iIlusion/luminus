import type { LuminusApi } from "../ws/api";
import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { UnitExpression } from "../messages/incoming/UnitExpressionParser";
import type { UserRespect } from "../messages/incoming/UserRespectParser";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { DecodedPacket } from "../protocol/types";

/**
 * Respect stacking — port of Hibisco `betterRespectMessages`:
 *
 * 1. UNIT_EXPRESSION 7 → push actor name (who gave respect)
 * 2. USER_RESPECT (target userId) → if a bubble already exists for that target,
 *    update it and block the packet so Nitro does not create another chat slot
 * 3. First respect for a target is left alone (Nitro creates bubble-1)
 * 4. Display: hide original `.message`, overlay a `.message.luminus-respect`
 *    clone with "X foi respeitado(a) por Y! (Nx)"
 *
 * Chat does not rise on stack — only the first bubble is updated.
 */

type PendingActor = { name: string; expiresAt: number };

const CHAT_HEADERS = [1446, 1036] as const;

/** Actors from expression 7, consumed on USER_RESPECT / chat (Hibisco `S`). */
const actorStack: PendingActor[] = [];

let apiRef: LuminusApi | null = null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function messageText(bubble: Element): string {
  const el = bubble.querySelector<HTMLElement>(".message.luminus-respect")
    ?? bubble.querySelector<HTMLElement>(".message:not(.luminus-respect)")
    ?? bubble.querySelector<HTMLElement>(".message");
  return (el?.textContent ?? "").trim();
}

function genderSuffix(targetName: string): "o" | "a" {
  const unit = findUnitByName(targetName);
  if (unit?.sex?.toUpperCase() === "F") return "a";
  return "o";
}

function findUnitByName(name: string): RoomUnit | undefined {
  const key = name.toLocaleLowerCase();
  for (const unit of apiRef?.room.units.values() ?? []) {
    if (unit.name.toLocaleLowerCase() === key) return unit;
  }
  return undefined;
}

function findUnitByWebId(userId: number): RoomUnit | undefined {
  for (const unit of apiRef?.room.units.values() ?? []) {
    if (unit.id === userId) return unit;
  }
  return undefined;
}

function pushActor(name: string): void {
  const clean = name.trim();
  if (!clean) return;
  actorStack.push({ name: clean, expiresAt: Date.now() + 4000 });
  while (actorStack.length > 20) actorStack.shift();
}

function popActor(targetName?: string): string | null {
  const now = Date.now();
  while (actorStack[0] && actorStack[0].expiresAt < now) actorStack.shift();
  if (!actorStack.length) return null;

  const targetKey = targetName?.toLocaleLowerCase();
  if (targetKey) {
    for (let i = actorStack.length - 1; i >= 0; i--) {
      if (actorStack[i].name.toLocaleLowerCase() !== targetKey) {
        return actorStack.splice(i, 1)[0].name;
      }
    }
  }
  return actorStack.pop()?.name ?? null;
}

/** Hibisco `E` — does this bubble match target (+ optional actor)? */
function bubbleMatchesRespect(bubble: Element, target: string, actor: string | null): boolean {
  const text = messageText(bubble);
  const t = escapeRegExp(target);
  const a = actor ? escapeRegExp(actor) : "";
  const plain = actor
    ? new RegExp(`^${t} foi respeitad.( por ${a})?!$`, "i")
    : new RegExp(`^${t} foi respeitad.!?$`, "i");
  const withActorCount = actor
    ? new RegExp(`^${t} foi respeitad. por ${a}! \\((?<amount>[0-9]+)x\\)$`, "i")
    : null;
  const withoutActorCount = new RegExp(`^${t} foi respeitad.! \\((?<amount>[0-9]+)x\\)$`, "i");
  return plain.test(text)
    || Boolean(withActorCount?.test(text))
    || withoutActorCount.test(text);
}

function hasRespectBubble(target: string, actor: string | null): boolean {
  return [...document.querySelectorAll(
    ".nitro-chat-widget .bubble-container:not(.luminus-reply) > .chat-bubble.bubble-1",
  )].some(b => bubbleMatchesRespect(b, target, actor));
}

/**
 * Hibisco `O` — update existing bubble-1 text via overlay (original stays for matching).
 */
function updateRespectBubble(target: string, actor: string | null): void {
  const sex = genderSuffix(target);
  const t = escapeRegExp(target);
  const a = actor ? escapeRegExp(actor) : "";

  const reWithActor = actor
    ? new RegExp(`^${t} foi respeitad. por ${a}!$`, "i")
    : null;
  const reWithActorCount = actor
    ? new RegExp(`^${t} foi respeitad. por ${a}! \\((?<amount>[0-9]+)x\\)$`, "i")
    : null;
  const rePlain = new RegExp(`^${t} foi respeitad.!$`, "i");
  const rePlainCount = new RegExp(`^${t} foi respeitad.! \\((?<amount>[0-9]+)x\\)$`, "i");

  document.querySelectorAll(
    ".nitro-chat-widget .bubble-container:not(.luminus-reply) > .chat-bubble.bubble-1",
  ).forEach(node => {
    if (!bubbleMatchesRespect(node, target, actor)) return;

    const bubble = node as HTMLElement;
    const text = messageText(bubble);
    let next = "";

    if (!actor) {
      if (rePlain.test(text)) next = `${target} foi respeitad${sex}! (1x)`;
      else {
        const m = rePlainCount.exec(text);
        if (m?.groups?.amount) {
          next = `${target} foi respeitad${sex}! (${parseInt(m.groups.amount, 10) + 1}x)`;
        }
      }
    } else if (rePlain.test(text)) {
      next = `${target} foi respeitad${sex} por ${actor}!`;
    } else if (reWithActor?.test(text)) {
      next = `${target} foi respeitad${sex} por ${actor}! (2x)`;
    } else if (reWithActorCount) {
      const m = reWithActorCount.exec(text);
      if (m?.groups?.amount) {
        next = `${target} foi respeitad${sex} por ${actor}! (${parseInt(m.groups.amount, 10) + 1}x)`;
      }
    }

    if (!next) return;

    const original = bubble.querySelector<HTMLElement>(".message:not(.luminus-respect)");
    if (!original) return;

    bubble.querySelectorAll(".message.luminus-respect").forEach(el => el.remove());

    const overlay = original.cloneNode(true) as HTMLElement;
    overlay.classList.add("luminus-respect");
    overlay.textContent = next;
    original.style.visibility = "hidden";
    original.style.position = "absolute";
    overlay.style.visibility = "";
    overlay.style.position = "";
    original.insertAdjacentElement("afterend", overlay);
  });
}

/**
 * Hibisco USER_RESPECT handler:
 * if a bubble already exists → update + block packet (no new chat slot).
 */
function onUserRespect(packet: DecodedPacket): "block" | void {
  const data = packet.parsed as UserRespect | undefined;
  if (!data || data.userId == null) return;

  const target = findUnitByWebId(data.userId);
  if (!target?.name) return;

  const actor = popActor(target.name);

  if (hasRespectBubble(target.name, actor)) {
    updateRespectBubble(target.name, actor);
    return "block";
  }

  // First respect — let Nitro create the bubble, then enrich label shortly after.
  window.setTimeout(() => {
    if (hasRespectBubble(target.name, actor)) updateRespectBubble(target.name, actor);
  }, 100);
}

/**
 * Backup: if a UnitChat "foi respeitado" arrives and we already stacked that target,
 * cancel it and bump the first bubble (covers races / chat-only paths).
 */
function onRespectChat(packet: DecodedPacket): "block" | void {
  const chat = packet.parsed as RoomChat | undefined;
  if (!chat?.message || !/respeitad/i.test(chat.message)) return;

  const match = /^\s*(?<target>.+?)\s+foi\s+respeitad/i.exec(chat.message);
  if (!match?.groups?.target) return;

  const target = match.groups.target.trim();
  const actorFromMsg = /por\s+(?<actor>[^!]+?)!?\s*$/i.exec(chat.message)?.groups?.actor?.trim() ?? null;
  const actor = actorFromMsg ?? popActor(target);

  if (hasRespectBubble(target, actor)) {
    updateRespectBubble(target, actor);
    return "block";
  }
}

export function initRespectMessageGrouping(api: LuminusApi): void {
  if (!document.body || document.body.dataset.luminusRespectObserver === "1") return;
  document.body.dataset.luminusRespectObserver = "1";
  apiRef = api;

  // Hibisco: expression == 7 → S.push(unit.name)
  api.onIncoming(1631, ({ packet }) => {
    const expression = packet.parsed as UnitExpression | undefined;
    if (!expression || expression.expression !== 7) return;
    const unit = api.room.units.get(expression.unitId);
    if (unit?.name) pushActor(unit.name);
  });

  // Hibisco: U.on('USER_RESPECT') — primary stack hook (header 2815).
  api.onIncoming(2815, ({ packet }) => onUserRespect(packet));

  // Backup cancel of chat lines if they still spawn.
  for (const header of CHAT_HEADERS) {
    api.onIncoming(header, ({ packet }) => onRespectChat(packet));
  }

  api.onIncoming(2031, () => {
    actorStack.length = 0;
  });
}
