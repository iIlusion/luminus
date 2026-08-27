import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface WiredToolInspectionVariable {
  id: number;
  name: string;
  value: string;
}

export interface WiredToolInspection {
  entityType: number;
  variables: WiredToolInspectionVariable[];
}

export class WiredToolInspectionParser implements PacketParser<WiredToolInspection> {
  flush(): void {}

  parse(reader: PacketReader): WiredToolInspection {
    const remaining = () => reader.length - reader.offset;
    const entityType = remaining() >= 4 ? reader.readInt() : 0;
    const count = remaining() >= 4 ? reader.readInt() : 0;
    if (count > 0 && remaining() >= 4) reader.readInt();
    const variables: WiredToolInspectionVariable[] = [];
    const limit = Math.min(Math.max(count, 0), 256);
    for (let index = 0; index < limit && remaining() >= 6; index++) {
      const id = reader.readInt();
      const name = remaining() >= 2 ? reader.readString() : "";
      const value = remaining() >= 2 ? reader.readString() : "";
      if (remaining() >= 3) {
        reader.readBoolean();
        reader.readBoolean();
        reader.readBoolean();
      }
      if (remaining() >= 4) reader.readInt();
      if (name) variables.push({ id, name, value });
    }
    return { entityType, variables };
  }
}
