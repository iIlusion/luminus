/**
 * Deadline-based timers that survive background-tab throttling.
 *
 * Browsers clamp setTimeout/setInterval to ~1s (or worse) when the tab is
 * hidden. Habblet WebSocket packets still arrive, so callers should call
 * `flushReliableTimers()` on packet traffic and on visibility changes to
 * fire overdue work at the real wall-clock deadline.
 */

export type ReliableTimerId = number;

type TimerKind = "timeout" | "interval";

interface TimerEntry {
  id: ReliableTimerId;
  kind: TimerKind;
  dueAt: number;
  period: number;
  callback: () => void;
  nativeId: ReturnType<typeof setTimeout> | 0;
}

const entries = new Map<ReliableTimerId, TimerEntry>();
let nextId = 1;
let hooksInstalled = false;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function armNative(entry: TimerEntry): void {
  if (entry.nativeId) clearTimeout(entry.nativeId);
  const delay = Math.max(0, entry.dueAt - nowMs());
  entry.nativeId = setTimeout(() => {
    entry.nativeId = 0;
    fireEntry(entry);
  }, delay);
}

function fireEntry(entry: TimerEntry): void {
  if (!entries.has(entry.id)) return;
  if (entry.kind === "timeout") {
    entries.delete(entry.id);
    entry.callback();
    return;
  }
  // Interval: advance one period from now (no catch-up bursts under lag).
  entry.dueAt = nowMs() + entry.period;
  entry.callback();
  if (entries.has(entry.id)) armNative(entry);
}

export function reliableTimeout(callback: () => void, delayMs: number): ReliableTimerId {
  const id = nextId++;
  const entry: TimerEntry = {
    id,
    kind: "timeout",
    dueAt: nowMs() + Math.max(0, delayMs),
    period: 0,
    callback,
    nativeId: 0,
  };
  entries.set(id, entry);
  armNative(entry);
  return id;
}

export function reliableInterval(callback: () => void, periodMs: number): ReliableTimerId {
  const period = Math.max(1, periodMs);
  const id = nextId++;
  const entry: TimerEntry = {
    id,
    kind: "interval",
    dueAt: nowMs() + period,
    period,
    callback,
    nativeId: 0,
  };
  entries.set(id, entry);
  armNative(entry);
  return id;
}

export function clearReliableTimer(id: ReliableTimerId | 0 | null | undefined): void {
  if (!id) return;
  const entry = entries.get(id);
  if (!entry) return;
  if (entry.nativeId) clearTimeout(entry.nativeId);
  entries.delete(id);
}

/** Fire every timer whose deadline has already passed (oldest first). */
export function flushReliableTimers(): void {
  const t = nowMs();
  const overdue = [...entries.values()]
    .filter((entry) => entry.dueAt <= t)
    .sort((a, b) => a.dueAt - b.dueAt);
  for (const entry of overdue) {
    if (!entries.has(entry.id)) continue;
    if (entry.dueAt > nowMs()) continue;
    if (entry.nativeId) {
      clearTimeout(entry.nativeId);
      entry.nativeId = 0;
    }
    fireEntry(entry);
  }
}

/**
 * Install document visibility flush so timers catch up when the tab returns
 * from background. Safe to call multiple times.
 */
export function installReliableTimerHooks(): void {
  if (hooksInstalled || typeof document === "undefined") return;
  hooksInstalled = true;
  document.addEventListener("visibilitychange", () => {
    flushReliableTimers();
  });
}
