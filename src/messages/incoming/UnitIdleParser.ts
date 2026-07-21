import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface UnitIdle {
  unitId: number;
  isIdle: boolean;
}

export class UnitIdleParser implements PacketParser<UnitIdle> {
  flush(): void {}

  parse(reader: PacketReader): UnitIdle {
    return {
      unitId: reader.readInt(),
      isIdle: reader.readBoolean()
    };
  }
}
