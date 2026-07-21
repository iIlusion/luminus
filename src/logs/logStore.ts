import { readPref, writePref } from "../util/prefs";

export interface LogEntry {
  ts: number;
  type: "click" | "whisper" | "friend" | "room_enter" | "room_leave";
  actor: string;
  target?: string;  // whisper: recipient name
  figure?: string;
  message: string;
  duration?: number; // ms, room_leave only
}

const MAX = 200;

let entries: LogEntry[] = readPref("luminus.logs", []);
const listeners = new Set<() => void>();

export function addLog(entry: LogEntry): void {
  entries = [entry, ...entries].slice(0, MAX);
  writePref("luminus.logs", entries);
  listeners.forEach(fn => fn());
}

export function getLogs(): LogEntry[] { return entries; }

export function clearLogs(): void {
  entries = [];
  writePref("luminus.logs", []);
  listeners.forEach(fn => fn());
}

export function onLogsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
