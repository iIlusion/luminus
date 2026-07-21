import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

/**
 * Incoming 207 — result of a native ignore/unignore action.
 * Live Habblet samples:
 *   result 1 + name → ignored
 *   result 3 + name → unignored
 */
export interface UserIgnoredResult {
  result: number;
  name: string;
}

export class UserIgnoredResultParser implements PacketParser<UserIgnoredResult> {
  flush(): void {}

  parse(reader: PacketReader): UserIgnoredResult {
    return {
      result: reader.readInt(),
      name: reader.readString()
    };
  }
}
