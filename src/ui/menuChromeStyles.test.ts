import { PANEL_STYLES } from "./styles.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  /\.lm-float-window \.luminus-profile-link\s*\{[\s\S]*?all:\s*unset;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/s.test(PANEL_STYLES),
  "links de perfil devem remover a aparÃªncia de botÃ£o nativo",
);
assert(
  /body\.luminus-ui-menus \.nitro-context-menu\s*\{[\s\S]*?border:\s*0\s*!important;[\s\S]*?box-shadow:[\s\S]*?0 12px 32px/s.test(PANEL_STYLES),
  "menus de contexto nÃ£o devem desenhar uma moldura branca",
);
assert(
  /body\.luminus-ui-user-chooser \.nitro-user-chooser-widget,[\s\S]*?border:\s*0\s*!important;/s.test(PANEL_STYLES),
  "o menu de usuÃ¡rios nÃ£o deve desenhar uma moldura branca",
);
