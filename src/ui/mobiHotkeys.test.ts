import {
  getInventorySearchForKey,
  createInventoryLoadState,
  consumeMobiHistoryKeyRelease,
  getEscapeMobiAction,
  getInventoryMacroDecision,
  getMobiShortcutAction,
  MOBI_HOTKEY_DEFAULTS,
  noteInventoryFragment,
  resetInventoryLoadState,
  type MobiSelectedObjectData,
  type MobiShortcutEvent,
} from "./mobiHotkeys.ts";
import { registerParsers } from "../messages/registerParsers.ts";
import { packetRegistry } from "../messages/registry.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert(Object.is(actual, expected), `${message}: ${String(actual)} !== ${String(expected)}`);
}

function shortcut(overrides: Partial<MobiShortcutEvent>): MobiShortcutEvent {
  return {
    key: "z",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  };
}

registerParsers();
equal(packetRegistry.getOutgoingName(399), "RoomConstructionToolHistoryAction", "undo/redo deve usar o header de histórico 399");
assert(packetRegistry.compose("ROOM_CONSTRUCTION_TOOL_HISTORY_ACTION", ["undo"]) !== null, "o alias de histórico deve compor o packet");

equal(getInventorySearchForKey("F1"), "ativador", "F1 deve pesquisar ativador no inventário");
equal(getInventorySearchForKey("F8"), "piso", "F8 deve pesquisar piso no inventário");
equal(getInventorySearchForKey("F9"), null, "F9 deve ficar livre como no Hibisco");
equal(getInventorySearchForKey("F12"), null, "F12 deve ficar livre como no Hibisco");
equal(MOBI_HOTKEY_DEFAULTS.inventorySearch, true, "macro de inventário deve começar ligada");
equal(MOBI_HOTKEY_DEFAULTS.historyActions, true, "undo/redo deve começar ligado");
equal(MOBI_HOTKEY_DEFAULTS.escapePlacement, true, "Esc para mobi deve começar ligado");
equal(getInventoryMacroDecision(false, false), "blocked", "fora do quarto não deve abrir");
equal(getInventoryMacroDecision(false, true), "blocked", "fora do quarto não deve abrir mesmo com inventário carregado");
equal(getInventoryMacroDecision(true, false), "load", "dentro do quarto deve carregar antes de pesquisar");
equal(getInventoryMacroDecision(true, true), "search", "dentro do quarto com inventário carregado pode pesquisar");

const inventoryLoad = createInventoryLoadState();
equal(noteInventoryFragment(inventoryLoad, { totalFragments: 2, fragmentNumber: 0 }), false, "um fragmento não conclui o inventário");
equal(noteInventoryFragment(inventoryLoad, { totalFragments: 2, fragmentNumber: 1 }), true, "todos os fragmentos concluem o inventário");
resetInventoryLoadState(inventoryLoad);
equal(inventoryLoad.loaded, false, "refresh deve invalidar o inventário carregado");

equal(getMobiShortcutAction(shortcut({ key: "z", ctrlKey: true })), "undo", "Ctrl+Z deve desfazer");
equal(getMobiShortcutAction(shortcut({ key: "y", ctrlKey: true })), "redo", "Ctrl+Y deve refazer");
equal(getMobiShortcutAction(shortcut({ key: "Z", ctrlKey: true, shiftKey: true })), null, "Ctrl+Shift+Z não deve criar macro extra");
equal(getMobiShortcutAction(shortcut({ key: "z", ctrlKey: false, metaKey: true })), null, "Command+Z não deve substituir Ctrl+Z");
equal(getMobiShortcutAction(shortcut({ key: "F1" })), "search", "F1 deve ser uma ação de pesquisa");
assert(getMobiShortcutAction(shortcut({ key: "F9" })) === null, "F9 sem macro não deve consumir a tecla");

const suppressedHistoryKeys = new Set(["KeyZ"]);
assert(consumeMobiHistoryKeyRelease(suppressedHistoryKeys, { key: "z", code: "KeyZ" }), "keyup de Z deve ser consumido");
assert(!consumeMobiHistoryKeyRelease(suppressedHistoryKeys, { key: "z", code: "KeyZ" }), "o mesmo keyup não deve ser consumido duas vezes");

const placeSelection: MobiSelectedObjectData = { id: 1, category: 1, operation: "OBJECT_PLACE" };
const moveSelection: MobiSelectedObjectData = { id: 2, category: 1, operation: "OBJECT_MOVE" };
equal(getEscapeMobiAction(placeSelection), "place", "Esc deve finalizar a colocação");
equal(getEscapeMobiAction(moveSelection), "move", "Esc deve finalizar a movimentação");
equal(getEscapeMobiAction({ ...moveSelection, operation: "OBJECT_UNDEFINED" }), null, "Esc não deve consumir uma seleção sem ação de mobi");

console.log("mobiHotkeys.test.ts: ok");
