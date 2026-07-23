import type { PacketComposer } from "../../protocol/types";

/** Outgoing GET_BADGE_POINTS_LIMITS (1371) — empty body. */
export class GetBadgePointLimitsComposer implements PacketComposer<[]> {
  getMessageArray(): [] {
    return [];
  }
}
