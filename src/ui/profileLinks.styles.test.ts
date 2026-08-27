import { PANEL_STYLES } from "./styles.ts";

const logRule = PANEL_STYLES.match(
  /\.lm-float-window \.luminus-profile-link\s*\{([^}]*)\}/,
)?.[1];

assert(logRule, "o link de perfil dos logs deve ter um contrato prÃ³prio");
assert(/\ball\s*:\s*unset\b/.test(logRule), "o link de perfil dos logs deve remover a aparÃªncia nativa");
assert(/\bbackground\s*:\s*transparent\b/.test(logRule), "o link de perfil dos logs deve ser transparente");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const rule = PANEL_STYLES.match(
  /\.luminus-chat-profile-link,\s*\.luminus-profile-link\s*\{([^}]*)\}/,
)?.[1];

assert(rule, "o contrato de estilo dos links de perfil deve existir");
assert(!/\ball\s*:\s*unset\b/.test(rule), "links de perfil não podem resetar o layout Nitro");
assert(!/\bdisplay\s*:\s*inline\b/.test(rule), "links de perfil devem preservar o display nativo");
assert(/\bcursor\s*:\s*pointer\b/.test(rule), "links de perfil devem continuar clicáveis");
