// Ring buffer of console output, patched once, so the MCP `console_get` tool can pull a
// filtered slice instead of Claude scrolling the whole devtools console.
const MAX_ENTRIES = 300;
const MAX_TEXT_LEN = 500;

export interface ConsoleEntry {
  ts: number;
  level: "log" | "info" | "warn" | "error" | "debug";
  text: string;
}

const buffer: ConsoleEntry[] = [];
let patched = false;
const originals = new Map<ConsoleEntry["level"], (...args: unknown[]) => void>();
const MAX_QUERY_LIMIT = 100;

export function initConsoleCapture(): void {
  if (patched) return;
  patched = true;

  (["log", "info", "warn", "error", "debug"] as const).forEach((level) => {
    const original = console[level];
    originals.set(level, original);
    console[level] = (...args: unknown[]) => {
      original.apply(console, args);
      push(level, args);
    };
  });
}

export function stopConsoleCapture(): void {
  if (!patched) return;
  patched = false;
  for (const [level, original] of originals) console[level] = original as Console[typeof level];
  originals.clear();
  buffer.length = 0;
}

function push(level: ConsoleEntry["level"], args: unknown[]): void {
  const text = args.map(stringifyArg).join(" ").slice(0, MAX_TEXT_LEN);
  buffer.push({ ts: Date.now(), level, text });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export interface ConsoleQuery {
  level?: ConsoleEntry["level"];
  filter?: string;
  limit?: number;
  since?: number;
}

export function getConsoleLogs(query: ConsoleQuery = {}): ConsoleEntry[] {
  const limit = Math.min(MAX_QUERY_LIMIT, Math.max(1, Math.floor(query.limit ?? 20)));
  let entries = buffer;

  if (query.level) entries = entries.filter((e) => e.level === query.level);
  if (query.since) entries = entries.filter((e) => e.ts >= query.since!);
  if (query.filter) {
    const needle = query.filter.toLowerCase();
    entries = entries.filter((e) => e.text.toLowerCase().includes(needle));
  }

  return entries.slice(-limit);
}
