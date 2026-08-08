import {
  parseCatalogThumbManifest,
  type CatalogThumbKind,
  type CatalogThumbManifest,
  type CatalogThumbReadyEntry,
  type CatalogThumbUnavailableReason,
} from "./catalogThumbManifest";
import {
  CATALOG_THUMB_ASSET_COMMIT,
  CATALOG_THUMB_ASSET_PATH,
} from "./catalogThumbRevision";
import { gmFetch, gmFetchArrayBuffer } from "../util/gmFetch";

const CDN_ROOT = "https://cdn.jsdelivr.net/gh/iIlusion/luminus";
const LOCAL_DEV_ROOT = "http://127.0.0.1:8935/assets";
const REVOKE_DELAY_MS = 5_000;

type AtlasResource = {
  objectUrl: string;
  refs: number;
  revokeTimer: number | null;
};

export type LoadedCatalogThumb = {
  status: "ready";
  entry: CatalogThumbReadyEntry;
  atlasUrls: string[];
  release(): void;
};

export type CatalogThumbUnavailable = {
  status: "unavailable";
  reason: CatalogThumbUnavailableReason | "catalog-not-published";
};

let devBaseUrl: string | null = __LUMINUS_DEV_TOOLS__ && !CATALOG_THUMB_ASSET_COMMIT
  ? LOCAL_DEV_ROOT
  : null;
const manifestPromises = new Map<string, Promise<CatalogThumbManifest>>();
const atlasPromises = new Map<string, Promise<AtlasResource>>();

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function setCatalogThumbDevBaseUrl(url: string | null): void {
  if (!__LUMINUS_DEV_TOOLS__) return;
  devBaseUrl = url?.trim() ? trimSlash(url.trim()) : null;
  manifestPromises.clear();
}

export function getCatalogThumbBaseUrl(): string | null {
  if (__LUMINUS_DEV_TOOLS__ && devBaseUrl) return devBaseUrl;
  if (!CATALOG_THUMB_ASSET_COMMIT) return null;
  return `${CDN_ROOT}@${CATALOG_THUMB_ASSET_COMMIT}/${CATALOG_THUMB_ASSET_PATH}`;
}

function manifestName(kind: CatalogThumbKind): string {
  return kind === "enable" ? "enables.manifest.json" : "handitems.manifest.json";
}

async function loadManifest(kind: CatalogThumbKind, baseUrl: string): Promise<CatalogThumbManifest> {
  const url = `${baseUrl}/${manifestName(kind)}`;
  let promise = manifestPromises.get(url);
  if (!promise) {
    promise = gmFetch<unknown>(url).then(parseCatalogThumbManifest);
    manifestPromises.set(url, promise);
    promise.catch(() => {
      if (manifestPromises.get(url) === promise) manifestPromises.delete(url);
    });
  }
  return promise;
}

async function sha256Hex(value: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function acquireAtlas(url: string, expectedHash: string): Promise<AtlasResource> {
  const key = `${url}#${expectedHash}`;
  let promise = atlasPromises.get(key);
  if (!promise) {
    promise = gmFetchArrayBuffer(url).then(async (bytes) => {
      const actualHash = await sha256Hex(bytes);
      if (actualHash !== expectedHash) throw new Error("Hash do atlas não confere");
      return {
        objectUrl: URL.createObjectURL(new Blob([bytes], {
          type: url.endsWith(".webp") ? "image/webp" : "image/png",
        })),
        refs: 0,
        revokeTimer: null,
      };
    });
    atlasPromises.set(key, promise);
    promise.catch(() => {
      if (atlasPromises.get(key) === promise) atlasPromises.delete(key);
    });
  }

  const resource = await promise;
  if (resource.revokeTimer !== null) {
    window.clearTimeout(resource.revokeTimer);
    resource.revokeTimer = null;
  }
  resource.refs += 1;
  return resource;
}

function releaseAtlas(key: string, resource: AtlasResource): void {
  resource.refs = Math.max(0, resource.refs - 1);
  if (resource.refs > 0 || resource.revokeTimer !== null) return;
  resource.revokeTimer = window.setTimeout(() => {
    resource.revokeTimer = null;
    if (resource.refs > 0) return;
    URL.revokeObjectURL(resource.objectUrl);
    atlasPromises.delete(key);
  }, REVOKE_DELAY_MS);
}

function abortError(): DOMException {
  return new DOMException("Operação cancelada", "AbortError");
}

export async function loadCatalogThumb(
  kind: CatalogThumbKind,
  id: number,
  signal?: AbortSignal,
): Promise<LoadedCatalogThumb | CatalogThumbUnavailable> {
  const baseUrl = getCatalogThumbBaseUrl();
  if (!baseUrl) return { status: "unavailable", reason: "catalog-not-published" };
  if (signal?.aborted) throw abortError();

  const manifest = await loadManifest(kind, baseUrl);
  if (signal?.aborted) throw abortError();
  const entry = manifest.entries[String(id)];
  if (!entry) return { status: "unavailable", reason: "invalid-asset" };
  if (entry.status === "unavailable") return entry;

  const acquired: Array<{ key: string; resource: AtlasResource }> = [];
  try {
    for (const atlas of entry.atlases) {
      if (signal?.aborted) throw abortError();
      const url = `${baseUrl}/${atlas.file}`;
      const key = `${url}#${atlas.sha256}`;
      acquired.push({ key, resource: await acquireAtlas(url, atlas.sha256) });
    }
    if (signal?.aborted) throw abortError();
    let released = false;
    return {
      status: "ready",
      entry,
      atlasUrls: acquired.map(({ resource }) => resource.objectUrl),
      release() {
        if (released) return;
        released = true;
        for (const item of acquired) releaseAtlas(item.key, item.resource);
      },
    };
  } catch (error) {
    for (const item of acquired) releaseAtlas(item.key, item.resource);
    throw error;
  }
}

export function clearCatalogThumbAssetCache(): void {
  manifestPromises.clear();
  for (const promise of atlasPromises.values()) {
    void promise.then((resource) => {
      if (resource.revokeTimer !== null) window.clearTimeout(resource.revokeTimer);
      URL.revokeObjectURL(resource.objectUrl);
    }).catch(() => {});
  }
  atlasPromises.clear();
}
