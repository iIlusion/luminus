import type { LogEntry } from "./logStore.ts";
import { getWhisperContacts, getWhisperThread, groupWhispersByDay, hasDirectWhisperHistory, normalizeLogEntry } from "./whisperThreads.ts";

/** Fixtures only — synthetic names, never real hotel nicks. */
function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

const SELF = "SelfUser";
const A = "PlayerA";
const B = "PlayerB";
const C = "PlayerC";
const D = "PlayerD";
const E = "PlayerE";

const logs: LogEntry[] = [
  { ts: 5, type: "whisper", actor: SELF, target: "group", groupMembers: [A, B, C, D, SELF], message: "grupo dois" },
  { ts: 4, type: "whisper", actor: SELF, target: "group", groupMembers: [A, B, SELF], message: "grupo um" },
  { ts: 3, type: "whisper", actor: SELF, target: A, message: "três" },
  { ts: 2, type: "whisper", actor: A.toUpperCase(), target: SELF, message: "dois" },
  { ts: 1, type: "whisper", actor: B, target: SELF, message: "um" },
  { ts: 0, type: "click", actor: E, message: "click" },
];

const contacts = getWhisperContacts(logs, SELF);
assert(contacts.map(contact => contact.label).join(",") === `Group 2,Group 1,${A},${B}`, "session contacts must be unique and recent first");
assert(contacts[0].members.join(",") === `${A},${B},${C},${D},${SELF}`, "a cumulative roster must keep the exact members that were logged");
assert(contacts[1].members.join(",") === `${A},${B},${SELF}`, "the first group must keep its original members");
assert(getWhisperThread(logs, SELF, contacts[2]).map(entry => entry.ts).join(",") === "2,3", "thread must match names and be chronological");
assert(!hasDirectWhisperHistory(logs, SELF, `user:${E.toLowerCase()}`), "click-only users must not count as chat history");

const logsWithWhisperAfterClick: LogEntry[] = [
  { ts: 11, type: "whisper", actor: SELF, target: E, message: "oi" },
  { ts: 10, type: "click", actor: E, message: "click" },
];
const clickContacts = getWhisperContacts(logsWithWhisperAfterClick, SELF);
assert(clickContacts.map(contact => contact.label).join(",") === E, "a click must reuse the conversation once a whisper exists");
assert(getWhisperThread(logsWithWhisperAfterClick, SELF, clickContacts[0]).map(entry => entry.type).join(",") === "click,whisper", "click logs must appear inside an existing whisper conversation");

const normalized = normalizeLogEntry({
  ts: 5,
  type: "whisper",
  actor: SELF,
  target: "group",
  message: `Grupo de sussurro (${A}, ${B}): teste`,
});
assert(normalized.message === "teste", "group prefix must be removed from history");
assert(normalized.groupMembers?.length === 3 && normalized.groupMembers.includes(SELF), "group members must include the sender");

const dated = [
  { ...logs[2], ts: new Date(2026, 6, 21, 23, 59).getTime() },
  { ...logs[1], ts: new Date(2026, 6, 22, 0, 1).getTime() },
  { ...logs[0], ts: new Date(2026, 6, 22, 8, 30).getTime() },
];
const days = groupWhispersByDay(dated);
assert(days.length === 2 && days[1].entries.length === 2, "messages must be grouped by local day");

console.log("whisperThreads: ok");
