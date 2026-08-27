import { PANEL_STYLES } from "./styles.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  /\.lm-float-window \.lw-filter-btn:focus-visible\s*\{[\s\S]*?outline:/s.test(PANEL_STYLES),
  "os filtros dos logs devem ter foco visÃ­vel",
);
assert(
  /\.lm-float-window \.lw-search-bar:focus-within\s*\{[\s\S]*?border-color:/s.test(PANEL_STYLES),
  "a busca dos logs deve destacar o estado ativo",
);
assert(
  /\.lm-float-window \.lw-empty\s*\{[\s\S]*?min-height:/s.test(PANEL_STYLES),
  "a tela de logs deve ter um estado vazio com presenÃ§a visual",
);
