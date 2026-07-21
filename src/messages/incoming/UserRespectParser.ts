import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface UserRespect {
  userId: number;
  respect: number;
}

export class UserRespectParser implements PacketParser<UserRespect> {
  flush(): void {}

  parse(reader: PacketReader): UserRespect {
    return {
      userId: reader.readInt(),
      respect: reader.readInt()
    };
  }
}
