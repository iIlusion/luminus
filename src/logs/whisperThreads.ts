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
  const peer = sameName(entry.actor, myself) ? entry.target ?? null : entry.actor;
  // Broken native-group rows used to log target "group" without members — not a real user.
  if (peer && peer.toLocaleLowerCase("pt-BR") === "group") return null;
  return peer;
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

export function getDirectWhisperHistoryKeys(logs: LogEntry[], myself: string): Set<string> {
  const keys = new Set<string>();
  for (const entry of logs) {
    if (entry.type !== "whisper" || entry.groupMembers?.length) continue;
    const key = getWhisperConversationKey(entry, myself);
    if (key) keys.add(key);
  }
  return keys;
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
  const contactKeys = new Set<string>();
  for (const entry of logs) {
    const group = groups.byEntry.get(entry);
    const key = group?.key ?? getWhisperConversationKey(entry, myself);
    if (!key || contactKeys.has(key)) continue;
    if (entry.type === "click" && !directWhisperKeys.has(key)) continue;
    if (group) {
      contacts.push(group);
      contactKeys.add(key);
      continue;
    }
    const peer = getWhisperPeer(entry, myself);
    if (peer) {
      contacts.push(createWhisperUserContact(peer));
      contactKeys.add(key);
    }
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

/** True when `inner` is a proper subset of `outer` (same group after someone left the room). */
function isProperSubsetRoster(inner: string[], outer: string[]): boolean {
  if (inner.length < 2 || inner.length >= outer.length) return false;
  const O = new Set(outer.map(normalizedName));
  return inner.every(name => O.has(normalizedName(name)));
}

function resolveGroups(logs: LogEntry[]): {
  byEntry: Map<LogEntry, WhisperContact>;
} {
  const byEntry = new Map<LogEntry, WhisperContact>();
  const contacts: WhisperContact[] = [];

  // Oldest first: first full roster wins; later smaller rosters (people left room) stay on it.
  // A *larger* later roster does not absorb an earlier smaller one (that is a different group).
  const chronological = [...logs].sort((a, b) => a.ts - b.ts);

  for (const entry of chronological) {
    const rawRoster = entry.groupMembers;
    if (!rawRoster?.length) continue;
    const members = uniqueNames(rawRoster);
    const key = groupKey(members);

    let contact = contacts.find(item => item.historyKeys.includes(key));
    if (!contact) {
      contact = contacts.find(item => isProperSubsetRoster(members, item.members));
    }

    if (!contact) {
      contact = {
        key,
        kind: "group",
        label: `Group ${contacts.length + 1}`,
        recipient: "group",
        members,
        historyKeys: [key],
      };
      contacts.push(contact);
    } else if (!contact.historyKeys.includes(key)) {
      contact.historyKeys.push(key);
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
