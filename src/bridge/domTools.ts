import { clampResponseLimit, compactResponse } from "./responseBudget";

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
  maxChars?: number;
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
  const limit = clampResponseLimit(params.limit, 10, 50);
  let elements: Element[];

  try {
    elements = Array.from(document.querySelectorAll(params.selector));
  } catch (error) {
    return { error: `Seletor inválido: ${error instanceof Error ? error.message : String(error)}` };
  }

  const result = elements.slice(0, limit).map((el) => summarizeElement(el, !!params.html));
  return compactResponse(result, { maxChars: params.maxChars }).value as DomElementSummary[];
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
  maxChars?: number;
  raw?: boolean;
}

export async function domEval(params: DomEvalParams): Promise<unknown> {
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict"; return (async () => { ${params.code} })();`);
  const result = await fn();
  const compacted = compactResponse(result, {
    maxChars: params.maxChars,
    maxDepth: params.raw ? 6 : 3,
    maxArrayItems: params.raw ? 128 : 64,
    maxObjectKeys: params.raw ? 48 : 24,
    maxStringChars: params.raw ? 1_000 : 500,
    onObject: value => {
      if (typeof Element !== "undefined" && value instanceof Element) return summarizeElement(value, false);
      if (value instanceof Function) return `[function ${value.name || "anonymous"}]`;
      return undefined;
    }
  });
  return compacted.value;
}
