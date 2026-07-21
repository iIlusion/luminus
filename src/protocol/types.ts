export type PacketDirection = "incoming" | "outgoing";
export type PacketOrigin = "client" | "script" | "server";

export type BinaryPacketData = ArrayBuffer | ArrayBufferView;

export type PacketDecision =
  | "pass"
  | "block"
  | void
  | { action: "replace"; data: ArrayBuffer };

export interface DecodedPacket {
  direction: PacketDirection;
  header: number;
  wireHeader: number;
  body: ArrayBuffer;
  raw: ArrayBuffer;
  parsed?: unknown;
  parseError?: string;
  name?: string;
}

export interface PacketHandlerContext {
  packet: DecodedPacket;
  socket: WebSocket;
  origin: PacketOrigin;
}

export type PacketHandler = (
  context: PacketHandlerContext
) => PacketDecision | Promise<PacketDecision>;

export interface PacketParser<T = unknown> {
  flush(): void;
  parse(reader: import("./wrapper").PacketReader): T | false;
}

export interface PacketComposer<T extends unknown[] = unknown[]> {
  getMessageArray(): T;
}
