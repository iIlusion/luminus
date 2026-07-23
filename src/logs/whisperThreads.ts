import type { LogEntry } from "./logStore";

export interface WhisperContact {
  key: string;
  kind: "user" | "group";
  label: string;
  recipient: string;
  members: string[];
  historyKeys: string[];
}

export interface WhisperDay {
  key: string;
  ts: number;
  entries: LogEntry[];
}

function sameName(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a && b && a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0);
}

function normalizedName(name: string): string {
  return name.toLocaleLowerCase().normalize("NFC");
}

function groupKey(members: string[]): string {
  return `group:${members.map(normalizedName).sort().join("|")}`;
}

export function normalizeLogEntry(entry: LogEntry): LogEntry {
  if (entry.type !== "whisper") return entry;
  const match = /^Grupo de sussurro\s*\(([^)]*)\):\s*(.*)$/isu.exec(entry.message);
  if (!match) return entry;

  const members = [entry.actor, ...match[1].split(",")]
    .map(name => name.trim())
    .filter((name, index, all) => name && all.findIndex(item => sameName(item, name)) === index)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));

  return { ...entry, message: match[2], target: "group", groupMembers: members };
}

export function createWhisperUserContact(name: string): WhisperContact {
  const key = `user:${normalizedName(name)}`;
  return { key, kind: "user", label: name, recipient: name, members: [], historyKeys: [key] };
}

export function getWhisperPeer(entry: LogEntry, myself: string): string | null {
  if (entry.type === "click") return sameName(entry.actor, myself) ? null : entry.actor;
  if (entry.type !== "whisper" || entry.groupMembers?.length) return null;
  return sameName(entry.actor, myself) ? entry.target ?? null : entry.actor;
}

export function getWhisperConversationKey(entry: LogEntry, myself: string): string | null {
  if (entry.type !== "whisper" && entry.type !== "click") return null;
  if (entry.groupMembers?.length) return groupKey(entry.groupMembers);
  const peer = getWhisperPeer(entry, myself);
  return peer && peer !== "?" ? createWhisperUserContact(peer).key : null;
}

export function hasDirectWhisperHistory(logs: LogEntry[], myself: string, contactKey: string): boolean {
  return logs.some(entry =>
    entry.type === "whisper"
    && !entry.groupMembers?.length
    && getWhisperConversationKey(entry, myself) === contactKey
  );
}

export function getWhisperContacts(logs: LogEntry[], myself: string): WhisperContact[] {
  const groups = resolveGroups(logs);
  const directWhisperKeys = new Set(
    logs
      .filter(entry => entry.type === "whisper" && !entry.groupMembers?.length)
      .map(entry => getWhisperConversationKey(entry, myself))
      .filter((key): key is string => Boolean(key))
  );

  const contacts: WhisperContact[] = [];
  for (const entry of logs) {
    const group = groups.byEntry.get(entry);
    const key = group?.key ?? getWhisperConversationKey(entry, myself);
    if (!key || contacts.some(contact => contact.key === key)) continue;
    if (entry.type === "click" && !directWhisperKeys.has(key)) continue;
    if (group) {
      contacts.push(group);
      continue;
    }
    const peer = getWhisperPeer(entry, myself);
    if (peer) contacts.push(createWhisperUserContact(peer));
  }
  return contacts;
}

export function getWhisperThread(logs: LogEntry[], myself: string, contact: WhisperContact): LogEntry[] {
  return logs
    .filter(entry => {
      if (contact.kind === "user") return getWhisperConversationKey(entry, myself) === contact.key;
      return Boolean(entry.groupMembers?.length && contact.historyKeys.includes(groupKey(entry.groupMembers)));
    })
    .reverse();
}

function resolveGroups(logs: LogEntry[]): {
  byEntry: Map<LogEntry, WhisperContact>;
} {
  const byEntry = new Map<LogEntry, WhisperContact>();
  const byRoster = new Map<string, WhisperContact>();

  for (const entry of [...logs].reverse()) {
    const rawRoster = entry.groupMembers;
    if (!rawRoster?.length) continue;
    const members = uniqueNames(rawRoster);
    const key = groupKey(members);
    let contact = byRoster.get(key);

    if (!contact) {
      contact = {
        key,
        kind: "group",
        label: `Group ${byRoster.size + 1}`,
        recipient: "group",
        members,
        historyKeys: [key],
      };
      byRoster.set(key, contact);
    }

    byEntry.set(entry, contact);
  }

  return { byEntry };
}

function uniqueNames(names: string[]): string[] {
  return names
    .filter((name, index, all) => name && all.findIndex(item => sameName(item, name)) === index)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));
}

export function groupWhispersByDay(entries: LogEntry[]): WhisperDay[] {
  const groups: WhisperDay[] = [];

  for (const entry of entries) {
    const date = new Date(entry.ts);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, ts: entry.ts, entries: [entry] });
  }

  return groups;
}
