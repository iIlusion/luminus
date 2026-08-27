import { getHabbletListExpansionState, hasActiveHabbletFilters } from "./habbletList.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const empty = { gender: "all", extension: "all", links: "all" };
assert(!hasActiveHabbletFilters(empty, ""), "estado inicial não deve marcar filtros ativos");
assert(hasActiveHabbletFilters(empty, "nome"), "busca preenchida deve habilitar limpar");
assert(hasActiveHabbletFilters({ ...empty, gender: "f" }, ""), "filtro selecionado deve habilitar limpar");
const expanded = getHabbletListExpansionState(false);
assert(expanded.expanded, "o controle deve expandir a lista quando ela estÃ¡ recolhida");
assert(expanded.label === "Recolher lista", "o estado expandido deve expor a aÃ§Ã£o de recolher");
const collapsed = getHabbletListExpansionState(true);
assert(!collapsed.expanded, "o controle deve recolher a lista quando ela estÃ¡ expandida");
assert(collapsed.label === "Expandir lista", "o estado recolhido deve expor a aÃ§Ã£o de expandir");
