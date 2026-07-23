import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

/**
 * Nitro / Habblet AchievementData (incoming ACHIEVEMENT_LIST 305 & ACHIEVEMENT_PROGRESSED 2107 body).
 *
 * Wire (per achievement):
 *   int id
 *   int level
 *   string badgeId          e.g. "ACH_PetRespectGiver6"
 *   int scoreAtStartOfLevel cumulative XP when this level started
 *   int scoreLimit          cumulative XP to finish this level
 *   int levelRewardPoints
 *   int levelRewardPointType
 *   int progress            current cumulative XP
 *   bool finalLevel
 *   string category
 *   int totalLevels         (Habblet; present after category)
 */
export interface AchievementData {
  id: number;
  level: number;
  badgeId: string;
  /** Badge without trailing level digits, e.g. ACH_PetRespectGiver */
  badgeBase: string;
  /** Trailing number from badgeId when present */
  badgeLevel: number | null;
  scoreAtStartOfLevel: number;
  scoreLimit: number;
  levelRewardPoints: number;
  levelRewardPointType: number;
  progress: number;
  finalLevel: boolean;
  category: string;
  totalLevels: number | null;
  /** XP required for the current tier only (scoreLimit - scoreAtStartOfLevel). */
  tierXp: number;
  /** XP still needed to finish the current level. */
  remaining: number;
}

export interface AchievementsList {
  achievements: AchievementData[];
  defaultCategory: string;
}

function splitBadge(badgeId: string): { base: string; level: number | null } {
  const m = /^(.*?)(\d+)$/.exec(badgeId);
  if (!m) return { base: badgeId, level: null };
  return { base: m[1], level: parseInt(m[2], 10) };
}

export function parseAchievementData(reader: PacketReader): AchievementData {
  const id = reader.readInt();
  const level = reader.readInt();
  const badgeId = reader.readString();
  const scoreAtStartOfLevel = reader.readInt();
  const scoreLimit = reader.readInt();
  const levelRewardPoints = reader.readInt();
  const levelRewardPointType = reader.readInt();
  const progress = reader.readInt();
  const finalLevel = reader.readBoolean();
  const category = reader.readString();

  // Habblet ACHIEVEMENT_LIST (305) does NOT send totalLevels after category —
  // the next int is the following achievement's id. Infer max level from badge
  // suffix only when present (e.g. ACH_PetRespectGiver6 → at least 6).
  const { base, level: badgeLevel } = splitBadge(badgeId);
  const totalLevels: number | null = badgeLevel;
  return {
    id,
    level,
    badgeId,
    badgeBase: base,
    badgeLevel,
    scoreAtStartOfLevel,
    scoreLimit,
    levelRewardPoints,
    levelRewardPointType,
    progress,
    finalLevel,
    category,
    totalLevels,
    tierXp: scoreLimit - scoreAtStartOfLevel,
    remaining: Math.max(0, scoreLimit - progress),
  };
}

export class AchievementsListParser implements PacketParser<AchievementsList> {
  flush(): void {}

  parse(reader: PacketReader): AchievementsList {
    const count = reader.readInt();
    const achievements: AchievementData[] = [];
    for (let i = 0; i < count; i++) {
      if (!reader.bytesAvailable) break;
      achievements.push(parseAchievementData(reader));
    }
    let defaultCategory = "";
    if (reader.bytesAvailable) {
      try { defaultCategory = reader.readString(); } catch { /* soft */ }
    }
    return { achievements, defaultCategory };
  }
}

export class AchievementProgressedParser implements PacketParser<AchievementData> {
  flush(): void {}

  parse(reader: PacketReader): AchievementData {
    return parseAchievementData(reader);
  }
}
