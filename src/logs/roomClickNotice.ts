/**
 * Detecta avisos de clique no chat do quarto (Habblet).
 * O texto não é fixo: costuma ter um nick + verbo (clicou/cutucou/…) + "em você/vc".
 * Prefixos decorativos (`:star:`, ★, etc.) não fazem parte do nick.
 */

/** Remove formatação Habbo e shortcodes de emoji (`:star:`, `:heart:`…). */
function stripFormatting(str: string): string {
  return str
    .replace(/@\w+@/g, "")
    .replace(/:[a-zA-Z0-9_+-]{1,32}:/g, " ");
}

function normalizeTxt(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Limite de palavra em torno de um nick (não alfanumérico / underscore). */
function isNameBoundary(ch: string | undefined): boolean {
  if (ch == null) return true;
  return !/[\p{L}\p{N}_]/u.test(ch);
}

/** Verbos e variantes comuns em avisos de click/cutucada. */
const CLICK_VERB =
  /\b(clicou|clicaram|clickou|clicaram|cutucou|cutucaram|cutuca|cutucando|tocou|tocaram|tocando|cutu[ck]ou)\b/;

/** Destino “você” / “vc” / “ti” (com ou sem pontuação depois). */
const AT_YOU = /\bem\s+(v[oc]{1,2}e|vc|voce|ti)\b|\be\s+(v[oc]{1,2}e|vc)\b/;

const ORIGINAL_VERB =
  /\b(clicou|clicaram|clickou|cutucou|cutucaram|cutuca|tocou|tocaram|cutu[ck]ou)\b/i;

/** Sujeitos genéricos — nunca são nicks úteis. */
const GENERIC_ACTOR =
  /^(o|a|um|uma|alguem|alguém|ele|ela|voce|você|vc)$/i;

export type RoomClickNotice = {
  actor: string;
  message: string;
};

/**
 * Procura o nick de unit do quarto no texto *antes* do verbo.
 * Prefere o nome mais longo (ex.: "Foo Bar" vence "Foo").
 */
function findRoomActor(normPrefix: string, roomNames: Iterable<string>): string {
  let actor = "";
  let bestLen = 0;

  for (const name of roomNames) {
    const trimmed = name?.trim();
    if (!trimmed) continue;
    const n = normalizeTxt(trimmed);
    if (n.length < 1 || n.length > 32) continue;

    // Todas as ocorrências no prefixo (não só a primeira).
    let from = 0;
    while (from <= normPrefix.length - n.length) {
      const idx = normPrefix.indexOf(n, from);
      if (idx < 0) break;
      const before = idx > 0 ? normPrefix[idx - 1] : undefined;
      const after = normPrefix[idx + n.length];
      if (isNameBoundary(before) && isNameBoundary(after) && n.length > bestLen) {
        bestLen = n.length;
        actor = trimmed;
      }
      from = idx + 1;
    }
  }

  return actor;
}

/** Remove lixo decorativo das pontas de um candidato a nick. */
function cleanActorCandidate(raw: string): string {
  return raw
    .replace(/^[\s"'“”‘’«»★☆✦✧⭐🌟·•▪◦`~|=+.:\-_–—]+/gu, "")
    .replace(/[\s"'“”‘’«»,:;.\-–—!?★☆✦✧⭐🌟·•▪◦`~|=+]+$/gu, "")
    .trim();
}

/**
 * Se a mensagem for um aviso de clique em você, devolve o nick do autor.
 * `roomNames` (opcional) resolve o actor com base nos units do quarto —
 * necessário quando há prefixo decorativo ou o nick tem espaços.
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

  const normPrefix = norm.slice(0, verbMatch.index);

  // 1) Preferir um unit real do quarto no prefixo (mais longo vence).
  let actor = "";
  if (roomNames) {
    actor = findRoomActor(normPrefix, roomNames);
  }

  // 2) Fallback: texto antes do verbo no original, sem lixo decorativo.
  if (!actor) {
    const originalVerb = message.match(ORIGINAL_VERB);
    if (!originalVerb || originalVerb.index == null || originalVerb.index < 1) return null;
    actor = cleanActorCandidate(message.slice(0, originalVerb.index));
  }

  actor = cleanActorCandidate(actor);
  if (!actor || actor.length > 32) return null;
  if (GENERIC_ACTOR.test(actor)) return null;

  return { actor, message };
}

/** true se o texto normalizado parece aviso de click (para achar bolha no DOM). */
export function textLooksLikeRoomClickNotice(text: string, actor?: string): boolean {
  const parsed = parseRoomClickNotice(text);
  if (!parsed) return false;
  if (!actor) return true;
  return (
    normalizeTxt(parsed.actor) === normalizeTxt(actor) ||
    normalizeTxt(text).includes(normalizeTxt(actor))
  );
}
