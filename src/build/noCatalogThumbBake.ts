import type { LuminusApi } from "../ws/api";

export function getCatalogThumbBakeProgress() {
  return {
    running: false,
    done: 0,
    total: 0,
    currentKind: null,
    currentId: null,
    ready: 0,
    unavailable: 0,
    failed: 0,
    message: "Ferramenta disponível apenas no build dev",
  };
}

export function abortCatalogThumbBake(): void {}

export async function bakeCatalogThumbs(_api: LuminusApi): Promise<never> {
  throw new Error("Ferramenta disponível apenas no build dev");
}
