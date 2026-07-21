import { BinaryReader, BinaryWriter } from "./binary";

export class Byte {
  constructor(public readonly value: number) {}
}

export class Short {
  constructor(public readonly value: number) {}
}

export interface WirePacket {
  header: number;
  wireHeader: number;
  body: ArrayBuffer;
  raw: ArrayBuffer;
}

export class EvaWireCodec {
  decode(buffer: ArrayBuffer): WirePacket[] {
    const packets: WirePacket[] = [];
    const reader = new BinaryReader(buffer);

    while (reader.remaining() >= 4) {
      const length = reader.readInt();
      if (length < 2 || reader.remaining() < length) break;

      const rawBody = reader.readBytes(length);
      const bodyReader = new BinaryReader(rawBody);
      const header = bodyReader.readShort();
      const body = bodyReader.readBytes(bodyReader.remaining());
      const raw = new BinaryWriter()
        .writeInt(length)
        .writeShort(header)
        .writeArrayBuffer(body)
        .toArrayBuffer();

      packets.push({ header, wireHeader: header, body, raw });
    }

    return packets;
  }

  encode(header: number, values: unknown[]): ArrayBuffer {
    const body = new BinaryWriter().writeShort(header);

    for (const value of values) {
      if (value instanceof Byte) body.writeByte(value.value);
      else if (value instanceof Short) body.writeShort(value.value);
      else if (value instanceof ArrayBuffer) body.writeArrayBuffer(value);
      else if (ArrayBuffer.isView(value)) {
        body.writeArrayBuffer(new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice().buffer);
      } else if (typeof value === "number") body.writeInt(value);
      else if (typeof value === "boolean") body.writeByte(value ? 1 : 0);
      else if (typeof value === "string") body.writeString(value);
      else if (value == null) body.writeShort(0);
    }

    const packet = body.toArrayBuffer();
    return new BinaryWriter().writeInt(packet.byteLength).writeArrayBuffer(packet).toArrayBuffer();
  }
}

export function toArrayBuffer(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice().buffer;
}

export function toHex(buffer: ArrayBuffer, limit = 64): string {
  return [...new Uint8Array(buffer.slice(0, limit))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
}
