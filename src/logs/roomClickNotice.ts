/**
 * Detecta avisos de clique no chat do quarto (Habblet).
 * O texto não é fixo: costuma ter um nick + verbo (clicou/cutucou/…) + "em você/vc".
 */

function stripFormatting(str: string): string {
  return str.replace(/@\w+@/g, "");
}

function normalizeTxt(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Verbos e variantes comuns em avisos de click/cutucada. */
const CLICK_VERB =
  /\b(clicou|clicaram|clickou|clicaram|cutucou|cutucaram|cutuca|cutucando|tocou|tocaram|tocando|cutu[ck]ou)\b/;

/** Destino “você” / “vc” / “ti” (com ou sem pontuação depois). */
const AT_YOU = /\bem\s+(v[oc]{1,2}e|vc|voce|ti)\b|\be\s+(v[oc]{1,2}e|vc)\b/;

export type RoomClickNotice = {
  actor: string;
  message: string;
};

/**
 * Se a mensagem for um aviso de clique em você, devolve o nick do autor.
 * `roomNames` (opcional) melhora o match quando o nick tem espaços ou o texto tem lixo.
 */
export function parseRoomClickNotice(
  rawMessage: string,
  roomNames?: Iterable<string>,
): RoomClickNotice | null {
  const message = stripFormatting(rawMessage).replace(/\s+/g, " ").trim();
  if (!message || message.length > 200) return null;

  const norm = normalizeTxt(message);
  const verbMatch = norm.match(CLICK_VERB);
  if (!verbMatch || verbMatch.index == null) return null;

  const youMatch = norm.match(AT_YOU);
  if (!youMatch || youMatch.index == null) return null;

  // Verbo e "em voce" costumam ficar perto (evita chat aleatório com as duas palavras).
  if (Math.abs(youMatch.index - verbMatch.index) > 56) return null;

  // Prefira um nome de unidade do quarto que apareça antes do verbo.
  let actor = "";
  if (roomNames) {
    let bestLen = 0;
    for (const name of roomNames) {
      const trimmed = name?.trim();
      if (!trimmed) continue;
      const n = normalizeTxt(trimmed);
      if (n.length < 1 || n.length > 32) continue;
      const idx = norm.indexOf(n);
      if (idx < 0 || idx > verbMatch.index) continue;
      // Nome termina no limite da palavra (ou no fim do prefixo antes do verbo).
      const after = norm[idx + n.length];
      if (after != null && after !== " " && after !== "," && after !== ":") continue;
      if (n.length > bestLen) {
        bestLen = n.length;
        actor = trimmed;
      }
    }
  }

  if (!actor) {
    // Fallback: texto antes do primeiro verbo no original.
    const originalVerb = message.match(
      /\b(clicou|clicaram|clickou|cutucou|cutucaram|cutuca|tocou|tocaram|cutu[ck]ou)\b/i,
    );
    if (!originalVerb || originalVerb.index == null || originalVerb.index < 1) return null;
    actor = message.slice(0, originalVerb.index).trim();
  }

  actor = actor.replace(/^[\s"'“”‘’«»]+|[\s"'“”‘’«»,:;.\-–—!?]+$/gu, "").trim();
  if (!actor || actor.length > 32) return null;

  // Evita capturar frases sem sujeito útil.
  if (/^(o|a|um|uma|alguem|alguém|ele|ela|voce|você|vc)$/i.test(actor)) return null;

  return { actor, message };
}

/** true se o texto normalizado parece aviso de click (para achar bolha no DOM). */
export function textLooksLikeRoomClickNotice(text: string, actor?: string): boolean {
  const parsed = parseRoomClickNotice(text);
  if (!parsed) return false;
  if (!actor) return true;
  return normalizeTxt(parsed.actor) === normalizeTxt(actor) || normalizeTxt(text).includes(normalizeTxt(actor));
}
