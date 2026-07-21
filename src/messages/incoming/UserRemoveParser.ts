import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export class UserRemoveParser implements PacketParser<number> {
  flush(): void {}

  parse(reader: PacketReader): number {
    return Number.parseInt(reader.readString(), 10);
  }
}
