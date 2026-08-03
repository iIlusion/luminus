import type { LogEntry } from "../logs/logStore";
import type { WhisperContact } from "../logs/whisperThreads";

export function getChatGroupKey(members: string[]): string {
  return `group:${members.map(normalizeName).sort().join("|")}`;
}

export function isChatEntryRouteVerified(entry: LogEntry, localAccounts: string[]): boolean {
  if (entry.type !== "whisper") return true;
  const localKeys = new Set(localAccounts.map(normalizeName));
  const participants = entry.groupMembers?.length
    ? entry.groupMembers
    : [entry.actor, entry.target ?? ""];
  return participants.some(name => localKeys.has(normalizeName(name)));
}

export function createChatKeyResolver(
  localAccounts: string[],
  currentAccount: string,
): (entry: LogEntry) => string | null {
  const names = new Map<string, string>();
  const normalize = (name: string): string => {
    const cached = names.get(name);
    if (cached !== undefined) return cached;
    const value = normalizeName(name);
    names.set(name, value);
    return value;
  };
  const localKeys = new Set(localAccounts.map(normalize));
  const currentKey = normalize(currentAccount);

  return entry => {
    if (entry.type !== "whisper" && entry.type !== "click") return null;
    if (entry.groupMembers?.length) {
      return `group:${entry.groupMembers.map(normalize).sort().join("|")}`;
    }
    if (entry.type === "click") {
      return localKeys.has(normalize(entry.actor)) ? null : `user:${normalize(entry.actor)}`;
    }
    const actorLocal = localKeys.has(normalize(entry.actor));
    const targetLocal = entry.target ? localKeys.has(normalize(entry.target)) : false;
    const actorCurrent = normalize(entry.actor) === currentKey;
    const targetCurrent = entry.target ? normalize(entry.target) === currentKey : false;
    const peer = actorLocal && targetLocal
      ? actorCurrent && !targetCurrent
        ? entry.target
        : targetCurrent && !actorCurrent
          ? entry.actor
          : null
      : actorLocal ? entry.target : entry.actor;
    if (!peer || peer === "?" || normalize(peer) === "group") return null;
    return `user:${normalize(peer)}`;
  };
}

export function buildChatContacts(
  logs: LogEntry[],
  localAccounts: string[],
  currentAccount: string,
): WhisperContact[] {
  const resolveKey = createChatKeyResolver(localAccounts, currentAccount);
  const localKeys = new Set(localAccounts.map(normalizeName));
  const currentKey = normalizeName(currentAccount);
  const directWhisperKeys = new Set<string>();
  for (const entry of logs) {
    if (entry.type !== "whisper" || entry.groupMembers?.length) continue;
    const key = resolveKey(entry);
    if (key) directWhisperKeys.add(key);
  }

  const groups = resolveGroups(logs);
  const contacts: WhisperContact[] = [];
  const contactKeys = new Set<string>();
  for (const entry of logs) {
    const rawKey = resolveKey(entry);
    const group = rawKey ? groups.byHistoryKey.get(rawKey) : undefined;
    const key = group?.key ?? rawKey;
    if (!key || contactKeys.has(key)) continue;
    if (entry.type === "click" && !directWhisperKeys.has(key)) continue;
    if (group) {
      contacts.push(group);
      contactKeys.add(key);
      continue;
    }
    const actorKey = normalizeName(entry.actor);
    const targetKey = normalizeName(entry.target ?? "");
    const actorLocal = localKeys.has(actorKey);
    const targetLocal = localKeys.has(targetKey);
    const peer = entry.type === "click"
      ? entry.actor
      : actorLocal && targetLocal
        ? actorKey === currentKey && targetKey !== currentKey
          ? entry.target
          : targetKey === currentKey && actorKey !== currentKey
            ? entry.actor
            : null
        : actorLocal ? entry.target : entry.actor;
    if (!peer || peer === "?" || normalizeName(peer) === "group") continue;
    contacts.push({
      key,
      kind: "user",
      label: peer,
      recipient: peer,
      members: [],
      historyKeys: [key],
    });
    contactKeys.add(key);
  }
  return contacts;
}

function resolveGroups(logs: LogEntry[]): {
  byHistoryKey: Map<string, WhisperContact>;
} {
  const byHistoryKey = new Map<string, WhisperContact>();
  const contacts: WhisperContact[] = [];
  const chronological = [...logs].sort((a, b) => a.ts - b.ts);

  for (const entry of chronological) {
    if (!entry.groupMembers?.length) continue;
    const members = uniqueNames(entry.groupMembers);
    const key = getChatGroupKey(members);
    let contact = byHistoryKey.get(key)
      ?? contacts.find(item => isProperSubsetRoster(members, item.members));

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
    byHistoryKey.set(key, contact);
  }

  return { byHistoryKey };
}

function isProperSubsetRoster(inner: string[], outer: string[]): boolean {
  if (inner.length < 2 || inner.length >= outer.length) return false;
  const outerKeys = new Set(outer.map(normalizeName));
  return inner.every(name => outerKeys.has(normalizeName(name)));
}

function uniqueNames(names: string[]): string[] {
  const result: string[] = [];
  const keys = new Set<string>();
  for (const name of names) {
    const clean = name.trim();
    const key = normalizeName(clean);
    if (!clean || keys.has(key)) continue;
    keys.add(key);
    result.push(clean);
  }
  return result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "accent" }));
}

function normalizeName(name: string): string {
  return name.toLocaleLowerCase("pt-BR").normalize("NFC");
}
