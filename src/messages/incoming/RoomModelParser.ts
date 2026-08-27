import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface RoomHiddenArea {
  furniId: number;
  on: boolean;
  rootX: number;
  rootY: number;
  width: number;
  length: number;
  invert: boolean;
}

export interface RoomModelData {
  isScaledDown: boolean;
  wallHeight: number;
  model: string;
  hiddenAreas: RoomHiddenArea[];
}

export class RoomModelParser implements PacketParser<RoomModelData> {
  flush(): void {}

  parse(reader: PacketReader): RoomModelData {
    const isScaledDown = reader.readBoolean();
    const wallHeight = reader.readInt();
    const model = reader.readString();
    const hiddenAreaCount = reader.readInt();
    const hiddenAreas: RoomHiddenArea[] = [];

    for (let index = 0; index < hiddenAreaCount; index++) {
      hiddenAreas.push({
        furniId: reader.readInt(),
        on: reader.readBoolean(),
        rootX: reader.readInt(),
        rootY: reader.readInt(),
        width: reader.readInt(),
        length: reader.readInt(),
        invert: reader.readBoolean(),
      });
    }

    return { isScaledDown, wallHeight, model, hiddenAreas };
  }
}
