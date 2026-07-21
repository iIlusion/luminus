// DOM access for the MCP bridge. dom.query returns compact per-element summaries instead of
// full markup so a broad selector doesn't flood the tool result; dom.eval covers anything a
// selector can't express (computed state, calling window.Luminus.* directly).
const MAX_TEXT_LEN = 200;
const MAX_HTML_LEN = 2000;
const MAX_ATTR_LEN = 200;

export interface DomQueryParams {
  selector: string;
  limit?: number;
  html?: boolean;
}

export interface DomElementSummary {
  tag: string;
  id: string;
  classes: string[];
  attrs: Record<string, string>;
  text: string;
  html?: string;
}

export function domQuery(params: DomQueryParams): DomElementSummary[] | { error: string } {
  const limit = params.limit ?? 20;
  let elements: Element[];

  try {
    elements = Array.from(document.querySelectorAll(params.selector));
  } catch (error) {
    return { error: `Seletor inválido: ${error instanceof Error ? error.message : String(error)}` };
  }

  return elements.slice(0, limit).map((el) => summarizeElement(el, !!params.html));
}

function summarizeElement(el: Element, includeHtml: boolean): DomElementSummary {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === "class" || attr.name === "id") continue;
    attrs[attr.name] = attr.value.slice(0, MAX_ATTR_LEN);
  }

  const summary: DomElementSummary = {
    tag: el.tagName.toLowerCase(),
    id: el.id,
    classes: Array.from(el.classList),
    attrs,
    text: (el.textContent ?? "").trim().slice(0, MAX_TEXT_LEN)
  };

  if (includeHtml) summary.html = el.outerHTML.slice(0, MAX_HTML_LEN);

  return summary;
}

export interface DomEvalParams {
  code: string;
}

export async function domEval(params: DomEvalParams): Promise<unknown> {
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict"; return (async () => { ${params.code} })();`);
  const result = await fn();
  return toJsonSafe(result);
}

function toJsonSafe(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Element) return summarizeElement(value, false);
  if (value === undefined) return null;
  if (typeof value === "function") return `[function ${value.name || "anonymous"}]`;
  if (typeof value !== "object" || value === null) return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((v) => toJsonSafe(v, seen));

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    out[key] = toJsonSafe((value as Record<string, unknown>)[key], seen);
  }
  return out;
}
