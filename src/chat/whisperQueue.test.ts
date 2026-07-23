import { normalizeWhisperContent, shouldBypassWhisperQueue, WHISPER_REPEAT_COOLDOWN_MS, WhisperQueue } from "./whisperQueue.ts";
import { NATIVE_GROUP_RESET_PREFIX } from "./nativeGroupWhisperResetPrefix.ts";
import { consumeGroupWhisperRoute, withGroupWhisperRoute } from "./groupWhisperRouting.ts";

function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

let now = 0;
let timerId = 0;
const tasks: { at: number; run: () => void }[] = [];
const sent: number[] = [];
const queue = new WhisperQueue(
  data => { sent.push(new Uint8Array(data)[0]); return true; },
  (run, delay) => { tasks.push({ at: now + delay, run }); return ++timerId; },
  () => now
);

for (let value = 1; value <= 12; value++) queue.enqueue(new Uint8Array([value]).buffer);

while (tasks.length) {
  tasks.sort((a, b) => a.at - b.at);
  const task = tasks.shift()!;
  now = task.at;
  task.run();
}

assert(sent.join(",") === "1,2,3,4,5,6,7,8,9,10,11,12", "queue must preserve FIFO order");
assert(now === 0, "different whispers must not be rate-limited");
const resumedAt = now;
queue.enqueue(new Uint8Array([13]).buffer);
while (tasks.length) {
  tasks.sort((a, b) => a.at - b.at);
  const task = tasks.shift()!;
  now = task.at;
  task.run();
}
assert(sent[sent.length - 1] === 13, "queue must send new non-repeated traffic");
assert(now === resumedAt, "new non-repeated traffic must not delay a burst");

let repeatNow = 0;
const repeatTasks: { at: number; run: () => void }[] = [];
const repeatTimes: number[] = [];
const repeatQueue = new WhisperQueue(
  () => { repeatTimes.push(repeatNow); return true; },
  (run, delay) => { repeatTasks.push({ at: repeatNow + delay, run }); return repeatTasks.length; },
  () => repeatNow
);
for (let value = 1; value <= 3; value++) repeatQueue.enqueue(new Uint8Array([value]).buffer, "spam");
while (repeatTasks.length) {
  repeatTasks.sort((a, b) => a.at - b.at);
  const task = repeatTasks.shift()!;
  repeatNow = task.at;
  task.run();
}
assert(repeatTimes.join(",") === `0,0,${WHISPER_REPEAT_COOLDOWN_MS}`, "the third similar message must wait only for the repeat cooldown");
assert(normalizeWhisperContent("  SPÁM!!! ") === normalizeWhisperContent("spam"), "cosmetic differences must share the repeat limit");
assert(shouldBypassWhisperQueue("group teste", "Timido"), "native group whisper must bypass the queue");
assert(shouldBypassWhisperQueue(`Timido ${NATIVE_GROUP_RESET_PREFIX}abcd`, "Timido"), "native group reset must bypass the queue");
assert(!shouldBypassWhisperQueue("Timido oi", "Timido"), "normal self whisper must still use the queue");

let bypassNow = 0;
const bypassTasks: { at: number; run: () => void }[] = [];
const bypassSent: string[] = [];
const bypassQueue = new WhisperQueue(
  data => { bypassSent.push(`${new TextDecoder().decode(data)}@${bypassNow}`); return true; },
  (run, delay) => { bypassTasks.push({ at: bypassNow + delay, run }); return bypassTasks.length; },
  () => bypassNow
);
for (const key of ["spam", "spam", "spam", "oi"]) {
  bypassQueue.enqueue(new TextEncoder().encode(key).buffer, key);
}
while (bypassTasks.length) {
  bypassTasks.sort((a, b) => a.at - b.at);
  const task = bypassTasks.shift()!;
  bypassNow = task.at;
  task.run();
}
assert(bypassSent.join(",") === `spam@0,spam@0,oi@0,spam@${WHISPER_REPEAT_COOLDOWN_MS}`, "a different whisper must bypass a repeated message cooldown");

const routed = withGroupWhisperRoute(["Ana", "Beto"], () => {
  const first = consumeGroupWhisperRoute();
  const second = consumeGroupWhisperRoute();
  if (!first || !second) throw new Error("group route must be available while sending");
  assert(first.members.join(",") === "Ana,Beto", "group route must reach the outgoing handler");
  assert(second.members.join(",") === "Ana,Beto" && second.id === first.id, "group route must cover the whole send batch");
  return true;
});
assert(routed, "group route must preserve the send result");
assert(consumeGroupWhisperRoute() === null, "group route must be consumed only once");
console.log("whisperQueue: ok");
