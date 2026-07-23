import type { LuminusApi } from "../ws/api";
import type { AchievementData, AchievementsList } from "../messages/incoming/AchievementsParser";
import type { BadgePointLimit, BadgePointLimitsList } from "../messages/incoming/BadgePointLimitsParser";
import { AchievementListComposer } from "../messages/outgoing/AchievementListComposer";
import { GetBadgePointLimitsComposer } from "../messages/outgoing/GetBadgePointLimitsComposer";

/**
 * Achievements from packets:
 * - 305 / 2107: live progress (current level only)
 * - 1371 → 2501 GET_BADGE_POINTS_LIMITS / BADGE_POINT_LIMITS: full XP table per badge family
 *
 * Nitro BadgeAndPointLimit: badgeId = "ACH_" + code + level, limit = cumulative XP.
 */

export interface LevelThreshold {
  level: number;
  /** Cumulative XP to complete this level. */
  scoreLimit: number;
  /** Cumulative XP at start of this level (previous level's limit, or 0). */
  scoreStart: number;
  /** XP needed within this tier. */
  tierXp: number;
  source: "badgePointLimits" | "scoreLimit" | "scoreStart" | "observed";
}

export interface BadgeProgress {
  badgeId: string;
  badgeBase: string;
  level: number;
  progress: number;
  scoreAtStartOfLevel: number;
  scoreLimit: number;
  tierXp: number;
  remaining: number;
  finalLevel: boolean;
  totalLevels: number | null;
  category: string;
  achievementId: number;
  /** Full level table when BADGE_POINT_LIMITS was loaded; else partial. */
  knownThresholds: LevelThreshold[];
}

type Listener = (entries: BadgeProgress[]) => void;

const byBadgeId = new Map<string, AchievementData>();
const byBase = new Map<string, AchievementData>();
/** base (ACH_PetRespectGiver) → level → threshold */
const thresholdsByBase = new Map<string, Map<number, LevelThreshold>>();
/** raw limits from 2501, keyed by full badgeId */
const pointLimitsByBadgeId = new Map<string, BadgePointLimit>();
const pointLimitsByBase = new Map<string, BadgePointLimit[]>();

const listeners = new Set<Listener>();
let started = false;
let apiRef: LuminusApi | null = null;
let pendingListResolve: ((list: AchievementData[]) => void) | null = null;
let pendingListTimer: ReturnType<typeof setTimeout> | null = null;
let pendingLimitsResolve: ((limits: BadgePointLimit[]) => void) | null = null;
let pendingLimitsTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  const all = listAll();
  for (const l of listeners) {
    try { l(all); } catch { /* soft */ }
  }
}

function setThreshold(base: string, t: LevelThreshold): void {
  let map = thresholdsByBase.get(base);
  if (!map) {
    map = new Map();
    thresholdsByBase.set(base, map);
  }
  const prev = map.get(t.level);
  // Prefer full table from badge point limits over partial observations.
  if (!prev || t.source === "badgePointLimits" || prev.source !== "badgePointLimits") {
    map.set(t.level, t);
  }
}

function rebuildTierXp(base: string): void {
  const map = thresholdsByBase.get(base);
  if (!map) return;
  const levels = [...map.keys()].sort((a, b) => a - b);
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const cur = map.get(level)!;
    const prevLimit = i === 0 ? 0 : map.get(levels[i - 1])!.scoreLimit;
    map.set(level, {
      ...cur,
      scoreStart: prevLimit,
      tierXp: cur.scoreLimit - prevLimit,
    });
  }
}

function rememberFromProgress(data: AchievementData): void {
  setThreshold(data.badgeBase, {
    level: data.level,
    scoreLimit: data.scoreLimit,
    scoreStart: data.scoreAtStartOfLevel,
    tierXp: data.tierXp,
    source: "observed",
  });
  if (data.scoreAtStartOfLevel > 0 && data.level > 1) {
    setThreshold(data.badgeBase, {
      level: data.level - 1,
      scoreLimit: data.scoreAtStartOfLevel,
      scoreStart: 0,
      tierXp: 0,
      source: "scoreStart",
    });
  }
  rebuildTierXp(data.badgeBase);
}

function ingestProgress(data: AchievementData): void {
  byBadgeId.set(data.badgeId, data);
  byBase.set(data.badgeBase, data);
  rememberFromProgress(data);
  emit();
}

function ingestList(list: AchievementsList): void {
  for (const a of list.achievements) {
    byBadgeId.set(a.badgeId, a);
    byBase.set(a.badgeBase, a);
    rememberFromProgress(a);
  }
  emit();
  if (pendingListResolve) {
    const resolve = pendingListResolve;
    pendingListResolve = null;
    if (pendingListTimer) {
      clearTimeout(pendingListTimer);
      pendingListTimer = null;
    }
    resolve(list.achievements);
  }
}

function ingestPointLimits(list: BadgePointLimitsList): void {
  pointLimitsByBadgeId.clear();
  pointLimitsByBase.clear();

  for (const row of list.limits) {
    pointLimitsByBadgeId.set(row.badgeId, row);
    let arr = pointLimitsByBase.get(row.badgeBase);
    if (!arr) {
      arr = [];
      pointLimitsByBase.set(row.badgeBase, arr);
    }
    arr.push(row);
  }

  for (const [base, rows] of pointLimitsByBase) {
    rows.sort((a, b) => a.level - b.level);
    for (const row of rows) {
      setThreshold(base, {
        level: row.level,
        scoreLimit: row.limit,
        scoreStart: 0,
        tierXp: 0,
        source: "badgePointLimits",
      });
    }
    rebuildTierXp(base);
  }

  emit();
  if (pendingLimitsResolve) {
    const resolve = pendingLimitsResolve;
    pendingLimitsResolve = null;
    if (pendingLimitsTimer) {
      clearTimeout(pendingLimitsTimer);
      pendingLimitsTimer = null;
    }
    resolve(list.limits);
  }
}

function thresholdsFor(base: string): LevelThreshold[] {
  const map = thresholdsByBase.get(base);
  if (!map) return [];
  return [...map.values()].sort((a, b) => a.level - b.level);
}

function toProgress(data: AchievementData): BadgeProgress {
  return {
    badgeId: data.badgeId,
    badgeBase: data.badgeBase,
    level: data.level,
    progress: data.progress,
    scoreAtStartOfLevel: data.scoreAtStartOfLevel,
    scoreLimit: data.scoreLimit,
    tierXp: data.tierXp,
    remaining: data.remaining,
    finalLevel: data.finalLevel,
    totalLevels: data.totalLevels ?? (thresholdsFor(data.badgeBase).length || null),
    category: data.category,
    achievementId: data.id,
    knownThresholds: thresholdsFor(data.badgeBase),
  };
}

/** Progress rows for every badge the server has reported (from 305/2107). */
export function listAll(): BadgeProgress[] {
  return [...byBadgeId.values()].map(toProgress);
}

/**
 * Lookup by full badge id or base:
 *   "ACH_PetRespectGiver6" | "ACH_PetRespectGiver" | "PetRespectGiver"
 */
export function getByBadgeId(badgeIdOrBase: string): BadgeProgress | null {
  const raw = badgeIdOrBase.trim();
  if (!raw) return null;

  const asFull = raw.startsWith("ACH_") ? raw : `ACH_${raw}`;
  const direct = byBadgeId.get(raw) ?? byBadgeId.get(asFull);
  if (direct) return toProgress(direct);

  const baseRaw = raw.replace(/\d+$/, "");
  const base = baseRaw.startsWith("ACH_") ? baseRaw : `ACH_${baseRaw}`;
  const fromBase = byBase.get(base) ?? byBase.get(baseRaw);
  if (fromBase) return toProgress(fromBase);

  // No live progress yet — still return table-only if we have point limits.
  const limits = pointLimitsByBase.get(base);
  if (limits?.length) {
    const last = limits[limits.length - 1];
    return {
      badgeId: last.badgeId,
      badgeBase: base,
      level: 0,
      progress: 0,
      scoreAtStartOfLevel: 0,
      scoreLimit: limits[0]?.limit ?? 0,
      tierXp: limits[0]?.limit ?? 0,
      remaining: limits[0]?.limit ?? 0,
      finalLevel: false,
      totalLevels: limits.length,
      category: "",
      achievementId: 0,
      knownThresholds: thresholdsFor(base),
    };
  }

  return null;
}

/** Full XP table for a badge family (from 2501). */
export function getLevelTable(badgeIdOrBase: string): LevelThreshold[] {
  const raw = badgeIdOrBase.trim().replace(/\d+$/, "");
  const base = raw.startsWith("ACH_") ? raw : `ACH_${raw}`;
  return thresholdsFor(base);
}

export function subscribeAchievements(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function fetchAchievementList(timeoutMs = 2000): Promise<AchievementData[]> {
  if (!apiRef) return Promise.reject(new Error("achievements not initialized"));

  return new Promise((resolve, reject) => {
    if (pendingListTimer) clearTimeout(pendingListTimer);
    pendingListResolve = resolve;
    pendingListTimer = setTimeout(() => {
      pendingListResolve = null;
      pendingListTimer = null;
      const cached = [...byBadgeId.values()];
      if (cached.length) resolve(cached);
      else reject(new Error("timeout waiting for ACHIEVEMENT_LIST (305)"));
    }, timeoutMs);

    if (!apiRef!.send(new AchievementListComposer())) {
      if (pendingListTimer) clearTimeout(pendingListTimer);
      pendingListResolve = null;
      pendingListTimer = null;
      reject(new Error("failed to send ACHIEVEMENT_LIST"));
    }
  });
}

/** Request full badge XP tables (1371 → 2501). */
export function fetchBadgePointLimits(timeoutMs = 3000): Promise<BadgePointLimit[]> {
  if (!apiRef) return Promise.reject(new Error("achievements not initialized"));

  return new Promise((resolve, reject) => {
    if (pendingLimitsTimer) clearTimeout(pendingLimitsTimer);
    pendingLimitsResolve = resolve;
    pendingLimitsTimer = setTimeout(() => {
      pendingLimitsResolve = null;
      pendingLimitsTimer = null;
      const cached = [...pointLimitsByBadgeId.values()];
      if (cached.length) resolve(cached);
      else reject(new Error("timeout waiting for BADGE_POINT_LIMITS (2501)"));
    }, timeoutMs);

    if (!apiRef!.send(new GetBadgePointLimitsComposer())) {
      if (pendingLimitsTimer) clearTimeout(pendingLimitsTimer);
      pendingLimitsResolve = null;
      pendingLimitsTimer = null;
      reject(new Error("failed to send GET_BADGE_POINTS_LIMITS"));
    }
  });
}

/** Fetch progress list + full point-limit tables. */
export async function fetchAll(timeoutMs = 3000): Promise<{
  progress: BadgeProgress[];
  tables: Record<string, LevelThreshold[]>;
}> {
  const [limits, _list] = await Promise.all([
    fetchBadgePointLimits(timeoutMs).catch(() => [] as BadgePointLimit[]),
    fetchAchievementList(timeoutMs).catch(() => [] as AchievementData[]),
  ]);
  void limits;
  void _list;
  const tables: Record<string, LevelThreshold[]> = {};
  for (const base of thresholdsByBase.keys()) {
    tables[base] = thresholdsFor(base);
  }
  return { progress: listAll(), tables };
}

export function initAchievements(api: LuminusApi): void {
  if (started) return;
  started = true;
  apiRef = api;

  api.onIncoming(305, ({ packet }) => {
    const list = packet.parsed as AchievementsList | undefined;
    if (list?.achievements) ingestList(list);
  });

  api.onIncoming(2107, ({ packet }) => {
    const data = packet.parsed as AchievementData | undefined;
    if (data?.badgeId) ingestProgress(data);
  });

  api.onIncoming(2501, ({ packet }) => {
    const list = packet.parsed as BadgePointLimitsList | undefined;
    if (list?.limits) ingestPointLimits(list);
  });

  api.achievements = {
    list: listAll,
    get: getByBadgeId,
    getLevelTable,
    fetch: fetchAchievementList,
    fetchPointLimits: fetchBadgePointLimits,
    fetchAll,
    subscribe: subscribeAchievements,
  };
}
