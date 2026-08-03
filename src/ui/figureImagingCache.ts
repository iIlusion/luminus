/**
 * Session cache for Habblet figure imaging (CDN).
 * - Stable URL per figure (browser HTTP cache + session "ready" set)
 * - Concurrency limit when many <img> start loading (avoids CDN rate limit)
 */

const IMAGING_BASE = "https://imaging.habblet.city/avatarimage";
const MAX_CONCURRENT = 3;
const MAX_CACHE = 512;

type CacheEntry = {
  url: string;
  status: "idle" | "loading" | "ready" | "error";
};

const cache = new Map<string, CacheEntry>();
/** Callbacks waiting for a free download slot. */
const waitQueue: Array<() => void> = [];
let inFlight = 0;

export type FigureImagingSize = "s" | "m" | "l";

export function figureImagingUrl(
  figure: string,
  options?: { size?: FigureImagingSize; headOnly?: boolean; direction?: number },
): string {
  const size = options?.size ?? "l";
  const headOnly = options?.headOnly !== false;
  const direction = options?.direction ?? 3;
  const params = new URLSearchParams({
    figure,
    direction: String(direction),
    head_direction: String(direction),
    size,
    headonly: headOnly ? "1" : "0",
  });
  return `${IMAGING_BASE}?${params.toString()}`;
}

function cacheKey(figure: string, size: FigureImagingSize, headOnly: boolean): string {
  return `${size}:${headOnly ? "h" : "f"}:${figure}`;
}

function trimCache(): void {
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest == null) break;
    cache.delete(oldest);
  }
}

function pumpQueue(): void {
  while (inFlight < MAX_CONCURRENT && waitQueue.length) {
    const next = waitQueue.shift();
    next?.();
  }
}

/** URL only — does not start a network request by itself. */
export function resolveFigureImaging(
  figure: string,
  options?: { size?: FigureImagingSize; headOnly?: boolean; direction?: number },
): string {
  const size = options?.size ?? "l";
  const headOnly = options?.headOnly !== false;
  const url = figureImagingUrl(figure, { size, headOnly, direction: options?.direction });
  const key = cacheKey(figure, size, headOnly);
  if (!cache.has(key)) {
    cache.set(key, { url, status: "idle" });
    trimCache();
  }
  return cache.get(key)!.url;
}

export function isFigureImagingCached(figure: string, size: FigureImagingSize = "l"): boolean {
  return cache.get(cacheKey(figure, size, true))?.status === "ready";
}

/**
 * Gate concurrent <img> loads. Call before assigning img.src when the figure
 * is not yet ready; invoke the returned release from onLoad/onError.
 */
export function acquireFigureImagingSlot(
  figure: string,
  options?: { size?: FigureImagingSize; headOnly?: boolean },
): Promise<() => void> {
  const size = options?.size ?? "l";
  const headOnly = options?.headOnly !== false;
  const key = cacheKey(figure, size, headOnly);
  const url = resolveFigureImaging(figure, { size, headOnly });
  const entry = cache.get(key) ?? { url, status: "idle" as const };
  cache.set(key, entry);

  if (entry.status === "ready") {
    return Promise.resolve(() => {});
  }

  return new Promise(resolve => {
    const begin = () => {
      inFlight += 1;
      entry.status = "loading";
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        inFlight = Math.max(0, inFlight - 1);
        pumpQueue();
      });
    };

    if (inFlight < MAX_CONCURRENT) begin();
    else waitQueue.push(begin);
  });
}

export function markFigureImagingReady(figure: string, size: FigureImagingSize = "l"): void {
  const key = cacheKey(figure, size, true);
  const entry = cache.get(key);
  if (entry) entry.status = "ready";
  else cache.set(key, { url: figureImagingUrl(figure), status: "ready" });
}

export function markFigureImagingError(figure: string, size: FigureImagingSize = "l"): void {
  const key = cacheKey(figure, size, true);
  const entry = cache.get(key);
  if (entry) entry.status = "error";
}

export function clearFigureImagingCache(): void {
  cache.clear();
  waitQueue.length = 0;
  inFlight = 0;
}
