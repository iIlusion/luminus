import { normalizePanelSearch, searchPanelEntries, type PanelSearchEntry } from "./panelNavigation";

function equal(actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`expected ${String(expected)}, received ${String(actual)}`);
}

function sameValues(actual: string[], expected: string[]): void {
  equal(JSON.stringify(actual), JSON.stringify(expected));
}

const entries: PanelSearchEntry[] = [
  { id: "walk", title: "Anti-Caminhar", summary: "Trava seus passos", category: "Avatar", target: "avatar" },
  { id: "idle", title: "Anti-Idle", summary: "Mantém seu avatar ativo", category: "Avatar", target: "avatar" },
  { id: "look", title: "Anti-Girar", summary: "Mantém a direção", category: "Avatar", target: "avatar" },
  { id: "typing", title: "Anti-Digitando", summary: "Esconde o aviso", category: "Avatar", target: "avatar" },
  { id: "theme", title: "Tema", summary: "Personaliza a interface", category: "Interface", target: "interface", keywords: ["aparência"] },
];

equal(normalizePanelSearch(" Direção "), "direcao");
sameValues(searchPanelEntries(entries, "anti").map(entry => entry.id).sort(), ["idle", "look", "typing", "walk"]);
equal(searchPanelEntries(entries, "anti-idle")[0]?.id, "idle");
equal(searchPanelEntries(entries, "aparencia")[0]?.id, "theme");
sameValues(searchPanelEntries(entries, "").map(entry => entry.id), []);

console.log("panel navigation tests passed");
