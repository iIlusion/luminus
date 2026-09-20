import type { LuminusApi } from "../ws/api";
import { ensureRoomEngine } from "../room/nitroWorldOverlay";
import { readPref, writePref } from "../util/prefs";

export type MobiHotkeySettings = {
  inventorySearch: boolean;
  historyActions: boolean;
  escapePlacement: boolean;
};

export const MOBI_HOTKEY_DEFAULTS: MobiHotkeySettings = {
  inventorySearch: true,
  historyActions: true,
  escapePlacement: true,
};

const MOBI_HOTKEY_SETTINGS_KEY = "luminus.room.mobiHotkeys";

export function getMobiHotkeySettings(): MobiHotkeySettings {
  return {
    ...MOBI_HOTKEY_DEFAULTS,
    ...readPref<Partial<MobiHotkeySettings>>(MOBI_HOTKEY_SETTINGS_KEY, MOBI_HOTKEY_DEFAULTS),
  };
}

export function setMobiHotkeySettings(settings: MobiHotkeySettings): void {
  writePref(MOBI_HOTKEY_SETTINGS_KEY, settings);
}

const INVENTORY_SEARCHES: Readonly<Record<string, string>> = {
  F1: "ativador",
  F2: "efeito",
  F3: "condição",
  F4: "seletor",
  F5: "wired extra",
  F6: "esfera",
  F7: "porta",
  F8: "piso",
};

type MobiShortcutAction = "search" | "undo" | "redo";

export type MobiShortcutEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">;
export type MobiHistoryKeyRelease = Pick<KeyboardEvent, "key" | "code">;

export type MobiSelectedObjectData = {
  id: number;
  category: number;
  operation: string;
};

export type InventoryFragment = {
  totalFragments: number;
  fragmentNumber: number;
};

export type InventoryLoadState = {
  expectedFragments: number | null;
  receivedFragments: Set<number>;
  loaded: boolean;
};

export function createInventoryLoadState(): InventoryLoadState {
  return {
    expectedFragments: null,
    receivedFragments: new Set(),
    loaded: false,
  };
}

export function resetInventoryLoadState(state: InventoryLoadState): void {
  state.expectedFragments = null;
  state.receivedFragments.clear();
  state.loaded = false;
}

export function noteInventoryFragment(state: InventoryLoadState, fragment: InventoryFragment): boolean {
  if (!Number.isInteger(fragment.totalFragments) || fragment.totalFragments < 1) return state.loaded;
  if (!Number.isInteger(fragment.fragmentNumber) || fragment.fragmentNumber < 0) return state.loaded;

  if (state.expectedFragments !== fragment.totalFragments) {
    resetInventoryLoadState(state);
    state.expectedFragments = fragment.totalFragments;
  }

  state.receivedFragments.add(fragment.fragmentNumber);
  state.loaded = state.receivedFragments.size >= fragment.totalFragments;
  return state.loaded;
}

export type InventoryMacroDecision = "blocked" | "load" | "search";

export function getInventoryMacroDecision(inRoom: boolean, inventoryLoaded: boolean): InventoryMacroDecision {
  if (!inRoom) return "blocked";
  return inventoryLoaded ? "search" : "load";
}

export function getInventorySearchForKey(key: string): string | null {
  return INVENTORY_SEARCHES[key.toUpperCase()] ?? null;
}

export function getMobiShortcutAction(event: MobiShortcutEvent): MobiShortcutAction | null {
  if (event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    if (event.key.toLowerCase() === "z") return "undo";
    if (event.key.toLowerCase() === "y") return "redo";
  }

  if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    return getInventorySearchForKey(event.key) === null ? null : "search";
  }

  return null;
}

export function consumeMobiHistoryKeyRelease(suppressedKeys: Set<string>, event: MobiHistoryKeyRelease): boolean {
  const keyId = event.code || event.key;
  if (!suppressedKeys.has(keyId)) return false;
  suppressedKeys.delete(keyId);
  return true;
}

export function getEscapeMobiAction(selection: MobiSelectedObjectData): "place" | "move" | null {
  if (selection.operation === "OBJECT_PLACE" || selection.operation === "OBJECT_PLACE_TO") return "place";
  if (selection.operation === "OBJECT_MOVE" || selection.operation === "OBJECT_MOVE_TO") return "move";
  return null;
}

function consume(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function clickInventoryLink(page: Window): void {
  const link = page.document.createElement("a");
  link.href = "event:inventory/show";
  link.style.display = "none";
  (page.document.body ?? page.document.documentElement).appendChild(link);
  link.click();
  link.remove();
}

function setInventorySearch(page: Window, search: string): void {
  let attempts = 0;

  const apply = (): boolean => {
    const input = page.document.querySelector<HTMLInputElement>(".nitro-inventory input[type='text']");
    if (!input) return false;

    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
    if (setter) setter.call(input, search);
    else input.value = search;
    const EventCtor = page.document.defaultView?.Event ?? Event;
    input.dispatchEvent(new EventCtor("input", { bubbles: true }));
    return true;
  };

  const retry = (): void => {
    if (apply() || attempts >= 40) return;
    attempts += 1;
    page.setTimeout(retry, 50);
  };

  retry();
}

function openInventory(page: Window): void {
  clickInventoryLink(page);
}

function finalizeSelectedMobi(api: LuminusApi, page: Window): boolean {
  const engine = ensureRoomEngine(page);
  if (!engine) return false;

  const roomId = engine.activeRoomId ?? api.room.id;
  if (roomId == null) return false;

  const selected = engine.getSelectedRoomObjectData?.(roomId);
  if (!selected) return false;

  const action = getEscapeMobiAction(selected);
  const handler = engine.objectEventHandler;
  if (!action || !handler) return false;

  if (action === "place" && handler.placeObject) {
    engine._activeRoomIsDragged = false;
    handler.placeObject(roomId, false, false);
    return true;
  }

  if (action === "move" && handler.modifyRoomObject) {
    engine._activeRoomIsDragged = false;
    handler.modifyRoomObject(roomId, selected.id, selected.category, "OBJECT_MOVE_TO");
    return true;
  }

  return false;
}

const initializedWindows = new WeakSet<Window>();

export function initMobiHotkeys(api: LuminusApi, targetWindow: Window): void {
  if (initializedWindows.has(targetWindow)) return;
  initializedWindows.add(targetWindow);

  const inventoryLoad = createInventoryLoadState();
  let pendingSearch: string | null = null;
  const suppressedHistoryKeys = new Set<string>();
  api.onIncoming(3151, () => resetInventoryLoadState(inventoryLoad));
  api.onIncoming(994, ({ packet }) => {
    const parsed = packet.parsed as Partial<InventoryFragment> | undefined;
    if (
      typeof parsed?.totalFragments === "number"
      && typeof parsed.fragmentNumber === "number"
    ) {
      const loaded = noteInventoryFragment(inventoryLoad, parsed as InventoryFragment);
      if (loaded && pendingSearch) {
        const search = pendingSearch;
        pendingSearch = null;
        if (api.room.id != null && getMobiHotkeySettings().inventorySearch) {
          setInventorySearch(targetWindow, search);
        }
      }
    }
  });

  targetWindow.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (getMobiHotkeySettings().escapePlacement && finalizeSelectedMobi(api, targetWindow)) consume(event);
      return;
    }

    const action = getMobiShortcutAction(event);
    if (!action) return;

    if (action === "search") {
      if (!getMobiHotkeySettings().inventorySearch) return;
      const search = getInventorySearchForKey(event.key);
      if (!search) return;
      const decision = getInventoryMacroDecision(api.room.id != null, inventoryLoad.loaded);
      if (decision === "blocked") return;
      consume(event);
      if (decision === "load") {
        pendingSearch = search;
        openInventory(targetWindow);
        api.send("USER_FURNITURE", []);
      } else {
        openInventory(targetWindow);
        setInventorySearch(targetWindow, search);
      }
      return;
    }

    if (!getMobiHotkeySettings().historyActions || api.room.id == null) return;
    suppressedHistoryKeys.add(event.code || event.key);
    consume(event);
    api.send("ROOM_CONSTRUCTION_TOOL_HISTORY_ACTION", [action]);
  }, true);

  targetWindow.addEventListener("keyup", event => {
    if (!consumeMobiHistoryKeyRelease(suppressedHistoryKeys, event)) return;
    consume(event);
  }, true);
}
