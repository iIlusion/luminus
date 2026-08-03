import type { LogEntry } from "../logs/logStore";
import {
  groupClickMessageWindow,
  logEntryKey,
  type VisibleLogEntry,
} from "./chatRenderWindow";
import type { ChatConversationView } from "./chatWorkspaceStore";
import { isLocalChatMessage } from "./chatWorkspaceStore";

export type AnnotatedMessage = {
  entry: VisibleLogEntry;
  start: boolean;
  end: boolean;
  index: number;
};

export type MessageGroupView = {
  dayChanged: boolean;
  items: AnnotatedMessage[];
};

export type ThreadWindowCache = {
  key: string;
  threadLen: number;
  visibleCount: number;
  lastKey: string;
  annotated: AnnotatedMessage[];
  groups: MessageGroupView[];
};

/** Full rebuild of the visible window (switch chat, load older, deletes, non-tail inserts). */
export function rebuildThreadWindow(
  thread: LogEntry[],
  visibleCount: number,
  conversation: ChatConversationView,
): ThreadWindowCache {
  const visible = groupClickMessageWindow(thread, visibleCount);
  const annotated = annotateVisible(visible, conversation);
  return {
    key: conversation.key,
    threadLen: thread.length,
    visibleCount,
    lastKey: annotated.length ? logEntryKey(annotated[annotated.length - 1].entry) : "",
    annotated,
    groups: groupAnnotated(annotated),
  };
}

/**
 * Cheap path for live stream: one or more new whispers only at the end of the thread.
 * Batches multi-message flushes (rAF / throttle) into a single window update.
 * Returns null when a full rebuild is required.
 */
export function tryAppendThreadWindow(
  cache: ThreadWindowCache,
  thread: LogEntry[],
  visibleCount: number,
  conversation: ChatConversationView,
): ThreadWindowCache | null {
  if (cache.key !== conversation.key) return null;
  if (cache.visibleCount !== visibleCount) return null;
  const delta = thread.length - cache.threadLen;
  if (delta < 1) return null;

  // All new entries must be chronological whispers at the tail.
  for (let i = cache.threadLen; i < thread.length; i++) {
    const entry = thread[i];
    if (!entry || entry.type !== "whisper") return null;
    if (i > 0 && thread[i - 1] && entry.ts < thread[i - 1].ts) return null;
  }

  let annotated = cache.annotated;
  for (let i = cache.threadLen; i < thread.length; i++) {
    const incoming = thread[i] as VisibleLogEntry;
    const previous = annotated[annotated.length - 1]?.entry;
    const canGroup = canGroupMessage(previous, incoming, conversation);
    if (annotated.length && canGroup) {
      const last = annotated[annotated.length - 1];
      annotated = [
        ...annotated.slice(0, -1),
        { ...last, end: false },
      ];
    }
    annotated = [
      ...annotated,
      {
        entry: incoming,
        start: !canGroup || annotated.length === 0,
        end: true,
        index: annotated.length,
      },
    ];
  }

  // Slide when over the cap. Single-message overflow drops 1; bursts drop in a chunk
  // so we unmount fewer times under a hot stream.
  if (visibleCount > 0 && annotated.length > visibleCount) {
    const need = annotated.length - visibleCount;
    const chunk = Math.max(10, Math.floor(visibleCount / 2));
    const drop = need <= 1
      ? need
      : Math.min(annotated.length - 1, Math.max(need, chunk));
    annotated = annotated.slice(drop).map((item, index) => (
      index === 0 ? { ...item, start: true, index: 0 } : { ...item, index }
    ));
  }

  const last = annotated[annotated.length - 1];
  return {
    key: conversation.key,
    threadLen: thread.length,
    visibleCount,
    lastKey: last ? logEntryKey(last.entry) : "",
    annotated,
    groups: groupAnnotated(annotated),
  };
}

function annotateVisible(
  entries: VisibleLogEntry[],
  conversation: ChatConversationView,
): AnnotatedMessage[] {
  return entries.map((entry, index) => {
    const previous = entries[index - 1];
    const next = entries[index + 1];
    return {
      entry,
      start: !canGroupMessage(previous, entry, conversation),
      end: !canGroupMessage(entry, next, conversation),
      index,
    };
  });
}

function groupAnnotated(messages: AnnotatedMessage[]): MessageGroupView[] {
  const groups: MessageGroupView[] = [];
  for (const message of messages) {
    const previous = messages[message.index - 1];
    const dayChanged = !previous
      || new Date(previous.entry.ts).toDateString() !== new Date(message.entry.ts).toDateString();
    const current = groups[groups.length - 1];
    if (message.entry.type === "click" || message.start || dayChanged || !current) {
      groups.push({ dayChanged, items: [message] });
    } else {
      current.items.push(message);
    }
  }
  return groups;
}

function canGroupMessage(
  first: VisibleLogEntry | undefined,
  second: VisibleLogEntry | undefined,
  conversation: ChatConversationView,
): boolean {
  const sameSender = first && second && (
    (isLocalChatMessage(first, conversation) && isLocalChatMessage(second, conversation))
    || sameName(first.actor, second.actor)
  );
  return Boolean(
    first
    && second
    && first.type === "whisper"
    && second.type === "whisper"
    && sameSender
    && second.ts - first.ts <= 5 * 60 * 1000
    && new Date(first.ts).toDateString() === new Date(second.ts).toDateString(),
  );
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}
