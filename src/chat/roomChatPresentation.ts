/**
 * Room chat presentation helpers for Luminus Chat.
 *
 * Color tags: Habblet/Hibisco `@name@` prefixes (see Hibisco superinput color map).
 * Bubble IDs: Nitro SystemChatStyleEnum + room unit types (RoomObjectUserType).
 *
 * SystemChatStyleEnum (Nitro):
 *   NORMAL = 0, GENERIC = 1, BOT = 2
 * RoomObjectUserType:
 *   user=1, pet=2, bot=3, rentable_bot=4
 *
 * Shared bubble + author rules (Habblet/Hibisco):
 *   - bubble BOT (2) + own unit ("me") → system (wired/client system often spoofs local)
 *   - bubble GENERIC (1) → system-ish (respect, mute remaining, etc. in Nitro handlers)
 *   - unit type bot/rentable_bot → bot
 *   - packet whisper/shout → kind
 */

/** Hibisco live map + a few common extras. */
export const ROOM_CHAT_COLOR_TAGS: Record<string, string> = {
  "@red@": "#FF0000",
  // Bright sky blue — pure #0000FF is nearly invisible on dark chat bubbles.
  "@blue@": "#5CB8FF",
  "@green@": "#008000",
  "@yellow@": "#B8B814",
  "@white@": "#D0D0D0",
  "@orange@": "#FFA500",
  "@cyan@": "#14B8B8",
  "@brown@": "#964B00",
  "@purple@": "#800080",
  "@pink@": "#F0768B",
  // Common extras (not all in Hibisco dropdown, still used in rooms)
  "@black@": "#1A1A1A",
  "@gray@": "#808080",
  "@grey@": "#808080",
  "@lime@": "#32CD32",
  "@navy@": "#000080",
  "@magenta@": "#FF00FF",
  "@gold@": "#DAA520",
  "@silver@": "#C0C0C0",
  "@aqua@": "#00FFFF",
  "@teal@": "#008080",
};

export const SystemChatStyle = {
  NORMAL: 0,
  GENERIC: 1,
  BOT: 2,
} as const;

export const RoomUnitType = {
  USER: 1,
  PET: 2,
  BOT: 3,
  RENTABLE_BOT: 4,
} as const;

export type RoomChatRole =
  | "user"
  | "bot"
  | "system"
  | "whisper"
  | "shout"
  | "pet";

export interface ParsedChatColor {
  /** Hex color or null if plain. */
  color: string | null;
  /** Tag key that was stripped, e.g. `@red@`. */
  tag: string | null;
  /** Message without the leading color tag. */
  text: string;
}

export function parseChatColorTag(message: string): ParsedChatColor {
  if (!message) return { color: null, tag: null, text: message ?? "" };
  const lower = message.toLowerCase();
  for (const tag of Object.keys(ROOM_CHAT_COLOR_TAGS)) {
    if (lower.startsWith(tag)) {
      return {
        color: ROOM_CHAT_COLOR_TAGS[tag],
        tag,
        text: message.slice(tag.length),
      };
    }
  }
  // Generic @name@ fallback: try parse unknown tag length
  const match = message.match(/^@([a-zA-Z]{2,16})@/);
  if (match) {
    const key = `@${match[1].toLowerCase()}@`;
    const color = ROOM_CHAT_COLOR_TAGS[key] ?? null;
    if (color) {
      return { color, tag: key, text: message.slice(match[0].length) };
    }
  }
  return { color: null, tag: null, text: message };
}

export function isBotUnitType(type: number | null | undefined): boolean {
  return type === RoomUnitType.BOT || type === RoomUnitType.RENTABLE_BOT;
}

/**
 * Classify a room chat line for UI badges / bubble variants.
 *
 * @param isMine true when roomIndex is the local avatar
 */
export function classifyRoomChatRole(input: {
  kind: "chat" | "shout" | "whisper";
  bubble: number;
  unitType?: number | null;
  isMine?: boolean;
  actor?: string;
}): RoomChatRole {
  if (input.kind === "whisper") return "whisper";
  if (input.kind === "shout") return "shout";

  const type = input.unitType ?? null;
  if (type === RoomUnitType.PET) return "pet";

  // Nitro system events use GENERIC style; Habblet wired/system often uses BOT style on self.
  if (input.bubble === SystemChatStyle.GENERIC) return "system";
  if (input.bubble === SystemChatStyle.BOT && input.isMine) return "system";

  if (isBotUnitType(type)) return "bot";
  if (input.bubble === SystemChatStyle.BOT) return "bot";

  const actor = (input.actor ?? "").trim().toLowerCase();
  if (actor === "sistema" || actor === "system" || actor === "wired") return "system";

  return "user";
}

export function roomChatRoleLabel(role: RoomChatRole): string {
  switch (role) {
    case "bot": return "Bot";
    case "system": return "Sistema";
    case "whisper": return "Sussurro";
    case "shout": return "Grito";
    case "pet": return "Pet";
    default: return "";
  }
}
