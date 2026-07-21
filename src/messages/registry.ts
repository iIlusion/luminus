import { EvaWireCodec } from "../protocol/codec";
import { PacketReader } from "../protocol/wrapper";
import type { PacketComposer, PacketParser } from "../protocol/types";

type ParserConstructor = new () => PacketParser;
type ComposerConstructor = new (...args: any[]) => PacketComposer;

interface IncomingRegistration {
  name: string;
  ParserClass: ParserConstructor;
}

interface OutgoingRegistration {
  name: string;
  ComposerClass: ComposerConstructor;
}

export class PacketRegistry {
  private readonly incoming = new Map<number, IncomingRegistration>();
  private readonly outgoing = new Map<number, OutgoingRegistration>();
  private readonly outgoingHeaders = new Map<Function, number>();
  private readonly outgoingNames = new Map<string, number>();

  registerIncoming(header: number, name: string, ParserClass: ParserConstructor): void {
    this.incoming.set(header, { name, ParserClass });
  }

  registerOutgoing(header: number, name: string, ComposerClass: ComposerConstructor, aliases: string[] = []): void {
    this.outgoing.set(header, { name, ComposerClass });
    this.outgoingHeaders.set(ComposerClass, header);
    for (const item of [name, ...aliases]) this.outgoingNames.set(normalizeOutgoingName(item), header);
  }

  parseIncoming(header: number, body: ArrayBuffer): { name?: string; parsed?: unknown; parseError?: string } {
    const item = this.incoming.get(header);
    if (!item) return {};

    try {
      const parser = new item.ParserClass();
      parser.flush();

      const parsed = parser.parse(new PacketReader(header, body));
      return parsed === false ? { name: item.name } : { name: item.name, parsed };
    } catch (error) {
      return {
        name: item.name,
        parseError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getIncomingName(header: number): string | undefined {
    return this.incoming.get(header)?.name;
  }

  getOutgoingName(header: number): string | undefined {
    return this.outgoing.get(header)?.name;
  }

  compose(headerOrComposer: number | string | PacketComposer, values: unknown[] = []): ArrayBuffer | null {
    const codec = new EvaWireCodec();

    if (typeof headerOrComposer === "number") return codec.encode(headerOrComposer, values);
    if (typeof headerOrComposer === "string") {
      const header = this.outgoingNames.get(normalizeOutgoingName(headerOrComposer));
      return header === undefined ? null : codec.encode(header, values);
    }

    const header = this.outgoingHeaders.get(headerOrComposer.constructor);
    if (header === undefined) return null;

    return codec.encode(header, headerOrComposer.getMessageArray());
  }
}

export const packetRegistry = new PacketRegistry();

function normalizeOutgoingName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
