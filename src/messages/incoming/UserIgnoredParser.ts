import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

/** Incoming 126 — server ignore list (usernames). */
export interface UserIgnoredList {
  names: string[];
}

export class UserIgnoredParser implements PacketParser<UserIgnoredList> {
  flush(): void {}

  parse(reader: PacketReader): UserIgnoredList {
    const count = reader.readInt();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(reader.readString());
    }
    return { names };
  }
}
