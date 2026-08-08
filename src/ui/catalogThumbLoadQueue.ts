type QueuedLoad<T> = {
  key: string;
  priority: number;
  order: number;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
};

const MAX_CONCURRENT_LOADS = 4;
const pending = new Map<string, QueuedLoad<unknown>>();
let running = 0;
let nextOrder = 0;

function abortError(): DOMException {
  return new DOMException("Operação cancelada", "AbortError");
}

function pump(): void {
  while (running < MAX_CONCURRENT_LOADS && pending.size > 0) {
    const next = Array.from(pending.values()).sort(
      (a, b) => b.priority - a.priority || a.order - b.order,
    )[0];
    if (!next) return;

    pending.delete(next.key);
    if (next.onAbort) next.signal?.removeEventListener("abort", next.onAbort);
    if (next.signal?.aborted) {
      next.reject(abortError());
      continue;
    }

    running += 1;
    void next.run().then(next.resolve, next.reject).finally(() => {
      running -= 1;
      pump();
    });
  }
}

export function enqueueCatalogThumbLoad<T>(
  key: string,
  priority: number,
  run: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError());

  return new Promise<T>((resolve, reject) => {
    const job: QueuedLoad<T> = {
      key,
      priority,
      order: nextOrder++,
      run,
      resolve,
      reject,
      signal,
    };
    job.onAbort = () => {
      if (!pending.delete(key)) return;
      reject(abortError());
      pump();
    };
    signal?.addEventListener("abort", job.onAbort, { once: true });
    pending.set(key, job as QueuedLoad<unknown>);
    pump();
  });
}

export function prioritizeCatalogThumbLoad(key: string, visible: boolean): void {
  const job = pending.get(key);
  if (!job) return;
  job.priority = visible ? 1 : 0;
  pump();
}
