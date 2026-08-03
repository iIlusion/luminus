import type { LogEntry } from "../logs/logStore";

export type VisibleLogEntry = LogEntry & { sourceKeys?: string[] };

export function groupClickMessageWindow(entries: LogEntry[], visibleCount: number): VisibleLogEntry[] {
  let start = Math.max(0, entries.length - visibleCount);
  const first = entries[start];
  if (first?.type === "click") {
    while (
      start > 0
      && entries[start - 1].type === "click"
      && sameName(entries[start - 1].actor, first.actor)
    ) {
      start--;
    }
  }

  const grouped: VisibleLogEntry[] = [];
  for (const entry of entries.slice(start)) {
    const previous = grouped[grouped.length - 1];
    if (entry.type === "click" && previous?.type === "click" && sameName(previous.actor, entry.actor)) {
      const sourceKeys = [...(previous.sourceKeys ?? [logEntryKey(previous)]), logEntryKey(entry)];
      grouped[grouped.length - 1] = {
        ...entry,
        message: `${entry.actor} clicou em você (${sourceKeys.length}x)`,
        sourceKeys,
      };
    } else {
      grouped.push(entry.type === "click"
        ? { ...entry, message: `${entry.actor} clicou em você`, sourceKeys: [logEntryKey(entry)] }
        : entry);
    }
  }
  return grouped;
}

export function logEntryKey(entry: LogEntry): string {
  return [
    entry.ts,
    entry.type,
    entry.actor,
    entry.target ?? "",
    entry.message,
    entry.groupMembers?.join(",") ?? "",
  ].join("\u0000");
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}
