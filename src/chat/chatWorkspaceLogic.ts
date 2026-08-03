export interface WhisperActivityState {
  visibility: "open" | "closed" | "archived";
  unreadCount: number;
  manualUnread: boolean;
  lastReadAt: number;
}

export function applyWhisperActivity<T extends WhisperActivityState>(
  conversation: T,
  mine: boolean,
  visible: boolean,
  timestamp: number,
): T {
  const read = mine || visible;
  return {
    ...conversation,
    visibility: conversation.visibility === "closed" ? "open" : conversation.visibility,
    unreadCount: read ? 0 : conversation.unreadCount + 1,
    manualUnread: read ? false : conversation.manualUnread,
    lastReadAt: read ? timestamp : conversation.lastReadAt,
  };
}
