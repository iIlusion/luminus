declare function GM_xmlhttpRequest(details: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  responseType?: "arraybuffer";
  onload(r: { status: number; responseText: string; response?: ArrayBuffer }): void;
  onerror(): void;
  ontimeout?(): void;
}): void;

function hasGmXhr(): boolean {
  return typeof GM_xmlhttpRequest === "function";
}

function gmRequest(
  method: string,
  url: string,
  options?: { headers?: Record<string, string>; data?: string },
): Promise<{ status: number; responseText: string }> {
  return new Promise((resolve, reject) => {
    try {
      GM_xmlhttpRequest({
        method,
        url,
        headers: options?.headers,
        data: options?.data,
        onload(r) {
          resolve({ status: r.status, responseText: r.responseText });
        },
        onerror() {
          reject(new Error("Network error"));
        },
        ontimeout() {
          reject(new Error("Network timeout"));
        },
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/** Native fetch fallback (works when page CORS allows; jsDelivr does). */
async function pageFetch(
  method: string,
  url: string,
  options?: { headers?: Record<string, string>; data?: string },
): Promise<{ status: number; responseText: string }> {
  const res = await fetch(url, {
    method,
    headers: options?.headers,
    body: options?.data,
  });
  const responseText = await res.text();
  return { status: res.status, responseText };
}

async function request(
  method: string,
  url: string,
  options?: { headers?: Record<string, string>; data?: string },
): Promise<{ status: number; responseText: string }> {
  if (hasGmXhr()) {
    try {
      return await gmRequest(method, url, options);
    } catch {
      // Missing @connect, inject-into page quirks, etc. — try CORS fetch.
    }
  }
  return pageFetch(method, url, options);
}

function parseJsonOrThrow<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON");
  }
}

export function gmPost(url: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  if (hasGmXhr()) {
    try {
      GM_xmlhttpRequest({
        method: "POST",
        url,
        headers: { "Content-Type": "application/json" },
        data,
        onload() {},
        onerror() {},
      });
      return;
    } catch {
      /* fall through */
    }
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data,
  }).catch(() => {});
}

/** POST JSON and parse JSON response (2xx). */
export function gmPostJson<T = unknown>(
  url: string,
  payload: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return request("POST", url, {
    headers: { "Content-Type": "application/json", ...headers },
    data: JSON.stringify(payload),
  }).then((r) => {
    if (r.status >= 200 && r.status < 300) return parseJsonOrThrow<T>(r.responseText);
    throw new Error(`HTTP ${r.status}`);
  });
}

export function gmFetch<T = unknown>(url: string): Promise<T> {
  return request("GET", url).then((r) => {
    if (r.status >= 200 && r.status < 300) return parseJsonOrThrow<T>(r.responseText);
    throw new Error(`HTTP ${r.status}`);
  });
}

/** Fetch bytes through the userscript transport when page security blocks localhost. */
export async function gmFetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  if (hasGmXhr()) {
    try {
      const response = await new Promise<{ status: number; bytes: ArrayBuffer }>((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          responseType: "arraybuffer",
          onload(r) {
            if (!(r.response instanceof ArrayBuffer)) {
              reject(new Error("Resposta binária inválida"));
              return;
            }
            resolve({ status: r.status, bytes: r.response });
          },
          onerror() {
            reject(new Error("Network error"));
          },
          ontimeout() {
            reject(new Error("Network timeout"));
          },
        });
      });
      if (response.status >= 200 && response.status < 300) return response.bytes;
      throw new Error(`HTTP ${response.status}`);
    } catch {
      // Fall back to native fetch for CORS-enabled production assets.
    }
  }
  const response = await fetch(url, { cache: "force-cache", mode: "cors" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}
