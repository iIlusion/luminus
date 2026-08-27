import { PANEL_STYLES } from "./styles.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const floatWindowRule = PANEL_STYLES.match(/\.lm-float-window\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

assert(
  /border:\s*0;/.test(floatWindowRule) && !/inset\s+0\s+(?:0\s+0\s+0\.5px|1px\s+0)\s+rgba\(255,\s*255,\s*255/.test(floatWindowRule),
  "a janela de logs nÃ£o deve desenhar borda ou aro interno branco",
);
assert(
  /\.lm-float-window:focus,\s*\.lm-float-window:focus-visible\s*\{[\s\S]*?outline:\s*none\s*!important;/s.test(PANEL_STYLES),
  "o foco programÃ¡tico da janela de logs nÃ£o deve desenhar outline nativo",
);

assert(
  /\.lm-float-window \.lw-filter-btn:focus-visible\s*\{[\s\S]*?outline:/s.test(PANEL_STYLES),
  "os filtros dos logs devem ter foco visÃ­vel",
);

assert(
  /\.lm-float-window \.lw-filterbar\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?overflow-y:\s*hidden;[\s\S]*?scrollbar-width:\s*thin;[\s\S]*?scrollbar-color:/s.test(PANEL_STYLES),
  "a barra horizontal de filtros deve usar o scrollbar do Luminus",
);
assert(
  /\.lm-float-window \.lw-filterbar::\-webkit-scrollbar\s*\{[\s\S]*?height:\s*6px;/s.test(PANEL_STYLES),
  "a barra horizontal de filtros deve ter trilho compacto",
);
assert(
  /\.lm-float-window \.lw-list\s*\{[\s\S]*?overflow-x:\s*hidden;/s.test(PANEL_STYLES),
  "a lista de logs nÃ£o deve expor o scrollbar horizontal nativo",
);
assert(
  /\.lm-float-window \.lw-search-bar:focus-within\s*\{[\s\S]*?border-color:/s.test(PANEL_STYLES),
  "a busca dos logs deve destacar o estado ativo",
);
assert(
  /\.lm-float-window \.lw-empty\s*\{[\s\S]*?min-height:/s.test(PANEL_STYLES),
  "a tela de logs deve ter um estado vazio com presenÃ§a visual",
);
