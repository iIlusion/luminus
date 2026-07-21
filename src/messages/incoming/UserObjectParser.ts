import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface Myself {
  id: number;
  username: string;
  figure: string;
  gender: string;
  motto: string;
  index: number | null;
}

export interface UserObject {
  id: number;
  username: string;
  figure: string;
  gender: string;
  motto: string;
  realName: string;
  directMail: boolean;
  respectsReceived: number;
  respectsRemaining: number;
  respectsPetRemaining: number;
  streamPublishingAllowed: boolean;
  lastAccessDate: string;
  canChangeName: boolean;
  safetyLocked: boolean;
}

export class UserObjectParser implements PacketParser<UserObject> {
  flush(): void {}

  parse(reader: PacketReader): UserObject {
    return {
      id: reader.readInt(),
      username: reader.readString(),
      figure: reader.readString(),
      gender: reader.readString(),
      motto: reader.readString(),
      realName: reader.readString(),
      directMail: reader.readBoolean(),
      respectsReceived: reader.readInt(),
      respectsRemaining: reader.readInt(),
      respectsPetRemaining: reader.readInt(),
      streamPublishingAllowed: reader.readBoolean(),
      lastAccessDate: reader.readString(),
      canChangeName: reader.readBoolean(),
      safetyLocked: reader.readBoolean()
    };
  }
}
