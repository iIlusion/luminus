import { HABBLET_LIST_STYLES } from "./habbletListStyles.ts";

assert(
  /\.nitro-user-chooser-widget\.luminus-habblet-list-enhanced\.luminus-habblet-list-expanded\s*\{[\s\S]*?height:/s.test(HABBLET_LIST_STYLES),
  "a lista deve ter um estado visual expandido",
);
assert(
  /\.nitro-card-header\s*\{[\s\S]*?border-top:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;/s.test(HABBLET_LIST_STYLES),
  "o header Nitro nÃ£o deve carregar a borda azul herdada",
);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  /\.nitro-user-chooser-widget\.luminus-habblet-list-enhanced\s+\.user-row\s*>\s*\.text-black,/.test(HABBLET_LIST_STYLES),
  "a lista deve substituir o text-black nativo por texto Luminus legível",
);
assert(
  /\.user-row\s*>\s*\.text-black,[\s\S]*?\.row-text\s*\{\s*color:\s*var\(--luminus-ui-text\)\s*!important/s.test(HABBLET_LIST_STYLES),
  "as colunas da lista devem ter cor de texto explícita",
);
assert(
  /\.nitro-user-chooser-widget\.luminus-habblet-list-enhanced\s+\.text-black\s*\{[\s\S]*?color:\s*var\(--luminus-ui-text\)\s*!important/s.test(HABBLET_LIST_STYLES),
  "o cabeçalho e as células nativas devem herdar o texto Luminus",
);
assert(
  /\.search-filter:focus[\s\S]*?select:focus[\s\S]*?outline/s.test(HABBLET_LIST_STYLES),
  "os inputs de filtro devem ter foco visível",
);
assert(
  /\.luminus-habblet-filter-clear:disabled\s*\{[\s\S]*?opacity:/s.test(HABBLET_LIST_STYLES),
  "limpar deve comunicar quando não há filtros ativos",
);
