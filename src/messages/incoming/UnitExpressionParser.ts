import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface UnitExpression {
  unitId: number;
  expression: number;
}

export class UnitExpressionParser implements PacketParser<UnitExpression> {
  flush(): void {}

  parse(reader: PacketReader): UnitExpression {
    return {
      unitId: reader.readInt(),
      expression: reader.readInt()
    };
  }
}
