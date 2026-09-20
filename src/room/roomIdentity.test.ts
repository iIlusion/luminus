import type { RoomUnit } from "../messages/incoming/UsersParser";
import { resolveRoomUnitByName } from "./roomIdentity.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function unit(name: string, type: number, index: number): RoomUnit {
  return { id: index, name, motto: "", figure: "", index, x: 0, y: 0, z: 0, direction: 0, type };
}

const bot = unit("Decorador!", 3, 10);
const user = unit("Decorador!", 1, 11);

assert(resolveRoomUnitByName([bot, user], "Decorador!") === user, "usuário deve vencer bot homônimo");
assert(resolveRoomUnitByName([user, bot], "Decorador!") === user, "usuário deve vencer independentemente da ordem");
assert(resolveRoomUnitByName([bot], "Decorador!") === bot, "bot deve continuar sendo resolvido sem usuário homônimo");

console.log("roomIdentity.test.ts: ok");
