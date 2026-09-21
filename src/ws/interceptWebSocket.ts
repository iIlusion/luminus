import { PacketBridge } from "./PacketBridge";
import { getInnermostSocket } from "./socketContract";
import { isExternalToolbarFixActive } from "../compat/externalToolbarFix";

type WebSocketWindow = Window & { WebSocket: typeof WebSocket; Luminus?: unknown };
type MessageListener = EventListenerOrEventListenerObject;
type MessageHandler = ((this: WebSocket, event: MessageEvent) => unknown) | null;

interface StoredMessageListener {
  listener: MessageListener;
  once: boolean;
}

interface SocketHooks {
  listeners: Map<MessageListener, StoredMessageListener>;
  messageHandler: MessageHandler;
  pumped: boolean;
}

const PATCHED = Symbol.for("luminus.wsNativePatched");
const ATTACH = Symbol.for("luminus.wsAttach");

type PatchedProto = WebSocket & {
  [PATCHED]?: boolean;
  [ATTACH]?: (socket: WebSocket) => void;
};

export function getTargetWindow(): WebSocketWindow {
  const maybeUnsafe = (globalThis as { unsafeWindow?: WebSocketWindow }).unsafeWindow;
  return maybeUnsafe ?? (window as WebSocketWindow);
}

export function interceptWebSocket(target: WebSocketWindow, bridge: PacketBridge): void {
  const currentDescriptor = Object.getOwnPropertyDescriptor(target, "WebSocket");
  const NativeWebSocket = unwrapNativeWebSocket(target.WebSocket);
  patchNativeWebSocket(NativeWebSocket, bridge);

  class InterceptedWebSocket extends NativeWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols ?? []);
      const proto = NativeWebSocket.prototype as PatchedProto;
      proto[ATTACH]?.(this);
      if (bridge.getDebug()) console.log("[Luminus] WebSocket criando:", url, protocols);
    }

    get readyState(): number {
      const inner = getInnermostSocket(this);
      return inner && inner !== this ? inner.readyState : super.readyState;
    }

    get bufferedAmount(): number {
      const inner = getInnermostSocket(this);
      return inner && inner !== this ? inner.bufferedAmount : super.bufferedAmount;
    }

    get extensions(): string {
      const inner = getInnermostSocket(this);
      return inner && inner !== this ? inner.extensions : super.extensions;
    }

    get protocol(): string {
      const inner = getInnermostSocket(this);
      return inner && inner !== this ? inner.protocol : super.protocol;
    }

    get url(): string {
      const inner = getInnermostSocket(this);
      return inner && inner !== this ? inner.url : super.url;
    }

    get binaryType(): BinaryType {
      const inner = getInnermostSocket(this);
      return inner && inner !== this ? inner.binaryType : super.binaryType;
    }

    set binaryType(value: BinaryType) {
      const inner = getInnermostSocket(this);
      if (inner && inner !== this) inner.binaryType = value;
      else super.binaryType = value;
    }
  }

  // Keep the public constructor replaceable so wrappers from other page-world
  // extensions can compose with Luminus instead of throwing on assignment.
  let exposedWebSocket: typeof WebSocket = InterceptedWebSocket;
  const nativeDefineProperty = Object.defineProperty;
  if (isExternalToolbarFixActive()) {
    protectWebSocketDefinition(target, next => {
      exposedWebSocket = next;
    });
  }

  nativeDefineProperty(target, "WebSocket", {
    configurable: true,
    enumerable: currentDescriptor?.enumerable ?? true,
    get: () => exposedWebSocket,
    set: (next: typeof WebSocket) => {
      if (typeof next === "function") exposedWebSocket = next;
    }
  });
}

function protectWebSocketDefinition(
  target: WebSocketWindow,
  onDefine: (next: typeof WebSocket) => void
): void {
  const nativeDefineProperty = Object.defineProperty;
  const nativeReflectDefineProperty = Reflect.defineProperty;
  const objectDefinePropertyDescriptor = Object.getOwnPropertyDescriptor(Object, "defineProperty");
  const reflectDefinePropertyDescriptor = Object.getOwnPropertyDescriptor(Reflect, "defineProperty");

  const capture = (object: object, property: PropertyKey, descriptor: PropertyDescriptor): boolean => {
    if (!isExternalToolbarFixActive() || object !== target || property !== "WebSocket" || typeof descriptor.value !== "function") return false;
    onDefine(descriptor.value as typeof WebSocket);
    return true;
  };

  const guardedDefineProperty: typeof Object.defineProperty = (object, property, descriptor) => {
    if (capture(object as object, property, descriptor)) return object;
    return nativeDefineProperty(object, property, descriptor);
  };

  const guardedReflectDefineProperty: typeof Reflect.defineProperty = (object, property, descriptor) => {
    if (capture(object, property, descriptor)) return true;
    return nativeReflectDefineProperty(object, property, descriptor);
  };

  if (objectDefinePropertyDescriptor) {
    nativeDefineProperty(Object, "defineProperty", {
      ...objectDefinePropertyDescriptor,
      value: guardedDefineProperty
    });
  }
  if (reflectDefinePropertyDescriptor) {
    nativeDefineProperty(Reflect, "defineProperty", {
      ...reflectDefinePropertyDescriptor,
      value: guardedReflectDefineProperty
    });
  }
}

function unwrapNativeWebSocket(ctor: typeof WebSocket): typeof WebSocket {
  let current = ctor;
  for (let i = 0; i < 4; i++) {
    const parent = Object.getPrototypeOf(current.prototype)?.constructor;
    if (typeof parent !== "function" || parent === current || parent === EventTarget) break;
    if (parent === Function.prototype || parent === Object) break;
    current = parent as typeof WebSocket;
  }
  return current;
}

// Habblet may Object.setPrototypeOf(socket, NativeWebSocket.prototype) after `new`.
// Keep send/message hooks on that native prototype and handleNativeMessage as an own
// property so the swap cannot drop interception.
function patchNativeWebSocket(NativeWebSocket: typeof WebSocket, bridge: PacketBridge): void {
  const proto = NativeWebSocket.prototype as PatchedProto;
  if (proto[PATCHED]) return;
  proto[PATCHED] = true;

  const hooks = new WeakMap<WebSocket, SocketHooks>();
  const nativeSend = proto.send;
  const nativeAdd = proto.addEventListener;
  const nativeRemove = proto.removeEventListener;
  const nativeOnMessage = Object.getOwnPropertyDescriptor(proto, "onmessage");

  const getHooks = (socket: WebSocket): SocketHooks => {
    let state = hooks.get(socket);
    if (!state) {
      state = { listeners: new Map(), messageHandler: null, pumped: false };
      hooks.set(socket, state);
    }
    return state;
  };

  const dispatchIncoming = (socket: WebSocket, event: MessageEvent): void => {
    const result = bridge.handleIncoming(socket, event.data);
    if (result.action === "block" || result.action === "defer") return;

    const nextEvent =
      result.action === "replace" && result.data
        ? cloneMessageEvent(event, result.data)
        : event;

    const state = getHooks(socket);
    state.messageHandler?.call(socket, nextEvent);

    for (const [key, item] of [...state.listeners]) {
      callMessageListener(item.listener, socket, nextEvent);
      if (item.once) state.listeners.delete(key);
    }
  };

  const attach = (socket: WebSocket): void => {
    const inner = getInnermostSocket(socket) ?? socket;
    bridge.setSocket(socket);
    bridge.setNativeSend(data => nativeSend.call(inner, data));

    const state = getHooks(socket);
    if (!state.pumped) {
      state.pumped = true;
      nativeAdd.call(socket, "message", (event: Event) => {
        dispatchIncoming(socket, event as MessageEvent);
      });
    }

    Object.defineProperty(socket, "handleNativeMessage", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: (event: MessageEvent) => dispatchIncoming(socket, event)
    });
  };

  proto[ATTACH] = attach;

  proto.send = function send(this: WebSocket, data: Parameters<WebSocket["send"]>[0]): void {
    attach(this);
    const result = bridge.handleOutgoing(this, data);
    if (result.action === "block" || result.action === "defer") return;
    nativeSend.call(this, result.action === "replace" && result.data ? result.data : data);
  };

  proto.addEventListener = function addEventListener(
    this: WebSocket,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!listener) return;
    if (type !== "message") {
      nativeAdd.call(this, type, listener, options);
      return;
    }

    attach(this);
    getHooks(this).listeners.set(listener, {
      listener,
      once: typeof options === "object" && options.once === true
    });
  };

  proto.removeEventListener = function removeEventListener(
    this: WebSocket,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void {
    if (!listener) return;
    if (type !== "message") {
      nativeRemove.call(this, type, listener, options);
      return;
    }
    hooks.get(this)?.listeners.delete(listener);
  };

  Object.defineProperty(proto, "onmessage", {
    configurable: true,
    enumerable: nativeOnMessage?.enumerable ?? true,
    get(this: WebSocket): MessageHandler {
      return hooks.get(this)?.messageHandler ?? null;
    },
    set(this: WebSocket, handler: MessageHandler) {
      attach(this);
      getHooks(this).messageHandler = handler;
    }
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
