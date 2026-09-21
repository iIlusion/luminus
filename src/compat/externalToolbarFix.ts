import { readPref, writePref } from "../util/prefs";

const EXTERNAL_TOOLBAR_FIX_KEY = "luminus.experimental.externalToolbarFix";
const EXTERNAL_TOOLBAR_FIX_MARK = "toolbar-host";
const TOOLBAR_BOOTSTRAP_SELECTOR = ".navigation-item";
const EXTERNAL_TOOLBAR_SELECTOR = ".nitro-toolbar";
const LUMINUS_TOOLBAR_MOUNT_SELECTOR = ".toolbar-navigation > div:first-child";

let observer: MutationObserver | null = null;
let domReadyHandler: (() => void) | null = null;
let bootstrapGuardRestore: (() => void) | null = null;
let bootstrapGuardTimer: number | null = null;
let activeWindow: CompatibilityWindow | null = null;
let compatibilityEnabled = true;
const previousToolbarInsets = new WeakMap<HTMLElement, { value: string; priority: string }>();

type CompatibilityWindow = Window & {
  RoomEngine?: object | null;
};

type QueryDocument = Pick<Document, "querySelector"> & Partial<Pick<Document, "querySelectorAll">>;

function findBottomMostCandidate(document: QueryDocument, selector: string): Element | null {
  const candidates = document.querySelectorAll?.(selector);
  if (candidates && candidates.length > 0) {
    return [...candidates].reduce((current, candidate) => (
      candidate.getBoundingClientRect().top >= current.getBoundingClientRect().top
        ? candidate
        : current
    ));
  }
  return document.querySelector(selector);
}

export function getExternalToolbarFixEnabled(): boolean {
  return readPref(EXTERNAL_TOOLBAR_FIX_KEY, true);
}

export function isExternalToolbarFixActive(): boolean {
  return compatibilityEnabled;
}

export function shouldDelayToolbarBootstrapSelector(selector: string, roomEngineReady: boolean): boolean {
  return selector === TOOLBAR_BOOTSTRAP_SELECTOR && !roomEngineReady;
}

export function findExternalToolbarHost(document: QueryDocument): HTMLElement | null {
  return findBottomMostCandidate(document, EXTERNAL_TOOLBAR_SELECTOR) as HTMLElement | null;
}

/**
 * Mount Luminus controls in the existing left navigation group while keeping
 * the compatibility marker on the actual Nitro toolbar element.
 */
export function findLuminusToolbarMount(document: QueryDocument): HTMLElement | null {
  const toolbar = findExternalToolbarHost(document);
  if (!toolbar) return null;
  return toolbar.querySelector(LUMINUS_TOOLBAR_MOUNT_SELECTOR) as HTMLElement | null ?? toolbar;
}

/**
 * The compatibility marker belongs to the real Nitro toolbar. Page-world
 * integrations use this marker as their mount point; marking an inner flex
 * group makes it render as a second toolbar.
 */
export function applyExternalToolbarCompatibility(document: QueryDocument): boolean {
  const host = findExternalToolbarHost(document);
  if (!host || host.dataset.luminusExternalToolbarFix === EXTERNAL_TOOLBAR_FIX_MARK) return false;

  if (!host.matches(".nitro-toolbar-me")) host.classList.add("nitro-toolbar-me");
  previousToolbarInsets.set(host, {
    value: host.style.getPropertyValue("inset"),
    priority: host.style.getPropertyPriority("inset"),
  });
  host.style.setProperty("inset", "auto 0 0 0", "important");
  host.dataset.luminusExternalToolbarFix = EXTERNAL_TOOLBAR_FIX_MARK;
  return true;
}

function removeExternalToolbarCompatibility(): void {
  document.querySelectorAll<HTMLElement>(`[data-luminus-external-toolbar-fix="${EXTERNAL_TOOLBAR_FIX_MARK}"]`).forEach(host => {
    const previousInset = previousToolbarInsets.get(host);
    if (previousInset?.value) host.style.setProperty("inset", previousInset.value, previousInset.priority);
    else host.style.removeProperty("inset");
    previousToolbarInsets.delete(host);
    host.classList.remove("nitro-toolbar-me");
    host.removeAttribute("data-luminus-external-toolbar-fix");
  });
}

function isToolbarMutation(record: MutationRecord): boolean {
  if (record.type === "attributes") {
    const target = record.target as Element;
    return target.matches(".nitro-toolbar, .toolbar-navigation, .nitro-toolbar-me");
  }

  return [...record.addedNodes].some(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    return element.matches(".nitro-toolbar, .toolbar-navigation, .nitro-toolbar-me")
      || Boolean(element.querySelector(".nitro-toolbar, .toolbar-navigation, .nitro-toolbar-me"));
  });
}

function startObserver(): void {
  const observationRoot = document.body ?? document.documentElement;
  if (!observationRoot) return;
  applyExternalToolbarCompatibility(document);
  if (observer) return;

  observer = new MutationObserver(records => {
    if (records.some(isToolbarMutation)) applyExternalToolbarCompatibility(document);
  });
  observer.observe(observationRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
  if (domReadyHandler) {
    document.removeEventListener("DOMContentLoaded", domReadyHandler);
    domReadyHandler = null;
  }
  removeExternalToolbarCompatibility();
}

function stopBootstrapGuard(): void {
  if (bootstrapGuardTimer !== null) {
    window.clearInterval(bootstrapGuardTimer);
    bootstrapGuardTimer = null;
  }
  bootstrapGuardRestore?.();
  bootstrapGuardRestore = null;
}

function startBootstrapGuard(page: CompatibilityWindow): void {
  if (bootstrapGuardRestore) return;

  const documentObject = page.document;
  const originalQuerySelector = documentObject.querySelector;
  const guardedQuerySelector = function(this: Document, selector: string): Element | null {
    if (shouldDelayToolbarBootstrapSelector(selector, Boolean(page.RoomEngine))) return null;
    return originalQuerySelector.call(this, selector);
  };

  try {
    Object.defineProperty(documentObject, "querySelector", {
      configurable: true,
      value: guardedQuerySelector,
      writable: true,
    });
  } catch {
    return;
  }

  const restore = () => {
    try {
      Object.defineProperty(documentObject, "querySelector", {
        configurable: true,
        value: originalQuerySelector,
        writable: true,
      });
    } catch {
      // Ignore pages that lock the document method after boot.
    }
    if (bootstrapGuardTimer !== null) {
      window.clearInterval(bootstrapGuardTimer);
      bootstrapGuardTimer = null;
    }
  };
  bootstrapGuardRestore = restore;

  if (page.RoomEngine) {
    restore();
    bootstrapGuardRestore = null;
    return;
  }

  let attempts = 0;
  bootstrapGuardTimer = window.setInterval(() => {
    attempts += 1;
    if (page.RoomEngine || attempts >= 1200) {
      restore();
      bootstrapGuardRestore = null;
    }
  }, 25);
}

function enableObserver(page: CompatibilityWindow): void {
  activeWindow = page;
  startBootstrapGuard(page);
  if (document.body || document.documentElement) {
    startObserver();
    return;
  }
  if (!domReadyHandler) {
    domReadyHandler = () => {
      domReadyHandler = null;
      startObserver();
    };
    document.addEventListener("DOMContentLoaded", domReadyHandler, { once: true });
  }
}

export function setExternalToolbarFixEnabled(enabled: boolean): void {
  writePref(EXTERNAL_TOOLBAR_FIX_KEY, enabled);
  compatibilityEnabled = enabled;
  if (enabled) enableObserver(activeWindow ?? (window as CompatibilityWindow));
  else {
    stopObserver();
    stopBootstrapGuard();
  }
}

export function initExternalToolbarFix(page: CompatibilityWindow = window): void {
  activeWindow = page;
  compatibilityEnabled = getExternalToolbarFixEnabled();
  if (compatibilityEnabled) enableObserver(page);
}
