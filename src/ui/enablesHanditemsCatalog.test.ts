import {
  buildCatalogList,
  entryId,
} from "./enablesHanditemsCatalog.ts";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

equal(
  buildCatalogList("enable", "", [3, 1]).slice(0, 3).map(entryId),
  [0, 3, 1],
  "favoritos preservam a ordem salva depois da ação de remover",
);
equal(
  buildCatalogList("enable", "holofote", [3, 1]).map(entryId),
  [0, 1, 137],
  "busca remove favoritos que não correspondem",
);
equal(
  buildCatalogList("handitem", "1001", []).map(entryId),
  [0, 1001],
  "busca encontra handitem pelo id",
);

console.log("enablesHanditemsCatalog: ok");
