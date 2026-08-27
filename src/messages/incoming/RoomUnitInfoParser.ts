import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

/** Full visual/identity refresh for one room user (Nitro UNIT_INFO, 3920). */
export interface RoomUnitInfo {
  index: number;
  figure: string;
  gender: string;
  motto: string;
  achievementScore: number;
}

export class RoomUnitInfoParser implements PacketParser<RoomUnitInfo> {
  flush(): void {}

  parse(reader: PacketReader): RoomUnitInfo {
    return {
      index: reader.readInt(),
      figure: reader.readString(),
      gender: reader.readString().toUpperCase(),
      motto: reader.readString(),
      achievementScore: reader.readInt(),
    };
  }
}
