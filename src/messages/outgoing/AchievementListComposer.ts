import type { PacketComposer } from "../../protocol/types";

/** Outgoing ACHIEVEMENT_LIST (219) — empty body, requests full list (305). */
export class AchievementListComposer implements PacketComposer<[]> {
  getMessageArray(): [] {
    return [];
  }
}
