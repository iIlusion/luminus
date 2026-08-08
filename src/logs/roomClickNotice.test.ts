import { parseRoomClickNotice } from "./roomClickNotice.ts";

/** Fixtures only — synthetic names, never real hotel nicks. */
function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const room = ["PlayerA", "PlayerB", "Foo Bar", "PlayerC", "star"];

// Clássicos
ok(parseRoomClickNotice("PlayerA clicou em você hein...", room)?.actor === "PlayerA", "hein");
ok(parseRoomClickNotice("PlayerA clicou em voce!", room)?.actor === "PlayerA", "classic !");
ok(parseRoomClickNotice("PlayerB cutucou em vc rs", room)?.actor === "PlayerB", "cutucou vc");
ok(parseRoomClickNotice("Foo Bar clicou em você", room)?.actor === "Foo Bar", "name with space");
ok(parseRoomClickNotice("PlayerC clicou em você!!!", room)?.actor === "PlayerC", "PlayerC");

// Prefixo decorativo / shortcode de emoji
ok(parseRoomClickNotice(":star: PlayerA clicou em você", room)?.actor === "PlayerA", ":star: prefix + room");
ok(parseRoomClickNotice(":star: PlayerA clicou em você")?.actor === "PlayerA", ":star: prefix fallback");
ok(parseRoomClickNotice(":heart: Foo Bar cutucou em vc", room)?.actor === "Foo Bar", ":heart: multi-word");
ok(parseRoomClickNotice("★ PlayerA clicou em você", room)?.actor === "PlayerA", "unicode star");
ok(parseRoomClickNotice(":star:PlayerA clicou em voce!", room)?.actor === "PlayerA", ":star: no space");

// Unit "star" na sala NÃO deve capturar o shortcode :star:
ok(parseRoomClickNotice(":star: PlayerA clicou em você", room)?.actor === "PlayerA", "star unit vs shortcode");
ok(parseRoomClickNotice("star clicou em você", room)?.actor === "star", "real nick star");

// Clicker fora da lista de units → fallback limpo (sem shortcode)
ok(parseRoomClickNotice(":star: PlayerX clicou em você", room)?.actor === "PlayerX", "unknown nick + shortcode");

// Falsos positivos
ok(parseRoomClickNotice("ola clicou o botao do elevador", room) === null, "false positive elevador");
ok(parseRoomClickNotice("eu te vejo no voce", room) === null, "false positive vejo");
ok(parseRoomClickNotice("PlayerA falou em voce ontem", room) === null, "false positive falou");
ok(parseRoomClickNotice(":star: alguém clicou em você", room) === null, "generic alguém + shortcode");

console.log("roomClickNotice tests ok");
