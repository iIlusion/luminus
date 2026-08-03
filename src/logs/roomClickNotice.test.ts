import { parseRoomClickNotice } from "./roomClickNotice.ts";

/** Fixtures only — synthetic names, never real hotel nicks. */
function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const room = ["PlayerA", "PlayerB", "Foo Bar", "PlayerC"];

ok(parseRoomClickNotice("PlayerA clicou em você hein...", room)?.actor === "PlayerA", "hein");
ok(parseRoomClickNotice("PlayerA clicou em voce!", room)?.actor === "PlayerA", "classic !");
ok(parseRoomClickNotice("PlayerB cutucou em vc rs", room)?.actor === "PlayerB", "cutucou vc");
ok(parseRoomClickNotice("Foo Bar clicou em você", room)?.actor === "Foo Bar", "name with space");
ok(parseRoomClickNotice("PlayerC clicou em você!!!", room)?.actor === "PlayerC", "PlayerC");
ok(parseRoomClickNotice("ola clicou o botao do elevador", room) === null, "false positive elevador");
ok(parseRoomClickNotice("eu te vejo no voce", room) === null, "false positive vejo");
ok(parseRoomClickNotice("PlayerA falou em voce ontem", room) === null, "false positive falou");

console.log("roomClickNotice tests ok");
