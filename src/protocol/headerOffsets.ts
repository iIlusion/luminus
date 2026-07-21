const HABBLET_RELEASE = "PRODUCTION-202101271337-HTML5";
const HABBLET_PROTOCOL_BUILD_KEY = "PROTOV2-50295821";
const HEADER_OFFSET_MIN = 5000;
const HEADER_OFFSET_RANGE = 20001;
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const HABBLET_WS_CHALLENGE_LENGTH = 16;

export interface HeaderOffsets {
  incoming: number | null;
  outgoing: number | null;
}

export function normalizeHeader(header: number): number {
  return ((header % 0x10000) + 0x10000) % 0x10000;
}

export function applyHeaderOffset(buffer: ArrayBuffer, offset: number): ArrayBuffer {
  const bytes = new Uint8Array(buffer).slice();
  const view = new DataView(bytes.buffer);
  let packetOffset = 0;

  while (packetOffset + 6 <= bytes.byteLength) {
    const length = view.getInt32(packetOffset);
    if (length < 2 || packetOffset + 4 + length > bytes.byteLength) return bytes.buffer;

    const headerOffset = packetOffset + 4;
    const header = view.getUint16(headerOffset);
    view.setUint16(headerOffset, normalizeHeader(header + offset));
    packetOffset += 4 + length;
  }

  return bytes.buffer;
}

export function readProxyHandshakeOffsets(buffer: ArrayBuffer): HeaderOffsets | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 5 + HABBLET_WS_CHALLENGE_LENGTH) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== getBootstrapMagic(HABBLET_RELEASE)) return null;
  if (view.getUint8(4) !== getServerBootstrapResponseType(HABBLET_RELEASE)) return null;

  const challenge = bytes.slice(5, 5 + HABBLET_WS_CHALLENGE_LENGTH);
  const outgoing = deriveHeaderOffset("server-incoming", HABBLET_RELEASE, challenge);
  const derivedIncoming = deriveHeaderOffset("server-outgoing", HABBLET_RELEASE, challenge);
  const incoming =
    outgoing === derivedIncoming
      ? HEADER_OFFSET_MIN + ((derivedIncoming - HEADER_OFFSET_MIN + 7919) % HEADER_OFFSET_RANGE)
      : derivedIncoming;

  return { incoming, outgoing };
}

function deriveHeaderOffset(label: string, release: string, challenge: Uint8Array): number {
  return HEADER_OFFSET_MIN + (fnv1a32(joinBootstrapSeed(label, release, challenge)) % HEADER_OFFSET_RANGE);
}

function getBootstrapMagic(release: string): number {
  return fnv1a32(joinBootstrapSeed("magic", release));
}

function getClientBootstrapRequestType(release: string): number {
  return fnv1a32(joinBootstrapSeed("request-type", release)) & 0xff;
}

function getServerBootstrapResponseType(release: string): number {
  const responseType = fnv1a32(joinBootstrapSeed("response-type", release)) & 0xff;
  const requestType = getClientBootstrapRequestType(release);
  return responseType === requestType ? (responseType + 73) & 0xff : responseType;
}

function joinBootstrapSeed(label: string, release: string, challenge?: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const labelBytes = encoder.encode(label);
  const releaseBytes = encoder.encode(release);
  const protocolBytes = encoder.encode(HABBLET_PROTOCOL_BUILD_KEY);
  const challengeBytes = challenge ?? new Uint8Array(0);
  const length = labelBytes.length + releaseBytes.length + protocolBytes.length + challengeBytes.length + (challenge ? 3 : 2);
  const seed = new Uint8Array(length);
  let offset = 0;

  seed.set(labelBytes, offset);
  offset += labelBytes.length;
  seed[offset++] = 0;
  seed.set(releaseBytes, offset);
  offset += releaseBytes.length;
  seed[offset++] = 0;
  seed.set(protocolBytes, offset);
  offset += protocolBytes.length;

  if (challenge) {
    seed[offset++] = 0;
    seed.set(challengeBytes, offset);
  }

  return seed;
}

function fnv1a32(bytes: Uint8Array): number {
  let hash = FNV_OFFSET_BASIS;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return hash >>> 0;
}
