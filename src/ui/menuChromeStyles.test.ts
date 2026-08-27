import { PANEL_STYLES } from "./styles.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  /\.lm-float-window \.luminus-profile-link\s*\{[\s\S]*?all:\s*unset;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/s.test(PANEL_STYLES),
  "links de perfil devem remover a aparÃªncia de botÃ£o nativo",
);

assert(
  /body\.luminus-ui-menus \.nitro-context-menu:is\(\.visible, \.show, :focus, :focus-visible\)[\s\S]*?border:\s*0\s*!important;[\s\S]*?border-color:\s*transparent\s*!important;[\s\S]*?outline:\s*none\s*!important;/s.test(PANEL_STYLES),
  "o estado de abertura dos menus nÃ£o deve reintroduzir moldura ou outline nativo",
);
assert(
  /body\.luminus-ui-menus \.nitro-context-menu\.name-only\.is-friend[\s\S]*?box-shadow:\s*0 10px 24px -12px/s.test(PANEL_STYLES),
  "menus de amizade nÃ£o devem desenhar um halo interno branco",
);
assert(
  /body\.luminus-ui-menus \.nitro-card\.theme-primary\.nitro-navigator\s*\{[\s\S]*?border:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;/s.test(PANEL_STYLES),
  "a janela Nitro sob os menus nÃ£o deve reintroduzir moldura branca",
);
assert(
  /body\.luminus-ui-menus \.nitro-context-menu\s*\{[\s\S]*?border:\s*0\s*!important;[\s\S]*?box-shadow:[\s\S]*?0 12px 32px/s.test(PANEL_STYLES),
  "menus de contexto nÃ£o devem desenhar uma moldura branca",
);
assert(
  /body\.luminus-ui-user-chooser \.nitro-user-chooser-widget,[\s\S]*?border:\s*0\s*!important;/s.test(PANEL_STYLES),
  "o menu de usuÃ¡rios nÃ£o deve desenhar uma moldura branca",
);
