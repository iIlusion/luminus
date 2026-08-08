import type { LuminusApi } from "../ws/api";
import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { UnitExpression } from "../messages/incoming/UnitExpressionParser";
import type { UserRespect } from "../messages/incoming/UserRespectParser";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { DecodedPacket } from "../protocol/types";

/**
 * Respect stacking — Hibisco-style, but with a single source of truth for counts.
 *
 * Bug history: parsing the DOM and doing `amount + 1` on every path (USER_RESPECT,
 * setTimeout enrich, MutationObserver pending, and UnitChat backup) double-counted
 * the same respect → e.g. 10 real respects showed as 11x (or worse). Chat backup
 * must only cancel a duplicate bubble, never bump the counter.
 *
 * Rules:
 * 1. UNIT_EXPRESSION 7 → actor stack (who gave respect)
 * 2. USER_RESPECT is the only place that increments the in-memory counter (cap 10)
 * 3. First respect for a target: allow Nitro bubble, enrich label once (no "1x")
 * 4. Further respects: block packet, rewrite the existing bubble to "(Nx)"
 * 5. UnitChat "foi respeitad…" backup: block if a bubble already exists — do not +1
 * 6. Match by target only (one bubble per nick, any actor)
 */

const MAX_RESPECTS_PER_USER = 10;
/** How long a stack for the same target stays open (ms). */
const STACK_TTL_MS = 120_000;

/** Actors from expression 7, consumed LIFO on USER_RESPECT. */
const actorStack: string[] = [];

type TargetStack = {
  targetName: string;
  actor: string | null;
  count: number;
  lastAt: number;
  /** First enrich still waiting for Nitro to mount the bubble. */
  pendingEnrich: boolean;
};

/** key = target name lowercased */
const stacks = new Map<string, TargetStack>();

let apiRef: LuminusApi | null = null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stackKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/** Prefer stacked overlay text when present. */
function messageText(bubble: Element): string {
  const el = bubble.querySelector<HTMLElement>(".message.luminus-respect")
    ?? bubble.querySelector<HTMLElement>(".message:not(.luminus-respect)")
    ?? bubble.querySelector<HTMLElement>(".message");
  return (el?.textContent ?? "").trim();
}

function genderSuffix(targetName: string): "o" | "a" {
  const unit = findUnitByName(targetName);
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

function popActor(): string | null {
  return actorStack.length ? actorStack.pop()! : null;
}

function respectBubbles(): HTMLElement[] {
  return [...document.querySelectorAll(
    ".nitro-chat-widget .bubble-container:not(.luminus-reply):not(.hibisco-reply) > .chat-bubble.bubble-1",
  )] as HTMLElement[];
}

/** Any system respect line for this target (with or without actor / count). */
function bubbleMatchesTarget(bubble: Element, target: string): boolean {
  const text = messageText(bubble);
  if (!text) return false;
  const tEsc = escapeRegExp(target);
  // "X foi respeitado!" | "X foi respeitada por Y!" | "… (Nx)"
  return new RegExp(
    `^\\s*${tEsc}\\s+foi\\s+respeitad[oa](?:\\s+por\\s+.+?)?!?(?:\\s*\\([0-9]+x\\))?\\s*$`,
    "i",
  ).test(text);
}

function findRespectBubble(target: string): HTMLElement | null {
  for (const node of respectBubbles()) {
    if (bubbleMatchesTarget(node, target)) return node;
  }
  return null;
}

function pulseBubble(bubble: HTMLElement): void {
  bubble.classList.remove("ping-once");
  window.setTimeout(() => bubble.classList.add("ping-once"), 50);
}

function formatRespectText(target: string, actor: string | null, count: number): string {
  const sex = genderSuffix(target);
  const base = actor
    ? `${target} foi respeitad${sex} por ${actor}!`
    : `${target} foi respeitad${sex}!`;
  // First hit has no counter (Hibisco); stack shows 2x…10x.
  if (count <= 1) return base;
  return `${base} (${Math.min(MAX_RESPECTS_PER_USER, count)}x)`;
}

/**
 * Write absolute count into the first matching bubble (never +1 from DOM text).
 * If multiple duplicates exist, collapse extras by hiding them.
 */
function applyRespectBubble(target: string, actor: string | null, count: number): boolean {
  const matches = respectBubbles().filter(b => bubbleMatchesTarget(b, target));
  if (!matches.length) return false;

  const [primary, ...dupes] = matches;
  const next = formatRespectText(target, actor, count);

  const original = primary.querySelector<HTMLElement>(".message:not(.luminus-respect)");
  if (!original) return false;

  primary.querySelectorAll(".message.luminus-respect").forEach(el => el.remove());

  const overlay = original.cloneNode(true) as HTMLElement;
  overlay.classList.add("luminus-respect");
  overlay.textContent = next;
  original.style.visibility = "hidden";
  original.style.position = "absolute";
  overlay.style.visibility = "";
  overlay.style.position = "";
  original.insertAdjacentElement("afterend", overlay);
  pulseBubble(primary);

  // Hide accidental duplicate bubbles for the same target (race / double packet).
  for (const dupe of dupes) {
    dupe.style.display = "none";
    dupe.setAttribute("data-luminus-respect-dupe", "1");
  }

  return true;
}

function getLiveStack(targetName: string): TargetStack | undefined {
  const key = stackKey(targetName);
  const stack = stacks.get(key);
  if (!stack) return undefined;
  if (Date.now() - stack.lastAt > STACK_TTL_MS) {
    stacks.delete(key);
    return undefined;
  }
  return stack;
}

function tryPendingEnrich(): void {
  for (const stack of stacks.values()) {
    if (!stack.pendingEnrich) continue;
    if (applyRespectBubble(stack.targetName, stack.actor, stack.count)) {
      stack.pendingEnrich = false;
    }
  }
}

function scheduleEnrich(): void {
  // Single retry ladder — each step only rewrites absolute text, never increments.
  const delays = [50, 120, 280, 500];
  for (const ms of delays) {
    window.setTimeout(() => tryPendingEnrich(), ms);
  }
}

/**
 * USER_RESPECT — only place that may increment the counter.
 * Increment only when we already have an in-memory stack from a prior 2815
 * (never because a chat bubble already exists — that was the same single respect).
 */
function onUserRespect(packet: DecodedPacket): "block" | void {
  const data = packet.parsed as UserRespect | undefined;
  if (!data || data.userId == null) return;

  const target = findUnitByWebId(data.userId);
  if (!target?.name) return;

  const actor = popActor();
  const key = stackKey(target.name);
  const now = Date.now();
  const existing = getLiveStack(target.name);

  if (existing) {
    existing.count = Math.min(MAX_RESPECTS_PER_USER, existing.count + 1);
    if (actor) existing.actor = actor;
    existing.lastAt = now;
    existing.pendingEnrich = !applyRespectBubble(existing.targetName, existing.actor, existing.count);
    if (existing.pendingEnrich) scheduleEnrich();
    // Always block after the first — Nitro must not open another chat slot.
    return "block";
  }

  // First USER_RESPECT for this target in the TTL window.
  const stack: TargetStack = {
    targetName: target.name,
    actor,
    count: 1,
    lastAt: now,
    pendingEnrich: true,
  };
  stacks.set(key, stack);

  // Chat may have already painted the first line — enrich and block so 2815
  // does not spawn a second bubble for the same respect.
  if (findRespectBubble(target.name)) {
    stack.pendingEnrich = !applyRespectBubble(stack.targetName, stack.actor, stack.count);
    if (stack.pendingEnrich) scheduleEnrich();
    return "block";
  }

  scheduleEnrich();
  // Allow Nitro to create the first bubble-1.
}

/**
 * Chat backup: cancel a second Nitro line for an already-stacked target.
 * Never increments the counter (that was the main 11x bug).
 */
function onRespectChat(packet: DecodedPacket): "block" | void {
  const chat = packet.parsed as RoomChat | undefined;
  if (!chat?.message || !/respeitad/i.test(chat.message)) return;

  const match = /^\s*(?<target>.+?)\s+foi\s+respeitad/i.exec(chat.message);
  if (!match?.groups?.target) return;

  const target = match.groups.target.trim();
  const stack = getLiveStack(target);
  const bubble = findRespectBubble(target);

  if (stack || bubble) {
    // Keep display in sync with memory if we already counted this respect via 2815.
    if (stack) {
      applyRespectBubble(stack.targetName, stack.actor, stack.count);
    }
    return "block";
  }
}

function resetRoomState(): void {
  actorStack.length = 0;
  stacks.clear();
}

export function initRespectMessageGrouping(api: LuminusApi): void {
  if (!document.body || document.body.dataset.luminusRespectObserver === "1") return;
  document.body.dataset.luminusRespectObserver = "1";
  apiRef = api;

  api.onIncoming(1631, ({ packet }) => {
    const expression = packet.parsed as UnitExpression | undefined;
    if (!expression || expression.expression !== 7) return;
    const unit = api.room.units.get(expression.unitId);
    if (unit?.name) pushActor(unit.name);
  });

  api.onIncoming(2815, ({ packet }) => onUserRespect(packet));

  for (const header of [1446, 1036] as const) {
    api.onIncoming(header, ({ packet }) => onRespectChat(packet));
  }

  // Room enter / ready — drop stacks so counts never carry across rooms.
  api.onIncoming(2031, () => resetRoomState());
  api.onIncoming(749, () => resetRoomState());

  const mo = new MutationObserver(() => {
    let anyPending = false;
    for (const s of stacks.values()) {
      if (s.pendingEnrich) {
        anyPending = true;
        break;
      }
    }
    if (anyPending) tryPendingEnrich();
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
