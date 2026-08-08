import { FurnitureFloorParser } from "./FurnitureFloorParser.ts";

/** Fixtures only — synthetic ids/names, never real hotel accounts. */
function assert(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

class TestReader {
  private index = 0;
  private readonly values: Array<number | string>;
  constructor(values: Array<number | string>) { this.values = values; }
  readInt(): number { return this.values[this.index++] as number; }
  readShort(): number { return this.values[this.index++] as number; }
  readString(): string { return this.values[this.index++] as string; }
  get offset(): number { return this.index; }
  set offset(value: number) { this.index = value; }
  get bytesAvailable(): boolean { return this.index < this.values.length; }
}

const FAKE_OWNER = 10001;
const FAKE_ITEM_A = 900001;
const FAKE_ITEM_B = 900002;

const parsed = new FurnitureFloorParser().parse(new TestReader([
  0, 1,
  FAKE_ITEM_A, 100, 10, 18, 0, "0.1", "0.1", 0,
  6, "3",
  0, 1, 0, 0, 0, 0, 1,
  0, 42, 1, "ScoreUser",
  -1, 1, FAKE_OWNER
]) as never);

const item = parsed.items[0];
assert(item.state === 3, "wire state should be preserved");
assert(item.objectData.dataType === "highScoreRanking", "ranking variant should be detected");
assert(item.objectData.dataType === "highScoreRanking" && item.objectData.entries[0]?.score === 42, "ranking entry should stay aligned");
assert(item.expires === -1 && item.ownerId === FAKE_OWNER, "fields after ranking should stay aligned");

const shortIntParsed = new FurnitureFloorParser().parse(new TestReader([
  0, 2,
  FAKE_ITEM_A, 100, 10, 18, 0, "0.1", "0.1", 0,
  6, "1",
  0, 1, 0, 0, 0, 1, 1,
  0, 11, 1, "Su",
  -1, 1, FAKE_OWNER,
  FAKE_ITEM_B, 101, 11, 19, 0, "0.1", "0.1", 0,
  0, "4",
  -1, 1, FAKE_OWNER
]) as never);

const shortIntItem = shortIntParsed.items[0];
assert(shortIntItem.objectData.dataType === "highScoreRanking" && shortIntItem.objectData.entries[0]?.score === 11, "short-int ranking variant should be detected");
assert(shortIntItem.expires === -1 && shortIntParsed.items[1]?.id === FAKE_ITEM_B, "item after short-int ranking should stay aligned");

console.log("FurnitureFloorParser: ok");
