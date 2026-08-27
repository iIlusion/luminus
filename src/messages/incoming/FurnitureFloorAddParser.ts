import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";
import { readFloorItem, type FloorFurni } from "./FurnitureFloorParser";

export interface FurnitureFloorAdd {
  item: FloorFurni;
  username: string;
}

export class FurnitureFloorAddParser implements PacketParser<FurnitureFloorAdd> {
  flush(): void {}

  parse(reader: PacketReader): FurnitureFloorAdd {
    return {
      item: readFloorItem(reader, new Map()),
      username: reader.readString(),
    };
  }
}
