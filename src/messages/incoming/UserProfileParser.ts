import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface UserProfileGroup {
  id: number;
  name: string;
  badge: string;
  primaryColor: string;
  secondaryColor: string;
  status: number;
  isFavorite: boolean;
}

export interface UserProfile {
  id: number;
  name: string;
  figure: string;
  motto: string;
  registrationDate: string;
  achievementScore: number;
  totalRespect: number;
  respectLeft: number;
  groups: UserProfileGroup[];
}

export class UserProfileParser implements PacketParser<UserProfile> {
  flush(): void {}

  parse(reader: PacketReader): UserProfile {
    const id = reader.readInt();
    const name = reader.readString();
    const figure = reader.readString();
    const motto = reader.readString();
    const registrationDate = reader.readString();
    const achievementScore = reader.readInt();
    const totalRespect = reader.readInt();
    const respectLeft = reader.readInt();
    const groupCount = reader.readInt();
    const groups: UserProfileGroup[] = [];

    for (let i = 0; i < groupCount && reader.bytesAvailable; i++) {
      groups.push({
        id: reader.readInt(),
        name: reader.readString(),
        badge: reader.readString(),
        primaryColor: reader.readString(),
        secondaryColor: reader.readString(),
        status: reader.readInt(),
        isFavorite: reader.readBoolean()
      });
    }

    return { id, name, figure, motto, registrationDate, achievementScore, totalRespect, respectLeft, groups };
  }
}
