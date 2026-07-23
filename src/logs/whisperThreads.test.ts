import type { LogEntry } from "./logStore.ts";
import { getWhisperContacts, getWhisperThread, groupWhispersByDay, hasDirectWhisperHistory, normalizeLogEntry } from "./whisperThreads.ts";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

const logs: LogEntry[] = [
  { ts: 5, type: "whisper", actor: "Eu", target: "group", groupMembers: ["Ana", "Beto", "Caio", "Duda", "Eu"], message: "grupo dois" },
  { ts: 4, type: "whisper", actor: "Eu", target: "group", groupMembers: ["Ana", "Beto", "Eu"], message: "grupo um" },
  { ts: 3, type: "whisper", actor: "Eu", target: "Ana", message: "três" },
  { ts: 2, type: "whisper", actor: "ANA", target: "Eu", message: "dois" },
  { ts: 1, type: "whisper", actor: "Beto", target: "Eu", message: "um" },
  { ts: 0, type: "click", actor: "Cris", message: "click" },
];

const contacts = getWhisperContacts(logs, "Eu");
assert(contacts.map(contact => contact.label).join(",") === "Group 2,Group 1,Ana,Beto", "session contacts must be unique and recent first");
assert(contacts[0].members.join(",") === "Ana,Beto,Caio,Duda,Eu", "a cumulative roster must keep the exact members that were logged");
assert(contacts[1].members.join(",") === "Ana,Beto,Eu", "the first group must keep its original members");
assert(getWhisperThread(logs, "Eu", contacts[2]).map(entry => entry.ts).join(",") === "2,3", "thread must match names and be chronological");
assert(!hasDirectWhisperHistory(logs, "Eu", "user:cris"), "click-only users must not count as chat history");

const logsWithWhisperAfterClick: LogEntry[] = [
  { ts: 11, type: "whisper", actor: "Eu", target: "Cris", message: "oi" },
  { ts: 10, type: "click", actor: "Cris", message: "click" },
];
const clickContacts = getWhisperContacts(logsWithWhisperAfterClick, "Eu");
assert(clickContacts.map(contact => contact.label).join(",") === "Cris", "a click must reuse the conversation once a whisper exists");
assert(getWhisperThread(logsWithWhisperAfterClick, "Eu", clickContacts[0]).map(entry => entry.type).join(",") === "click,whisper", "click logs must appear inside an existing whisper conversation");

const normalized = normalizeLogEntry({
  ts: 5,
  type: "whisper",
  actor: "Timido",
  target: "group",
  message: "Grupo de sussurro (lethercry, neverknow): teste",
});
assert(normalized.message === "teste", "group prefix must be removed from history");
assert(normalized.groupMembers?.length === 3 && normalized.groupMembers.includes("Timido"), "group members must include the sender");

const dated = [
  { ...logs[2], ts: new Date(2026, 6, 21, 23, 59).getTime() },
  { ...logs[1], ts: new Date(2026, 6, 22, 0, 1).getTime() },
  { ...logs[0], ts: new Date(2026, 6, 22, 8, 30).getTime() },
];
const days = groupWhispersByDay(dated);
assert(days.length === 2 && days[1].entries.length === 2, "messages must be grouped by local day");

console.log("whisperThreads: ok");
