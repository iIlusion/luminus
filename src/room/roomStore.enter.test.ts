import {
  ROOM_ENTER_SETTLE_MS,
  classifyUserRemove,
  createRoomEnterGuard,
  markRoomEnter,
  noteEnterRoster,
} from "./roomStore.ts";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

const guard = createRoomEnterGuard();
assert(classifyUserRemove(guard, 3, 3, 1000) === "self-leave", "before any enter, self remove leaves");
assert(classifyUserRemove(guard, 4, 3, 1000) === "delete", "before any enter, other remove deletes");

markRoomEnter(guard, 10_000);
noteEnterRoster(guard, [3, 7, 12], 10_100);
assert(classifyUserRemove(guard, 3, 3, 10_200) === "ignore", "stale self remove after teleporter must not wipe");
assert(classifyUserRemove(guard, 7, 3, 10_200) === "ignore", "stale remove of a new-room index must not delete");
assert(classifyUserRemove(guard, 99, 3, 10_200) === "delete", "unknown index during settle still deletes");

assert(
  classifyUserRemove(guard, 3, 3, 10_000 + ROOM_ENTER_SETTLE_MS + 1) === "self-leave",
  "after settle, self remove is a real leave",
);
assert(
  classifyUserRemove(guard, 7, 3, 10_000 + ROOM_ENTER_SETTLE_MS + 1) === "delete",
  "after settle, other remove deletes",
);

console.log("roomStore.enter: ok");
