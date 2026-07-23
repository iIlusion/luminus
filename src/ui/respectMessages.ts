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
 * 5. Re-trigger `ping-once` on the bubble (Hibisco visual pulse)
 *
 * Chat does not rise on stack — only the first bubble is updated.
 */

/** Actors from expression 7, consumed LIFO on USER_RESPECT (Hibisco `S`). */
const actorStack: string[] = [];

let apiRef: LuminusApi | null = null;
let pendingEnrich: Array<{ target: string; actor: string | null; until: number }> = [];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Hibisco `C` — prefer stacked overlay text. */
function messageText(bubble: Element): string {
  const el = bubble.querySelector<HTMLElement>(".message.luminus-respect")
    ?? bubble.querySelector<HTMLElement>(".message:not(.luminus-respect)")
    ?? bubble.querySelector<HTMLElement>(".message");
  return (el?.textContent ?? "").trim();
}

function genderSuffix(targetName: string): "o" | "a" {
  const unit = findUnitByName(targetName);
  // Hibisco: M → o, otherwise a
  if (unit?.sex?.toUpperCase() === "M") return "o";
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
  actorStack.push(clean);
  while (actorStack.length > 20) actorStack.shift();
}

/** Hibisco: `S.length ? S.pop() : null` — pure LIFO. */
function popActor(): string | null {
  return actorStack.length ? actorStack.pop()! : null;
}

function respectBubbles(): Element[] {
  return [...document.querySelectorAll(
    ".nitro-chat-widget .bubble-container:not(.luminus-reply):not(.hibisco-reply) > .chat-bubble.bubble-1",
  )];
}

/**
 * Hibisco `E` — bubble matches target (+ optional actor).
 * No leading `^` (Hibisco) so minor Nitro prefixes still match; `$` anchors end.
 */
function bubbleMatchesRespect(bubble: Element, target: string, actor: string | null): boolean {
  const text = messageText(bubble);
  if (!text) return false;
  const tEsc = escapeRegExp(target);
  const aEsc = actor ? escapeRegExp(actor) : "";
  // plain: "X foi respeitado!" or "X foi respeitado por Y!"
  const plain = actor
    ? new RegExp(`${tEsc} foi respeitad.( por ${aEsc})?!$`, "i")
    : new RegExp(`${tEsc} foi respeitad.!?$`, "i");
  const withActorCount = actor
    ? new RegExp(`${tEsc} foi respeitad. por ${aEsc}! \\((?<amount>[0-9]+)x\\)$`, "i")
    : null;
  const withoutActorCount = new RegExp(`${tEsc} foi respeitad.! \\((?<amount>[0-9]+)x\\)$`, "i");
  return plain.test(text)
    || Boolean(withActorCount?.test(text))
    || withoutActorCount.test(text);
}

function hasRespectBubble(target: string, actor: string | null): boolean {
  return respectBubbles().some(b => bubbleMatchesRespect(b, target, actor));
}

/** Hibisco pulse: remove + re-add `ping-once`. */
function pulseBubble(bubble: HTMLElement): void {
  bubble.classList.remove("ping-once");
  window.setTimeout(() => bubble.classList.add("ping-once"), 50);
}

/**
 * Hibisco `O` — update existing bubble-1 text via overlay (original stays for matching).
 */
function updateRespectBubble(target: string, actor: string | null): boolean {
  const sex = genderSuffix(target);
  const tEsc = escapeRegExp(target);
  const aEsc = actor ? escapeRegExp(actor) : "";

  const reWithActor = actor
    ? new RegExp(`${tEsc} foi respeitad. por ${aEsc}!$`, "i")
    : null;
  const reWithActorCount = actor
    ? new RegExp(`${tEsc} foi respeitad. por ${aEsc}! \\((?<amount>[0-9]+)x\\)$`, "i")
    : null;
  const rePlain = new RegExp(`${tEsc} foi respeitad.!$`, "i");
  const rePlainCount = new RegExp(`${tEsc} foi respeitad.! \\((?<amount>[0-9]+)x\\)$`, "i");

  let updated = false;

  for (const node of respectBubbles()) {
    if (!bubbleMatchesRespect(node, target, actor)) continue;

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

    if (!next) continue;

    const original = bubble.querySelector<HTMLElement>(".message:not(.luminus-respect)");
    if (!original) continue;

    bubble.querySelectorAll(".message.luminus-respect").forEach(el => el.remove());

    // Hibisco: clone outerHTML → add class → set text → insertAfter original
    const overlay = original.cloneNode(true) as HTMLElement;
    overlay.classList.add("luminus-respect");
    overlay.textContent = next;
    original.style.visibility = "hidden";
    original.style.position = "absolute";
    overlay.style.visibility = "";
    overlay.style.position = "";
    original.insertAdjacentElement("afterend", overlay);
    pulseBubble(bubble);
    updated = true;
  }

  return updated;
}

function enqueueEnrich(target: string, actor: string | null): void {
  pendingEnrich.push({ target, actor, until: Date.now() + 1500 });
  // Cap queue
  while (pendingEnrich.length > 30) pendingEnrich.shift();
}

function tryPendingEnrich(): void {
  const now = Date.now();
  pendingEnrich = pendingEnrich.filter(item => {
    if (item.until < now) return false;
    if (hasRespectBubble(item.target, item.actor)) {
      updateRespectBubble(item.target, item.actor);
      return false;
    }
    return true;
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

  // Hibisco: S.pop() only — no target filtering
  const actor = popActor();

  if (hasRespectBubble(target.name, actor)) {
    updateRespectBubble(target.name, actor);
    return "block";
  }

  // First respect — let Nitro create the bubble, then enrich label (actor name).
  enqueueEnrich(target.name, actor);
  window.setTimeout(() => {
    if (hasRespectBubble(target.name, actor)) updateRespectBubble(target.name, actor);
    tryPendingEnrich();
  }, 100);
  window.setTimeout(() => tryPendingEnrich(), 250);
  window.setTimeout(() => tryPendingEnrich(), 500);
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
  // Prefer message actor; else LIFO stack (same as Hibisco path).
  const actor = actorFromMsg ?? (actorStack.length ? actorStack[actorStack.length - 1] : null);

  if (hasRespectBubble(target, actor)) {
    if (!actorFromMsg && actorStack.length) popActor();
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
  for (const header of [1446, 1036] as const) {
    api.onIncoming(header, ({ packet }) => onRespectChat(packet));
  }

  api.onIncoming(2031, () => {
    actorStack.length = 0;
    pendingEnrich = [];
  });

  // Catch late Nitro React mounts of bubble-1 for pending enrich.
  const mo = new MutationObserver(() => {
    if (!pendingEnrich.length) return;
    tryPendingEnrich();
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
