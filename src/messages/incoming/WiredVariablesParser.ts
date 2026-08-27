import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface WiredVariableInfo {
  id: number;
  type: number;
  name: string;
}

export interface WiredVariables {
  itemId: number;
  variables: WiredVariableInfo[];
}

const VARIABLE_TYPES = new Set([0, 1, -10, -20]);

export class WiredVariablesParser implements PacketParser<WiredVariables> {
  flush(): void {}

  parse(reader: PacketReader): WiredVariables {
    const remaining = () => reader.length - reader.offset;
    const itemId = reader.readInt();
    if (remaining() >= 4) reader.readInt();
    const count = remaining() >= 4 ? reader.readInt() : 0;
    if (remaining() >= 4) reader.readInt();
    const variables: WiredVariableInfo[] = [];
    const limit = Math.min(Math.max(count, 0), 256);
    for (let index = 0; index < limit && remaining() >= 10; index++) {
      const id = reader.readInt();
      const type = reader.readInt();
      const name = reader.readString();
      if (remaining() >= 1) reader.readBoolean();
      const skip = Math.min(6, remaining());
      if (skip) reader.readBytes(skip);
      if (id > 0 && VARIABLE_TYPES.has(type) && name && !name.startsWith("@")) {
        variables.push({ id, type, name });
      }
    }
    return { itemId, variables };
  }
}
