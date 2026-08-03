export interface ResponseBudgetOptions {
  maxChars?: number;
  maxDepth?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxStringChars?: number;
  onObject?: (value: object) => unknown | undefined;
}

export interface CompactedResponse<T = unknown> {
  value: T;
  truncated: boolean;
  chars: number;
}

const DEFAULT_MAX_CHARS = 16_384;
const HARD_MAX_CHARS = 65_536;
const OMITTED = "[...omitted]";

export function compactResponse(value: unknown, options: ResponseBudgetOptions = {}): CompactedResponse {
  const maxChars = clamp(options.maxChars ?? DEFAULT_MAX_CHARS, 512, HARD_MAX_CHARS);
  const maxDepth = clamp(options.maxDepth ?? 3, 1, 8);
  const maxArrayItems = clamp(options.maxArrayItems ?? 64, 1, 256);
  const maxObjectKeys = clamp(options.maxObjectKeys ?? 24, 1, 128);
  const maxStringChars = clamp(options.maxStringChars ?? 500, 40, 4_000);
  const seen = new WeakSet<object>();
  let truncated = false;

  const visit = (current: unknown, depth: number): unknown => {
    if (current === null || typeof current === "undefined") return current;
    if (typeof current === "function") return `[function ${current.name || "anonymous"}]`;
    if (typeof current === "bigint") return `${current}n`;
    if (typeof current === "string") {
      if (current.length <= maxStringChars) return current;
      truncated = true;
      return `${current.slice(0, maxStringChars)}${OMITTED}`;
    }
    if (typeof current !== "object") return current;
    if (seen.has(current)) {
      truncated = true;
      return "[circular]";
    }
    if (depth >= maxDepth) {
      truncated = true;
      return "[nested]";
    }

    const transformed = options.onObject?.(current);
    if (typeof transformed !== "undefined") return visit(transformed, depth + 1);

    seen.add(current);
    if (Array.isArray(current)) {
      const items = current.slice(0, maxArrayItems).map(item => visit(item, depth + 1));
      if (current.length > maxArrayItems) {
        truncated = true;
        items.push(`[+${current.length - maxArrayItems}]`);
      }
      return items;
    }

    const output: Record<string, unknown> = {};
    const entries = Object.entries(current as Record<string, unknown>);
    for (const [key, item] of entries.slice(0, maxObjectKeys)) output[key] = visit(item, depth + 1);
    if (entries.length > maxObjectKeys) {
      truncated = true;
      output.__omitted = entries.length - maxObjectKeys;
    }
    return output;
  };

  let compacted = visit(value, 0);
  let chars = safeLength(compacted);
  if (chars > maxChars) {
    truncated = true;
    compacted = `${OMITTED} result exceeded ${maxChars} characters`;
    chars = safeLength(compacted);
  }
  return { value: compacted, truncated, chars };
}

export function clampResponseLimit(value: number | undefined, fallback: number, maximum: number): number {
  return clamp(value ?? fallback, 1, maximum);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.floor(value))) : minimum;
}

function safeLength(value: unknown): number {
  try { return JSON.stringify(value).length; } catch { return String(value).length; }
}
