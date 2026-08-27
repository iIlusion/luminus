import { BinaryReader } from "./binary";

export class PacketReader {
  private readonly decoder = new TextDecoder();
  private readonly reader: BinaryReader;

  constructor(
    public readonly header: number,
    body: ArrayBuffer
  ) {
    this.reader = new BinaryReader(body);
  }

  readBytes(length: number): ArrayBuffer {
    return this.reader.readBytes(length);
  }

  readByte(): number {
    return this.reader.readByte();
  }

  readBoolean(): boolean {
    return this.readByte() === 1;
  }

  readShort(): number {
    return this.reader.readShort();
  }

  readInt(): number {
    return this.reader.readInt();
  }

  readFloat(): number {
    return this.reader.readFloat();
  }

  readDouble(): number {
    return this.reader.readDouble();
  }

  readLong(): number {
    return this.reader.readLong();
  }

  readString(): string {
    const length = this.readShort();
    return this.decoder.decode(this.readBytes(length));
  }

  get bytesAvailable(): boolean {
    return this.reader.remaining() > 0;
  }

  get offset(): number {
    return this.reader.getOffset();
  }

  set offset(offset: number) {
    this.reader.setOffset(offset);
  }

  get length(): number {
    return this.reader.byteLength();
  }
}
