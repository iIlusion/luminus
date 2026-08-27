import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

/** Server confirmation of the current user's visual (Nitro USER_FIGURE, 2429). */
export interface FigureUpdate {
  figure: string;
  gender: string;
}

export class FigureUpdateParser implements PacketParser<FigureUpdate> {
  flush(): void {}

  parse(reader: PacketReader): FigureUpdate {
    return {
      figure: reader.readString(),
      gender: reader.readString().toUpperCase(),
    };
  }
}
