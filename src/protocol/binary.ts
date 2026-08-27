export class BinaryReader {
  private offset = 0;
  private readonly view: DataView;

  constructor(private readonly buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readBytes(length: number): ArrayBuffer {
    const end = this.offset + length;
    if (end > this.buffer.byteLength) throw new RangeError("read past end");

    const bytes = this.buffer.slice(this.offset, end);
    this.offset = end;
    return bytes;
  }

  readByte(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readShort(): number {
    const value = this.view.getInt16(this.offset);
    this.offset += 2;
    return value;
  }

  readInt(): number {
    const value = this.view.getInt32(this.offset);
    this.offset += 4;
    return value;
  }

  readFloat(): number {
    const value = this.view.getFloat32(this.offset);
    this.offset += 4;
    return value;
  }

  readDouble(): number {
    const value = this.view.getFloat64(this.offset);
    this.offset += 8;
    return value;
  }

  readLong(): number {
    const high = this.view.getInt32(this.offset);
    const low = this.view.getUint32(this.offset + 4);
    this.offset += 8;
    return high * 4294967296 + low;
  }

  remaining(): number {
    return this.buffer.byteLength - this.offset;
  }

  getOffset(): number {
    return this.offset;
  }

  setOffset(offset: number): void {
    if (offset < 0 || offset > this.buffer.byteLength) throw new RangeError("invalid offset");
    this.offset = offset;
  }

  byteLength(): number {
    return this.buffer.byteLength;
  }
}

export class BinaryWriter {
  private bytes: number[] = [];
  private readonly encoder = new TextEncoder();

  writeByte(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  writeShort(value: number): this {
    this.bytes.push((value >> 8) & 0xff, value & 0xff);
    return this;
  }

  writeInt(value: number): this {
    this.bytes.push(
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff
    );
    return this;
  }

  writeFloat(value: number): this {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setFloat32(0, value);
    return this.writeArrayBuffer(buffer);
  }

  writeDouble(value: number): this {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, value);
    return this.writeArrayBuffer(buffer);
  }

  writeLong(value: number): this {
    const high = Math.trunc(value / 4294967296);
    const low = value - high * 4294967296;
    return this.writeInt(high).writeInt(low);
  }

  writeString(value: string): this {
    const bytes = this.encoder.encode(value);
    this.writeShort(bytes.byteLength);
    appendBytes(this.bytes, bytes);
    return this;
  }

  writeArrayBuffer(buffer: ArrayBuffer): this {
    appendBytes(this.bytes, new Uint8Array(buffer));
    return this;
  }

  toArrayBuffer(): ArrayBuffer {
    return new Uint8Array(this.bytes).buffer;
  }
}

/** Avoid `push(...huge)` — large furniture packets overflow the call stack. */
function appendBytes(target: number[], bytes: Uint8Array): void {
  const chunk = 8192;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    const end = Math.min(offset + chunk, bytes.length);
    for (let index = offset; index < end; index++) target.push(bytes[index]);
  }
}
