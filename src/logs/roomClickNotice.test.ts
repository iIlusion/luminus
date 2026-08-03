import { parseRoomClickNotice } from "./roomClickNotice.ts";

function ok(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const room = ["gatilhos", "Lx", "Foo Bar", "Zed"];

ok(parseRoomClickNotice("gatilhos clicou em você hein...", room)?.actor === "gatilhos", "hein");
ok(parseRoomClickNotice("gatilhos clicou em voce!", room)?.actor === "gatilhos", "classic !");
ok(parseRoomClickNotice("Lx cutucou em vc rs", room)?.actor === "Lx", "cutucou vc");
ok(parseRoomClickNotice("Foo Bar clicou em você", room)?.actor === "Foo Bar", "name with space");
ok(parseRoomClickNotice("Zed clicou em você!!!", room)?.actor === "Zed", "Zed");
ok(parseRoomClickNotice("ola clicou o botao do elevador", room) === null, "false positive elevador");
ok(parseRoomClickNotice("eu te vejo no voce", room) === null, "false positive vejo");
ok(parseRoomClickNotice("gatilhos falou em voce ontem", room) === null, "false positive falou");

console.log("roomClickNotice tests ok");
