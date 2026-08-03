/**
 * Session hide of floor/wall furniture by Nitro class (`object.type`).
 *
 * Driven by:
 *  - eye icon on furniture infostand
 *  - eye icon on each row of the Habblet "Mobis" chooser (:furnis)
 *
 * Uses Nitro's native alpha path (Hibisco-style):
 *   roomObjectEventHandler.setFurnitureAlphaMultiplier(obj, alpha)
 *   model.setValue("preset_opacity", alpha)
 *
 * Visibility only toggles via the eye icons — closing the infostand or
 * switching selection does NOT restore. Leaving the room clears the session set.
 */

import type { LuminusApi } from "../ws/api";
import { ensureRoomEngine } from "./nitroWorldOverlay";
import { getTargetWindow } from "../ws/interceptWebSocket";
import { readPref, writePref } from "../util/prefs";

const PREF_ENABLED = "luminus.render.furniClassHide.enabled";
const FLOOR = 10;
const WALL = 20;
const CATEGORIES = [FLOOR, WALL] as const;
const KEEP_HIDDEN_INTERVAL_MS = 500;
const NAME_MAP_TTL_MS = 1500;
const CHOOSER_SELECTOR = ".nitro-furni-chooser-widget";

export interface FurniClassHideState {
  enabled: boolean;
  /** All currently hidden class names. */
  hiddenTypes: string[];
  /** Labels for hidden types (best-effort display names). */
  hiddenLabels: Record<string, string>;
  /** Total room objects currently matching any hidden type. */
  hiddenCount: number;
  /** Infostand focus (selection), if any. */
  focusType: string | null;
  focusLabel: string | null;
  focusCount: number;
  /** Whether the focused class is currently hidden. */
  focusHidden: boolean;
}

type Listener = (state: FurniClassHideState) => void;

type NitroVisualization = {
  _alphaMultiplier?: number;
  _alphaChanged?: boolean;
  __lmOriginalAlpha?: number;
};

type NitroModel = {
  getValue?: (key: string) => unknown;
  setValue?: (key: string, value: unknown) => void;
};

type NitroRoomObject = {
  id?: number;
  type?: string;
  updateCounter?: number;
  _visualization?: NitroVisualization | null;
  visualization?: NitroVisualization | null;
  _model?: NitroModel | null;
  model?: NitroModel | null;
};

type FurnitureData = {
  _id?: number;
  id?: number;
  _className?: string;
  className?: string;
  _localizedName?: string;
  localizedName?: string;
};

type SessionDataManager = {
  getFloorItemData?: (typeId: number) => FurnitureData | null | undefined;
  getFloorItemDataByName?: (name: string) => FurnitureData | null | undefined;
  getWallItemData?: (typeId: number) => FurnitureData | null | undefined;
  getWallItemDataByName?: (name: string) => FurnitureData | null | undefined;
  _floorItems?: Map<unknown, FurnitureData>;
  _wallItems?: Map<unknown, FurnitureData>;
};

type RoomObjectEventHandler = {
  _selectedObjectId?: number;
  _selectedObjectCategory?: number;
  setFurnitureAlphaMultiplier?: (object: NitroRoomObject, alpha: number) => void;
};

type RoomEngineLike = {
  activeRoomId?: number;
  sessionDataManager?: SessionDataManager;
  _sessionDataManager?: SessionDataManager;
  getRoomObject?: (roomId: number, id: number, category: number) => NitroRoomObject | null | undefined;
  getRoomObjects?: (roomId: number, category: number) => NitroRoomObject[] | null | undefined;
  _roomObjectEventHandler?: RoomObjectEventHandler;
};

let apiRef: LuminusApi | null = null;
let started = false;
let enabled = false;
/** type → display label */
const hidden = new Map<string, string>();
let focusType: string | null = null;
let focusLabel: string | null = null;
let focusObjectId: number | null = null;
let focusCategory: number | null = null;
let keepTimer = 0;
let watchTimer = 0;
let chooserObserver: MutationObserver | null = null;
let lastRoomId: number | null = null;
const listeners = new Set<Listener>();
const unsubs: Array<() => void> = [];
/** object keys we touched: category:id → type */
const touched = new Map<string, string>();

let nameMapCache: { at: number; map: Map<string, string> } | null = null;

const FURNI_EYE_OPEN_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
</svg>`;

const FURNI_EYE_OFF_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

function notify(): void {
  const state = getState();
  for (const listener of listeners) listener(state);
}

function engine(): RoomEngineLike | null {
  return ensureRoomEngine(getTargetWindow()) as RoomEngineLike | null;
}

function sessionData(): SessionDataManager | null {
  const re = engine();
  return re?.sessionDataManager ?? re?._sessionDataManager ?? null;
}

function objectKey(category: number, id: number): string {
  return `${category}:${id}`;
}

function getVis(obj: NitroRoomObject | null | undefined): NitroVisualization | null {
  return obj?._visualization ?? obj?.visualization ?? null;
}

function getModel(obj: NitroRoomObject | null | undefined): NitroModel | null {
  return obj?._model ?? obj?.model ?? null;
}

function setObjectAlpha(obj: NitroRoomObject, alpha: number): void {
  const re = engine();
  const handler = re?._roomObjectEventHandler;
  const vis = getVis(obj);
  const model = getModel(obj);

  if (vis && vis.__lmOriginalAlpha == null) {
    vis.__lmOriginalAlpha = typeof vis._alphaMultiplier === "number" ? vis._alphaMultiplier : 1;
  }

  if (typeof handler?.setFurnitureAlphaMultiplier === "function") {
    try { handler.setFurnitureAlphaMultiplier(obj, alpha); } catch { /* soft */ }
  } else if (vis) {
    vis._alphaMultiplier = alpha;
    vis._alphaChanged = true;
  }

  try { model?.setValue?.("preset_opacity", alpha); } catch { /* soft */ }
  try { model?.setValue?.("furniture_alpha_multiplier", alpha); } catch { /* soft */ }

  if (vis) {
    vis._alphaMultiplier = alpha;
    vis._alphaChanged = true;
  }
  try {
    if (typeof obj.updateCounter === "number") obj.updateCounter += 1;
  } catch { /* soft */ }
}

function listObjectsOfType(type: string): Array<{ obj: NitroRoomObject; category: number; id: number }> {
  const re = engine();
  const roomId = re?.activeRoomId ?? apiRef?.room.id ?? null;
  if (!re || roomId == null) return [];
  const out: Array<{ obj: NitroRoomObject; category: number; id: number }> = [];
  for (const category of CATEGORIES) {
    const list = re.getRoomObjects?.(roomId, category) ?? [];
    for (const obj of list) {
      if (!obj || obj.type !== type || typeof obj.id !== "number") continue;
      out.push({ obj, category, id: obj.id });
    }
  }
  return out;
}

function applyType(type: string, alpha: number): number {
  const matches = listObjectsOfType(type);
  for (const { obj, category, id } of matches) {
    setObjectAlpha(obj, alpha);
    if (alpha === 0) touched.set(objectKey(category, id), type);
    else touched.delete(objectKey(category, id));
  }
  return matches.length;
}

function applyAllHidden(): void {
  for (const type of hidden.keys()) applyType(type, 0);
}

function restoreType(type: string): void {
  const matches = listObjectsOfType(type);
  for (const { obj, category, id } of matches) {
    const vis = getVis(obj);
    const orig = vis?.__lmOriginalAlpha ?? 1;
    setObjectAlpha(obj, orig > 0 ? orig : 1);
    touched.delete(objectKey(category, id));
  }
  // Also restore any touched keys for this type that might have despawned from list
  for (const [key, t] of [...touched]) {
    if (t !== type) continue;
    const [catStr, idStr] = key.split(":");
    const category = Number(catStr);
    const id = Number(idStr);
    const re = engine();
    const roomId = re?.activeRoomId ?? apiRef?.room.id ?? null;
    if (re && roomId != null && Number.isFinite(category) && Number.isFinite(id)) {
      const obj = re.getRoomObject?.(roomId, id, category);
      if (obj) {
        const vis = getVis(obj);
        const orig = vis?.__lmOriginalAlpha ?? 1;
        setObjectAlpha(obj, orig > 0 ? orig : 1);
      }
    }
    touched.delete(key);
  }
}

function restoreAll(): void {
  for (const type of [...hidden.keys()]) restoreType(type);
  hidden.clear();
  stopKeepLoop();
  refreshChooserEyes();
  notify();
}

function startKeepLoop(): void {
  if (keepTimer) return;
  keepTimer = window.setInterval(() => {
    if (!hidden.size) {
      stopKeepLoop();
      return;
    }
    applyAllHidden();
  }, KEEP_HIDDEN_INTERVAL_MS);
}

function stopKeepLoop(): void {
  if (!keepTimer) return;
  window.clearInterval(keepTimer);
  keepTimer = 0;
}

function readNitroSelection(): {
  type: string | null;
  objectId: number | null;
  category: number | null;
} {
  const re = engine();
  const roomId = re?.activeRoomId ?? null;
  const handler = re?._roomObjectEventHandler;
  if (!re || roomId == null || !handler) {
    return { type: null, objectId: null, category: null };
  }
  const objectId = handler._selectedObjectId;
  const category = handler._selectedObjectCategory;
  if (
    objectId == null
    || category == null
    || objectId < 0
    || (category !== FLOOR && category !== WALL)
  ) {
    return { type: null, objectId: null, category: null };
  }
  const obj = re.getRoomObject?.(roomId, objectId, category);
  const type = obj?.type ?? null;
  if (!type) return { type: null, objectId: null, category: null };
  return { type, objectId, category };
}

function localizedNameForType(type: string): string | null {
  const sdm = sessionData();
  if (!sdm) return null;
  try {
    const byName = sdm.getFloorItemDataByName?.(type) ?? sdm.getWallItemDataByName?.(type);
    const loc = byName?._localizedName ?? byName?.localizedName;
    if (loc) return loc;
  } catch { /* soft */ }
  // Fallback: typeId from a live object
  const first = listObjectsOfType(type)[0];
  if (!first) return null;
  const typeId = Number(getModel(first.obj)?.getValue?.("furniture_type_id"));
  if (!Number.isFinite(typeId)) return null;
  try {
    const data = sdm.getFloorItemData?.(typeId) ?? sdm.getWallItemData?.(typeId);
    return data?._localizedName ?? data?.localizedName ?? null;
  } catch {
    return null;
  }
}

/** Build localizedName → Nitro className for objects currently in the room. */
function buildRoomNameToTypeMap(): Map<string, string> {
  const now = performance.now();
  if (nameMapCache && now - nameMapCache.at < NAME_MAP_TTL_MS) return nameMapCache.map;

  const map = new Map<string, string>();
  const re = engine();
  const roomId = re?.activeRoomId ?? apiRef?.room.id ?? null;
  const sdm = sessionData();
  if (!re || roomId == null) {
    nameMapCache = { at: now, map };
    return map;
  }

  const seenTypes = new Set<string>();
  for (const category of CATEGORIES) {
    const list = re.getRoomObjects?.(roomId, category) ?? [];
    for (const obj of list) {
      const type = obj?.type;
      if (!type || seenTypes.has(type)) continue;
      seenTypes.add(type);
      let loc = localizedNameForType(type);
      if (!loc && sdm) {
        const typeId = Number(getModel(obj)?.getValue?.("furniture_type_id"));
        if (Number.isFinite(typeId)) {
          try {
            const data = category === WALL
              ? sdm.getWallItemData?.(typeId)
              : sdm.getFloorItemData?.(typeId);
            loc = data?._localizedName ?? data?.localizedName ?? null;
          } catch { /* soft */ }
        }
      }
      if (loc) map.set(loc, type);
    }
  }

  nameMapCache = { at: now, map };
  return map;
}

export function isTypeHidden(type: string | null | undefined): boolean {
  return Boolean(type && hidden.has(type));
}

export function hideType(type: string, label?: string | null): boolean {
  if (!enabled || !type) return false;
  const display = label?.trim() || localizedNameForType(type) || type;
  hidden.set(type, display);
  applyType(type, 0);
  startKeepLoop();
  refreshChooserEyes();
  notify();
  return true;
}

export function showType(type: string): boolean {
  if (!type || !hidden.has(type)) return false;
  restoreType(type);
  hidden.delete(type);
  if (!hidden.size) stopKeepLoop();
  refreshChooserEyes();
  notify();
  return true;
}

/** Toggle a class by Nitro type string. Returns true if now hidden. */
export function toggleType(type: string, label?: string | null): boolean {
  if (!enabled || !type) return false;
  if (hidden.has(type)) {
    showType(type);
    return false;
  }
  hideType(type, label);
  return true;
}

export function isFocusHidden(): boolean {
  return isTypeHidden(focusType);
}

/**
 * Infostand focus update only — does NOT restore hidden classes when the card closes
 * or the selection changes.
 */
export function onFurnitureInfostand(furniTitle: string | null): void {
  if (!started) return;

  const roomId = apiRef?.room.id ?? engine()?.activeRoomId ?? null;
  if (roomId !== lastRoomId) {
    // New room: clear session hides.
    if (hidden.size) restoreAll();
    lastRoomId = roomId;
  }

  if (!enabled) {
    if (hidden.size) restoreAll();
    if (focusType !== null || focusLabel !== null) {
      focusType = null;
      focusLabel = null;
      focusObjectId = null;
      focusCategory = null;
      notify();
    }
    return;
  }

  if (!furniTitle) {
    if (focusType !== null || focusLabel !== null) {
      focusType = null;
      focusLabel = null;
      focusObjectId = null;
      focusCategory = null;
      notify();
    }
    return;
  }

  const sel = readNitroSelection();
  const prevType = focusType;
  const prevLabel = focusLabel;

  if (sel.type) {
    focusType = sel.type;
    focusLabel = furniTitle;
    focusObjectId = sel.objectId;
    focusCategory = sel.category;
  } else {
    // Keep last type if selection dropped (common after hide); still show title.
    focusLabel = furniTitle;
  }

  if (prevType !== focusType || prevLabel !== focusLabel) notify();
}

export function hideFocusedClass(): boolean {
  if (!enabled) return false;
  const sel = readNitroSelection();
  const type = sel.type ?? focusType;
  if (!type) return false;
  if (sel.type) {
    focusType = sel.type;
    focusObjectId = sel.objectId;
    focusCategory = sel.category;
  }
  return hideType(type, focusLabel);
}

export function showHiddenClass(): void {
  const type = focusType;
  if (type) showType(type);
}

export function toggleFocusedClass(): boolean {
  if (!enabled) return false;
  const sel = readNitroSelection();
  const type = sel.type ?? focusType;
  if (!type) return false;
  if (sel.type) {
    focusType = sel.type;
    focusObjectId = sel.objectId;
    focusCategory = sel.category;
  }
  return toggleType(type, focusLabel);
}

export function getState(): FurniClassHideState {
  let hiddenCount = 0;
  const hiddenLabels: Record<string, string> = {};
  for (const [type, label] of hidden) {
    hiddenLabels[type] = label;
    hiddenCount += listObjectsOfType(type).length;
  }
  const focusCount = focusType ? listObjectsOfType(focusType).length : 0;
  return {
    enabled,
    hiddenTypes: [...hidden.keys()],
    hiddenLabels,
    hiddenCount,
    focusType,
    focusLabel,
    focusCount,
    focusHidden: isTypeHidden(focusType),
  };
}

export function setFurniClassHideEnabled(on: boolean): void {
  enabled = on;
  writePref(PREF_ENABLED, on);
  if (!on) {
    if (hidden.size) restoreAll();
    clearChooserEyes();
  } else {
    refreshChooserEyes();
  }
  notify();
}

export function subscribeFurniClassHide(listener: Listener): () => void {
  listeners.add(listener);
  listener(getState());
  return () => listeners.delete(listener);
}

// ── Mobis chooser (:furnis) eye icons ──────────────────────────────────────

function parseChooserLabel(raw: string): string {
  return raw
    .replace(/\s*\(x\d+\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveChooserRowType(row: Element, nameMap: Map<string, string>): {
  type: string | null;
  label: string;
} {
  const isDummy = row.classList.contains("dummy-row");
  const cells = row.querySelectorAll(".row-text");
  if (isDummy || cells.length < 3) {
    const raw = cells[0]?.textContent ?? row.textContent ?? "";
    const label = parseChooserLabel(raw);
    return { type: nameMap.get(label) ?? null, label };
  }
  const label = parseChooserLabel(cells[0]?.textContent ?? "");
  const id = Number((cells[2]?.textContent ?? "").trim());
  if (Number.isFinite(id)) {
    const re = engine();
    const roomId = re?.activeRoomId ?? null;
    if (re && roomId != null) {
      const obj = re.getRoomObject?.(roomId, id, FLOOR) ?? re.getRoomObject?.(roomId, id, WALL);
      if (obj?.type) return { type: obj.type, label: label || obj.type };
    }
  }
  // Fallback: name map
  return { type: nameMap.get(label) ?? null, label };
}

function clearChooserEyes(): void {
  document.querySelectorAll(".luminus-furni-chooser-eye").forEach(el => el.remove());
}

function refreshChooserEyes(): void {
  if (!enabled) {
    clearChooserEyes();
    return;
  }
  const root = document.querySelector(CHOOSER_SELECTOR);
  if (!root) {
    clearChooserEyes();
    return;
  }

  const nameMap = buildRoomNameToTypeMap();
  const rows = root.querySelectorAll(".furni-row");
  const seen = new Set<Element>();

  for (const row of rows) {
    const { type, label } = resolveChooserRowType(row, nameMap);
    if (!type) {
      row.querySelector(".luminus-furni-chooser-eye")?.remove();
      continue;
    }
    const host = row.querySelector(".row-text") ?? row;
    let eye = host.querySelector<HTMLButtonElement>(":scope > .luminus-furni-chooser-eye");
    // Also accept eye anywhere under row (React may reshuffle)
    if (!eye) eye = row.querySelector<HTMLButtonElement>(".luminus-furni-chooser-eye");

    if (!eye) {
      eye = document.createElement("button");
      eye.type = "button";
      eye.className = "luminus-furni-chooser-eye";
      eye.dataset.luminusUi = "1";
      eye.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        const t = eye!.dataset.type;
        if (!t) return;
        toggleType(t, eye!.dataset.label || null);
        // Immediate paint for this eye (notify also refreshes all)
        const nowHidden = isTypeHidden(t);
        eye!.dataset.hideState = nowHidden ? "1" : "0";
        eye!.classList.toggle("is-hidden", nowHidden);
        eye!.innerHTML = nowHidden ? FURNI_EYE_OFF_SVG : FURNI_EYE_OPEN_SVG;
        eye!.title = nowHidden ? `Reaparecer: ${eye!.dataset.label || t}` : `Ocultar classe: ${eye!.dataset.label || t}`;
      });
      // Prefixed inside name cell so it stays visible before expand.
      host.insertBefore(eye, host.firstChild);
    }

    eye.dataset.type = type;
    eye.dataset.label = label;
    const nowHidden = isTypeHidden(type);
    const next = nowHidden ? "1" : "0";
    if (eye.dataset.hideState !== next) {
      eye.dataset.hideState = next;
      eye.classList.toggle("is-hidden", nowHidden);
      eye.innerHTML = nowHidden ? FURNI_EYE_OFF_SVG : FURNI_EYE_OPEN_SVG;
      eye.title = nowHidden ? `Reaparecer: ${label}` : `Ocultar classe: ${label}`;
      eye.setAttribute("aria-label", eye.title);
      eye.setAttribute("aria-pressed", nowHidden ? "true" : "false");
    }
    seen.add(eye);
  }

  // Drop eyes for rows that disappeared
  root.querySelectorAll(".luminus-furni-chooser-eye").forEach(el => {
    if (!seen.has(el)) el.remove();
  });
}

function armChooserObserver(): void {
  if (chooserObserver) return;
  chooserObserver = new MutationObserver(() => {
    if (!enabled) return;
    // Coalesce to next frame — chooser virtualizes heavily.
    if ((armChooserObserver as unknown as { scheduled?: boolean }).scheduled) return;
    (armChooserObserver as unknown as { scheduled?: boolean }).scheduled = true;
    requestAnimationFrame(() => {
      (armChooserObserver as unknown as { scheduled?: boolean }).scheduled = false;
      refreshChooserEyes();
    });
  });
  const start = () => {
    chooserObserver?.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}

export function initFurniClassHide(api: LuminusApi): void {
  if (started) return;
  started = true;
  apiRef = api;
  enabled = readPref(PREF_ENABLED, false);
  lastRoomId = api.room.id;

  unsubs.push(api.onIncoming(2031, () => {
    if (hidden.size) restoreAll();
    lastRoomId = api.room.id;
    focusType = null;
    focusLabel = null;
    focusObjectId = null;
    focusCategory = null;
    nameMapCache = null;
    notify();
  }));

  unsubs.push(api.onIncoming(1778, () => {
    if (hidden.size) applyAllHidden();
    nameMapCache = null;
  }));

  // Focus sync for infostand + chooser paint while open.
  watchTimer = window.setInterval(() => {
    if (!enabled) return;

    const container = document.querySelector(".nitro-infostand-container");
    if (container?.querySelector(".furni-image")) {
      const title = container
        .querySelector<HTMLElement>(".goldfish.fw-bold")
        ?.textContent?.trim() ?? null;
      if (title) onFurnitureInfostand(title);
    } else if (focusType || focusLabel) {
      onFurnitureInfostand(null);
    }

    if (document.querySelector(CHOOSER_SELECTOR)) refreshChooserEyes();
  }, 350);

  armChooserObserver();
  if (enabled) refreshChooserEyes();

  api.furniClassHide = {
    getState,
    subscribe: subscribeFurniClassHide,
    setEnabled: setFurniClassHideEnabled,
    hideFocused: hideFocusedClass,
    showHidden: showHiddenClass,
    isFocusHidden,
    isTypeHidden,
    toggleType,
    hideType,
    showType,
  };
  notify();
}
