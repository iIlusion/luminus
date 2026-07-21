import { FurnitureFloorParser } from "./FurnitureFloorParser.ts";

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

const parsed = new FurnitureFloorParser().parse(new TestReader([
  0, 1,
  293815797, 100, 10, 18, 0, "0.1", "0.1", 0,
  6, "3",
  0, 1, 0, 0, 0, 0, 1,
  0, 42, 1, "Timido",
  -1, 1, 5655613
]) as never);

const item = parsed.items[0];
assert(item.state === 3, "wire state should be preserved");
assert(item.objectData.dataType === "highScoreRanking", "ranking variant should be detected");
assert(item.objectData.dataType === "highScoreRanking" && item.objectData.entries[0]?.score === 42, "ranking entry should stay aligned");
assert(item.expires === -1 && item.ownerId === 5655613, "fields after ranking should stay aligned");

const shortIntParsed = new FurnitureFloorParser().parse(new TestReader([
  0, 2,
  293815797, 100, 10, 18, 0, "0.1", "0.1", 0,
  6, "1",
  0, 1, 0, 0, 0, 1, 1,
  0, 11, 1, "Le",
  -1, 1, 5655613,
  293815798, 101, 11, 19, 0, "0.1", "0.1", 0,
  0, "4",
  -1, 1, 5655613
]) as never);

const shortIntItem = shortIntParsed.items[0];
assert(shortIntItem.objectData.dataType === "highScoreRanking" && shortIntItem.objectData.entries[0]?.score === 11, "short-int ranking variant should be detected");
assert(shortIntItem.expires === -1 && shortIntParsed.items[1]?.id === 293815798, "item after short-int ranking should stay aligned");

console.log("FurnitureFloorParser: ok");
