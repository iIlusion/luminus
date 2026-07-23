import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

/**
 * Incoming BADGE_POINT_LIMITS (2501) — reply to GET_BADGE_POINTS_LIMITS (1371).
 *
 * Nitro BadgePointLimitsParser:
 *   int groupCount
 *   for each group:
 *     string code              // e.g. "PetRespectGiver" (no ACH_ / no level)
 *     int limitCount
 *     for each limit:
 *       int level              // badge becomes ACH_{code}{level}
 *       int limit              // cumulative XP to complete that level
 */
export interface BadgePointLimit {
  /** Full badge id, e.g. ACH_PetRespectGiver5 */
  badgeId: string;
  /** Base without level, e.g. ACH_PetRespectGiver */
  badgeBase: string;
  /** Achievement family code from wire (no ACH_ prefix), e.g. PetRespectGiver */
  code: string;
  level: number;
  /** Cumulative XP threshold for this level */
  limit: number;
}

export interface BadgePointLimitsList {
  limits: BadgePointLimit[];
}

export class BadgePointLimitsParser implements PacketParser<BadgePointLimitsList> {
  flush(): void {}

  parse(reader: PacketReader): BadgePointLimitsList {
    const limits: BadgePointLimit[] = [];
    const groupCount = reader.readInt();

    for (let g = 0; g < groupCount; g++) {
      if (!reader.bytesAvailable) break;
      const code = reader.readString();
      const n = reader.readInt();
      for (let i = 0; i < n; i++) {
        if (!reader.bytesAvailable) break;
        const level = reader.readInt();
        const limit = reader.readInt();
        const badgeId = `ACH_${code}${level}`;
        limits.push({
          badgeId,
          badgeBase: `ACH_${code}`,
          code,
          level,
          limit,
        });
      }
    }

    return { limits };
  }
}
