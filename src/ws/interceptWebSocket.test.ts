import { interceptWebSocket } from "./interceptWebSocket.ts";
import type { PacketBridge } from "./PacketBridge.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly url: string;
  readyState = FakeWebSocket.OPEN;
  sent: Array<Parameters<WebSocket["send"]>[0]> = [];
  binaryType: BinaryType = "arraybuffer";

  constructor(url: string | URL) {
    super();
    this.url = String(url);
  }

  send(data: Parameters<WebSocket["send"]>[0]): void {
    this.sent.push(data);
  }
}

function frame(header: number, body: number[] = [1, 2, 3, 4]): ArrayBuffer {
  const bytes = new Uint8Array(6 + body.length);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, 2 + body.length);
  view.setUint16(4, header);
  bytes.set(body, 6);
  return bytes.buffer;
}

const target = { WebSocket: FakeWebSocket as unknown as typeof WebSocket };
const outgoing: number[] = [];
const incoming: number[] = [];
const bridge = {
  getDebug: () => false,
  setSocket: () => undefined,
  setNativeSend: () => undefined,
  handleOutgoing: (_socket: WebSocket, data: ArrayBuffer) => {
    outgoing.push(new DataView(data).getUint16(4));
    return { action: "pass" as const };
  },
  handleIncoming: (_socket: WebSocket, data: ArrayBuffer) => {
    incoming.push(new DataView(data).getUint16(4));
    return { action: "pass" as const };
  }
};

interceptWebSocket(
  target as unknown as Window & { WebSocket: typeof WebSocket },
  bridge as unknown as PacketBridge
);

const ws = new target.WebSocket("wss://proxy.habblet.city/") as unknown as FakeWebSocket & {
  handleNativeMessage?: (event: MessageEvent) => void;
};

let hotelMessages = 0;
ws.addEventListener("message", () => {
  hotelMessages++;
});

Object.setPrototypeOf(ws, FakeWebSocket.prototype);

assert(ws.send === FakeWebSocket.prototype.send, "stripped instance must use native prototype send");
assert(typeof ws.handleNativeMessage === "function", "handleNativeMessage must survive prototype swap");

ws.send(frame(1234));
assert(outgoing.includes(1234), "outgoing hook must survive prototype swap");
assert(ws.sent.length === 1, "native send must still deliver outgoing bytes");

ws.dispatchEvent(new MessageEvent("message", { data: frame(4321) }));
assert(incoming.includes(4321), "incoming hook must survive prototype swap");
assert(hotelMessages === 1, "hotel message listeners must still receive passed packets");

const hotelBeforeInject = hotelMessages;
ws.handleNativeMessage?.(new MessageEvent("message", { data: frame(1111) }));
assert(incoming.includes(1111), "injected handleNativeMessage must keep working after swap");
assert(hotelMessages === hotelBeforeInject + 1, "injected packets must reach hotel listeners");

console.log("interceptWebSocket prototype-swap hooks ok");
