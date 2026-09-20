import {
  HOTEL_CHAT_COMMANDS,
  applyCommandSelection,
  findActiveCommandToken,
  getCommandSuggestions,
  moveCommandSuggestionIndex,
} from "./commandAutocomplete";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const commandCodes = HOTEL_CHAT_COMMANDS.map(command => command.code);

assert(commandCodes.includes(":sit"), "a lista deve conter comandos nativos do hotel");
assert(commandCodes.includes(":comandos"), "a lista deve conter :comandos");
for (const excluded of [":hibisco", ":move", ":mobi", ":roomtool", ":print", ":rejoin", ":reload", "::wired"]) {
  assert(!commandCodes.includes(excluded), `${excluded} não pode aparecer no autocomplete`);
}

const startsWithSi = getCommandSuggestions(":si");
assert(startsWithSi[0]?.code === ":sign", "o filtro deve priorizar o prefixo completo do comando");
assert(startsWithSi.some(command => command.code === ":sit"), "o filtro deve encontrar :sit");
assert(getCommandSuggestions(":HOM")[0]?.code === ":home", "o filtro deve ignorar maiúsculas");
assert(getCommandSuggestions(":zzzz").length === 0, "consulta sem correspondência deve ficar vazia");
assert(getCommandSuggestions(":", 3).length === 3, "o limite deve reduzir a lista de sugestões");

const active = findActiveCommandToken("oi :si", 6);
assert(active?.start === 3 && active.query === "si", "deve identificar o token no cursor");
assert(findActiveCommandToken("oi :si", 4) === null, "cursor antes do fim do token não deve sugerir");
assert(findActiveCommandToken("texto", 5) === null, "texto comum não deve abrir sugestões");

assert(applyCommandSelection("oi :si", 6, ":sit") === "oi :sit ", "seleção deve substituir apenas o token");
assert(applyCommandSelection(":si resto", 3, ":sit") === ":sit resto", "seleção deve preservar o restante da mensagem");
assert(moveCommandSuggestionIndex(-1, 1, 3) === 0, "primeiro movimento deve selecionar o primeiro item");
assert(moveCommandSuggestionIndex(0, -1, 3) === 2, "seta para cima deve voltar ao último item");
assert(moveCommandSuggestionIndex(2, 1, 3) === 0, "seta para baixo deve circular");

console.log("commandAutocomplete.test.ts: ok");
