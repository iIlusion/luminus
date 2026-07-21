import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface ObjectDataUpdate {
  id: number;
  state: string;
}

export class ObjectsDataUpdateParser implements PacketParser<ObjectDataUpdate[]> {
  flush(): void {}

  parse(reader: PacketReader): ObjectDataUpdate[] {
    const count = reader.readInt();
    const updates: ObjectDataUpdate[] = [];
    for (let index = 0; index < count; index++) {
      const id = reader.readInt();
      reader.readInt();
      updates.push({ id, state: reader.readString() });
    }
    return updates;
  }
}
