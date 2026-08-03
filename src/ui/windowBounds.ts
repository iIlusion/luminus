/**
 * Safe viewport for Luminus floating chrome (panel, logs, links).
 *
 * - Top margin: keep headers fully on-screen (drag handle stays usable).
 * - Bottom limit: top of `.nitro-toolbar` (never grow over the Habblet toolbar).
 * - Falls back to viewport edges when toolbar is missing/hidden.
 */

/** Side inset so windows stay slightly inside the viewport edges. */
const EDGE = 8;
/** Default top inset (main panel / logs / links). */
const TOP_GAP = 8;
/**
 * Gap above `.nitro-toolbar`. Keep tight so windows can use almost the full stage,
 * but never draw into the toolbar (drag/resize clamp uses this exclusive bottom).
 */
const TOOLBAR_GAP = 2;

export interface UiSafeBoundsOpts {
  /** Inclusive top pad (0 = flush with viewport top). */
  topGap?: number;
  /** Gap above the Nitro toolbar bottom limit. */
  bottomGap?: number;
}

export interface UiSafeBounds {
  /** Inclusive top of usable area (px from viewport top). */
  top: number;
  left: number;
  /** Exclusive right edge. */
  right: number;
  /** Exclusive bottom edge (toolbar top − gap). */
  bottom: number;
  width: number;
  height: number;
}

export function getUiSafeBounds(opts?: UiSafeBoundsOpts): UiSafeBounds {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const topGap = opts?.topGap ?? TOP_GAP;
  const bottomGap = opts?.bottomGap ?? TOOLBAR_GAP;
  const top = Math.max(0, topGap);
  const left = EDGE;
  const right = Math.max(left + 160, vw - EDGE);

  let bottom = vh - EDGE;
  const toolbar = document.querySelector(".nitro-toolbar") as HTMLElement | null;
  if (toolbar) {
    const rect = toolbar.getBoundingClientRect();
    // Only use toolbar when it actually sits along the bottom of the stage.
    if (rect.height > 8 && rect.top > top + 40 && rect.top < vh + 4) {
      bottom = Math.min(bottom, rect.top - bottomGap);
    }
  }

  // Never invert the box (tiny / broken layouts).
  if (bottom < top + 140) bottom = Math.min(vh - EDGE, top + 140);

  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(160, right - left),
    height: Math.max(140, bottom - top),
  };
}

/** Chat Beta: flush to the top of the stage, tight to the toolbar. */
export function getChatSafeBounds(): UiSafeBounds {
  return getUiSafeBounds({ topGap: 0, bottomGap: TOOLBAR_GAP });
}

/** Publish CSS vars so stylesheets can cap max-height without JS per-element. */
export function publishUiSafeBoundsCss(root: HTMLElement | Document = document): void {
  const b = getUiSafeBounds();
  const el = root instanceof Document ? root.documentElement : root;
  el.style.setProperty("--lm-safe-top", `${b.top}px`);
  el.style.setProperty("--lm-safe-left", `${b.left}px`);
  el.style.setProperty("--lm-safe-right", `${b.right}px`);
  el.style.setProperty("--lm-safe-bottom", `${b.bottom}px`);
  el.style.setProperty("--lm-safe-width", `${b.width}px`);
  el.style.setProperty("--lm-safe-height", `${b.height}px`);
}

export function clampWindowRect(
  left: number,
  top: number,
  width: number,
  height: number,
  opts?: { minWidth?: number; minHeight?: number; bounds?: UiSafeBounds },
): { left: number; top: number; width: number; height: number } {
  const b = opts?.bounds ?? getUiSafeBounds();
  const minW = Math.min(opts?.minWidth ?? 280, b.width);
  const minH = Math.min(opts?.minHeight ?? 180, b.height);

  let w = Math.min(Math.max(minW, width), b.width);
  let h = Math.min(Math.max(minH, height), b.height);

  // Prefer keeping the full window inside; header never above b.top.
  let t = top;
  let l = left;

  if (t < b.top) t = b.top;
  if (t + h > b.bottom) t = b.bottom - h;
  if (t < b.top) {
    t = b.top;
    h = Math.min(h, b.height);
  }

  if (l < b.left) l = b.left;
  if (l + w > b.right) l = b.right - w;
  if (l < b.left) {
    l = b.left;
    w = Math.min(w, b.width);
  }

  return { left: l, top: t, width: w, height: h };
}

/** Clamp position only (size unchanged unless it no longer fits). */
export function applyClampedPosition(
  el: HTMLElement,
  left: number,
  top: number,
  opts?: { bounds?: UiSafeBounds },
): void {
  const rect = el.getBoundingClientRect();
  const width = rect.width || el.offsetWidth;
  const height = rect.height || el.offsetHeight;
  const b = opts?.bounds ?? getUiSafeBounds();
  const c = clampWindowRect(left, top, width, height, { bounds: b });
  el.style.left = `${Math.round(c.left)}px`;
  el.style.top = `${Math.round(c.top)}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
  // If the window is taller than the safe band, shrink max/height so content scrolls inside.
  if (height > b.height) {
    el.style.maxHeight = `${b.height}px`;
    if (
      el.style.height
      || el.id === "luminus-logwindow"
      || el.id === "luminus-linkwindow"
      || el.id === "luminus-chat-beta"
    ) {
      el.style.height = `${b.height}px`;
    }
  }
}

export function applyClampedSize(
  el: HTMLElement,
  width: number,
  height: number,
  opts?: { minWidth?: number; minHeight?: number; anchorLeft?: boolean; bounds?: UiSafeBounds },
): void {
  const rect = el.getBoundingClientRect();
  const left = opts?.anchorLeft === false
    ? rect.right - width
    : rect.left;
  const c = clampWindowRect(left, rect.top, width, height, opts);
  el.style.width = `${Math.round(c.width)}px`;
  el.style.height = `${Math.round(c.height)}px`;
  el.style.maxHeight = `${Math.round(c.height)}px`;
  el.style.left = `${Math.round(c.left)}px`;
  el.style.top = `${Math.round(c.top)}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
}

/**
 * Fit an existing element into the safe Nitro band (open / viewport change).
 * Does not force a fixed height on the main panel unless it already has one.
 *
 * Auto-sized panels (no inline height): maxHeight is the full safe band so
 * content can grow when switching to a larger view (e.g. Renderização → menu).
 * User-resized / forceHeight: keep the clamped height lock.
 */
export function fitElementInSafeBounds(
  el: HTMLElement,
  opts?: {
    minWidth?: number;
    minHeight?: number;
    forceHeight?: boolean;
    /** Drop inline height/maxHeight first so content reflows (main panel tabs). */
    autoSize?: boolean;
    bounds?: UiSafeBounds;
  },
): void {
  publishUiSafeBoundsCss();
  const b = opts?.bounds ?? getUiSafeBounds();

  if (opts?.autoSize) {
    el.style.height = "";
    el.style.maxHeight = "";
  }

  const rect = el.getBoundingClientRect();
  const width = rect.width || el.offsetWidth || 320;
  const height = rect.height || el.offsetHeight || 240;
  const c = clampWindowRect(rect.left, rect.top, width, height, { ...opts, bounds: b });
  el.style.left = `${Math.round(c.left)}px`;
  el.style.top = `${Math.round(c.top)}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";

  const lockHeight = Boolean(opts?.forceHeight || el.style.height);
  if (lockHeight) {
    el.style.height = `${Math.round(c.height)}px`;
    el.style.maxHeight = `${Math.round(c.height)}px`;
  } else {
    // Cap at safe band only — never pin maxHeight to the previous view's content height.
    el.style.maxHeight = `${Math.round(b.height)}px`;
    if (el.offsetHeight > b.height) {
      el.style.height = `${Math.round(b.height)}px`;
    }
  }
}

/** Start a pointer drag that keeps the window header inside safe bounds. */
export function beginClampedWindowDrag(
  el: HTMLElement,
  e: { clientX: number; clientY: number; preventDefault(): void },
): void {
  e.preventDefault();
  const rect = el.getBoundingClientRect();
  const ox = e.clientX - rect.left;
  const oy = e.clientY - rect.top;

  const move = (ev: MouseEvent) => {
    applyClampedPosition(el, ev.clientX - ox, ev.clientY - oy);
  };
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    fitElementInSafeBounds(el);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

/** Resize from bottom-right (logs/links) with safe-band clamp. */
export function beginClampedCornerResize(
  el: HTMLElement,
  e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void },
  opts?: { minWidth?: number; minHeight?: number },
): void {
  e.preventDefault();
  e.stopPropagation();
  const startW = el.offsetWidth;
  const startH = el.offsetHeight;
  const startX = e.clientX;
  const startY = e.clientY;

  const move = (ev: MouseEvent) => {
    applyClampedSize(
      el,
      startW + (ev.clientX - startX),
      startH + (ev.clientY - startY),
      opts,
    );
  };
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

let boundsWatchStarted = false;

/** Keep --lm-safe-* fresh and re-fit open Luminus chrome when the stage resizes. */
export function startUiSafeBoundsWatch(): void {
  if (boundsWatchStarted) return;
  boundsWatchStarted = true;

  const refitOpenWindows = () => {
    publishUiSafeBoundsCss();
    for (const id of ["luminus-panel", "luminus-logwindow", "luminus-linkwindow", "luminus-chat-beta"]) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (id === "luminus-panel" && !el.classList.contains("is-open")) continue;
      const isChat = id === "luminus-chat-beta";
      fitElementInSafeBounds(el, {
        minWidth: id === "luminus-panel" ? 280 : id === "luminus-linkwindow" ? 480 : isChat ? 480 : 360,
        minHeight: id === "luminus-panel" ? 200 : isChat ? 360 : 260,
        forceHeight: id !== "luminus-panel",
        bounds: isChat ? getChatSafeBounds() : undefined,
      });
    }
  };

  let lastToolbarTop = -1;
  const softSync = () => {
    publishUiSafeBoundsCss();
    const tb = document.querySelector(".nitro-toolbar") as HTMLElement | null;
    const top = tb?.getBoundingClientRect().top ?? -1;
    // Only re-fit when the safe band actually changes (toolbar mount/move/resize).
    if (Math.abs(top - lastToolbarTop) > 1) {
      lastToolbarTop = top;
      refitOpenWindows();
    }
  };

  publishUiSafeBoundsCss();
  window.addEventListener("resize", refitOpenWindows, { passive: true });
  // Toolbar can mount/unmount after room load without a window resize.
  const ro = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => softSync())
    : null;
  const observeToolbar = () => {
    const tb = document.querySelector(".nitro-toolbar");
    if (tb && ro) ro.observe(tb);
  };
  observeToolbar();
  const mo = new MutationObserver(() => {
    observeToolbar();
    softSync();
  });
  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: false });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      mo.observe(document.body, { childList: true, subtree: false });
      observeToolbar();
      softSync();
    }, { once: true });
  }
  // Toolbar layout sometimes settles after room enter without a clean resize event.
  window.setInterval(softSync, 2500);
}
