import { toHex } from "./codec";

export interface PacketPreview {
  bytes: number;
  hex: string;
  strings: string[];
  int32: number[];
  uint16: number[];
}

const MAX_VALUES = 12;

export function previewPacketBody(body: ArrayBuffer): PacketPreview {
  return {
    bytes: body.byteLength,
    hex: toHex(body, body.byteLength),
    strings: readHabboStrings(body),
    int32: readNumbers(body, 4, (view, offset) => view.getInt32(offset)),
    uint16: readNumbers(body, 2, (view, offset) => view.getUint16(offset))
  };
}

function readHabboStrings(body: ArrayBuffer): string[] {
  const strings: string[] = [];
  const bytes = new Uint8Array(body);
  const decoder = new TextDecoder();

  for (let offset = 0; offset + 2 <= bytes.byteLength && strings.length < MAX_VALUES; offset++) {
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    const start = offset + 2;
    const end = start + length;

    if (length < 1 || end > bytes.byteLength) continue;

    const text = decoder.decode(bytes.slice(start, end));
    if (isReadableText(text)) strings.push(text);
  }

  return unique(strings);
}

function readNumbers(
  body: ArrayBuffer,
  size: number,
  read: (view: DataView, offset: number) => number
): number[] {
  const view = new DataView(body);
  const values: number[] = [];

  for (let offset = 0; offset + size <= body.byteLength && values.length < MAX_VALUES; offset += size) {
    values.push(read(view, offset));
  }

  return values;
}

function isReadableText(text: string): boolean {
  if (!text.trim()) return false;
  return [...text].every((char) => {
    const code = char.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
