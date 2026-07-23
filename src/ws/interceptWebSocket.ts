import { PacketBridge } from "./PacketBridge";

type WebSocketWindow = Window & { WebSocket: typeof WebSocket; Luminus?: unknown };
type MessageListener = EventListenerOrEventListenerObject;

interface StoredMessageListener {
  listener: MessageListener;
  once: boolean;
}

export function getTargetWindow(): WebSocketWindow {
  const maybeUnsafe = (globalThis as { unsafeWindow?: WebSocketWindow }).unsafeWindow;
  return maybeUnsafe ?? (window as WebSocketWindow);
}

export function interceptWebSocket(target: WebSocketWindow, bridge: PacketBridge): void {
  const NativeWebSocket = target.WebSocket;

  class InterceptedWebSocket extends NativeWebSocket {
    private readonly messageListeners: Map<MessageListener, StoredMessageListener>;
    private messageHandler: ((this: WebSocket, event: MessageEvent) => unknown) | null;

    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols ?? []);
      bridge.setSocket(this);
      bridge.setNativeSend(data => NativeWebSocket.prototype.send.call(this, data));
      if (bridge.getDebug()) console.log("[Luminus] WebSocket criando:", url, protocols);

      this.messageListeners = new Map();
      this.messageHandler = null;

      super.addEventListener("message", (event) => {
        this.handleNativeMessage(event as MessageEvent);
      });
    }

    get onmessage(): ((this: WebSocket, event: MessageEvent) => unknown) | null {
      return this.messageHandler;
    }

    set onmessage(handler: ((this: WebSocket, event: MessageEvent) => unknown) | null) {
      this.messageHandler = handler;
    }

    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ): void {
      if (!listener) return;

      if (type !== "message" || !listener) {
        EventTarget.prototype.addEventListener.call(this, type, listener, options);
        return;
      }

      this.messageListeners.set(listener, {
        listener,
        once: typeof options === "object" && options.once === true
      });
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions
    ): void {
      if (!listener) return;

      if (type !== "message" || !listener) {
        EventTarget.prototype.removeEventListener.call(this, type, listener, options);
        return;
      }

      this.messageListeners.delete(listener);
    }

    send(data: Parameters<WebSocket["send"]>[0]): void {
      const result = bridge.handleOutgoing(this, data);

      if (result.action === "block" || result.action === "defer") return;

      super.send(result.action === "replace" && result.data ? result.data : data);
    }

    private handleNativeMessage(event: MessageEvent): void {
      const result = bridge.handleIncoming(this, event.data);

      if (result.action === "block" || result.action === "defer") return;

      const nextEvent =
        result.action === "replace" && result.data
          ? cloneMessageEvent(event, result.data)
          : event;

      this.messageHandler?.call(this, nextEvent);

      for (const [key, item] of [...this.messageListeners]) {
        callMessageListener(item.listener, this, nextEvent);
        if (item.once) this.messageListeners.delete(key);
      }
    }
  }

  Object.defineProperty(target, "WebSocket", {
    configurable: true,
    get: () => InterceptedWebSocket
  });
}

function callMessageListener(listener: MessageListener, socket: WebSocket, event: MessageEvent): void {
  if (typeof listener === "function") listener.call(socket, event);
  else listener.handleEvent(event);
}

function cloneMessageEvent(event: MessageEvent, data: ArrayBuffer): MessageEvent {
  return new MessageEvent("message", {
    data,
    origin: event.origin,
    lastEventId: event.lastEventId,
    source: event.source,
    ports: [...event.ports]
  });
}
