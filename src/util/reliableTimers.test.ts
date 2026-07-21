import {
  clearReliableTimer,
  flushReliableTimers,
  reliableInterval,
  reliableTimeout,
} from "./reliableTimers.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let fired = 0;
const id = reliableTimeout(() => {
  fired++;
}, 10_000);
clearReliableTimer(id);
assert(fired === 0, "cleared timeout must not fire");

let ticks = 0;
const intervalId = reliableInterval(() => {
  ticks++;
}, 1);
const start = performance.now();
while (performance.now() - start < 5) {
  /* spin until deadline */
}
flushReliableTimers();
assert(ticks >= 1, `interval should fire after deadline (ticks=${ticks})`);
clearReliableTimer(intervalId);

let once = 0;
reliableTimeout(() => {
  once++;
}, 1);
const spin = performance.now();
while (performance.now() - spin < 5) {
  /* spin until deadline */
}
flushReliableTimers();
assert(once === 1, "timeout should fire once via flush");
flushReliableTimers();
assert(once === 1, "timeout must not re-fire after completion");

console.log("reliableTimers.test.ts: ok");
