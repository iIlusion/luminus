declare function GM_xmlhttpRequest(details: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  onload(r: { status: number; responseText: string }): void;
  onerror(): void;
}): void;

export function gmPost(url: string, payload: unknown): void {
  GM_xmlhttpRequest({
    method: "POST",
    url,
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(payload),
    onload() {},
    onerror() {},
  });
}

/** POST JSON and parse JSON response (2xx). */
export function gmPostJson<T = unknown>(url: string, payload: unknown, headers?: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json", ...headers },
      data: JSON.stringify(payload),
      onload(r) {
        if (r.status >= 200 && r.status < 300) {
          try { resolve(JSON.parse(r.responseText) as T); }
          catch { reject(new Error("Invalid JSON")); }
        } else {
          reject(new Error(`HTTP ${r.status}`));
        }
      },
      onerror() { reject(new Error("Network error")); },
    });
  });
}

export function gmFetch<T = unknown>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload(r) {
        if (r.status >= 200 && r.status < 300) {
          try { resolve(JSON.parse(r.responseText) as T); }
          catch { reject(new Error("Invalid JSON")); }
        } else {
          reject(new Error(`HTTP ${r.status}`));
        }
      },
      onerror() { reject(new Error("Network error")); }
    });
  });
}
