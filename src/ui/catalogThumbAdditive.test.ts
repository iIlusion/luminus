import {
  additiveContribution,
  canonicalizeAdditiveRgba,
} from "./catalogThumbAdditive.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cases = [
  [0, 0, 0, 255],
  [1, 1, 1, 255],
  [255, 40, 20, 96],
  [120, 220, 70, 193],
  [8, 3, 1, 77],
  [255, 255, 255, 255],
];

for (const source of cases) {
  const expected = additiveContribution(source);
  const pixels = new Uint8ClampedArray(source);
  canonicalizeAdditiveRgba(pixels);
  assert(
    JSON.stringify(additiveContribution(pixels)) === JSON.stringify(expected),
    `contribuição ADD mudou para ${source.join(",")}`,
  );
  if (expected.every((value) => value === 0)) {
    assert(pixels[3] === 0, "preto ADD deve ficar transparente");
  }
}

console.log("catalogThumbAdditive: ok");
