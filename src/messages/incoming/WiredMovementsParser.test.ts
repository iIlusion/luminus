import { WiredMovementsParser } from "./WiredMovementsParser.ts";

function assertDeepEqual(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("parsed movements differ from expected values");
}

class TestReader {
  private readonly values: Array<number | string>;
  constructor(values: Array<number | string>) { this.values = values; }
  readInt(): number { return this.values.shift() as number; }
  readString(): string { return this.values.shift() as string; }
  readBoolean(): boolean { return Boolean(this.values.shift()); }
}

const reader = new TestReader([
  2,
  1,
  10, 18, 11, 18, "0,1", "0,1",
  291273676, 500, 40,
  0,
  12, 20, 12, 21, "0", "0",
  3, 1, 2, 4, 600
]);

const parsed = new WiredMovementsParser().parse(reader as never);

assertDeepEqual(parsed, [
  {
    type: "furni",
    fromX: 10,
    fromY: 18,
    toX: 11,
    toY: 18,
    fromZ: 0.1,
    toZ: 0.1,
    id: 291273676,
    duration: 500,
    elapsed: 40
  },
  {
    type: "user",
    fromX: 12,
    fromY: 20,
    toX: 12,
    toY: 21,
    fromZ: 0,
    toZ: 0,
    id: 3,
    animationType: 1,
    bodyDirection: 2,
    headDirection: 4,
    duration: 600
  }
]);

console.log("WiredMovementsParser: ok");
