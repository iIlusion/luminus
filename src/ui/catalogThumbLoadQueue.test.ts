import {
  enqueueCatalogThumbLoad,
  prioritizeCatalogThumbLoad,
} from "./catalogThumbLoadQueue.ts";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

const started: string[] = [];
const release = new Map<string, () => void>();

function deferredLoad(name: string): () => Promise<string> {
  return () => {
    started.push(name);
    return new Promise((resolve) => release.set(name, () => resolve(name)));
  };
}

const promises = ["a", "b", "c", "d", "e", "visible"].map((name) =>
  enqueueCatalogThumbLoad(name, 0, deferredLoad(name)),
);

await Promise.resolve();
equal(started, ["a", "b", "c", "d"], "limite inicial");

prioritizeCatalogThumbLoad("visible", true);
release.get("a")?.();
await new Promise((resolve) => setTimeout(resolve, 0));
equal(started, ["a", "b", "c", "d", "visible"], "prioridade visível");

for (const name of ["b", "c", "d", "visible"]) release.get(name)?.();
await new Promise((resolve) => setTimeout(resolve, 0));
release.get("e")?.();
equal(
  await Promise.all(promises),
  ["a", "b", "c", "d", "e", "visible"],
  "resultado completo",
);

console.log("catalogThumbLoadQueue: ok");
