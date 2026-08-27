type SocketWithInner = {
  ws?: unknown;
};

export function getInnermostSocket(value: unknown): WebSocket | null {
  let current: unknown = value;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);

    if (typeof current !== "object" && typeof current !== "function") return null;

    const candidate = current as SocketWithInner & Partial<WebSocket>;
    if (typeof candidate.send !== "function") return null;

    if (!candidate.ws || candidate.ws === current) return current as WebSocket;
    current = candidate.ws;
  }

  return null;
}

export function getSocketReadyState(value: unknown): number | null {
  const socket = getInnermostSocket(value);
  return typeof socket?.readyState === "number" ? socket.readyState : null;
}

export function isSocketOpen(value: unknown): boolean {
  return getSocketReadyState(value) === 1;
}

export function isSocketLike(value: unknown): value is WebSocket {
  return Boolean(
    value &&
      (typeof value === "object" || typeof value === "function") &&
      typeof (value as Partial<WebSocket>).send === "function",
  );
}
