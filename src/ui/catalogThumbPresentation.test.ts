import {
  catalogThumbFit,
  catalogThumbStillFrame,
} from "./catalogThumbPresentation.ts";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
  }
}

equal(catalogThumbFit("enable", 1, [90, 181]), 1, "holofote em escala nativa");
equal(catalogThumbFit("enable", 730, [147, 159]), 1, "extintor em escala nativa");
equal(catalogThumbFit("enable", 24, [91, 160]), 1, "efeito comum cabe no quadro");
equal(catalogThumbFit("enable", 745, [90, 165]), 160 / 165, "efeito alto continua ajustado");
equal(catalogThumbStillFrame("enable", 595, 9, 12), 11, "Among morto usa último frame");
equal(catalogThumbStillFrame("enable", 606, 9, 12), 11, "último Among morto usa último frame");
equal(catalogThumbStillFrame("enable", 594, 9, 12), 9, "Among vivo preserva idle");
equal(catalogThumbStillFrame("handitem", 595, 4, 8), 4, "handitem não recebe regra de efeito");

console.log("catalogThumbPresentation: ok");
