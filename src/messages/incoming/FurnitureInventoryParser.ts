import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface FurnitureInventoryItem {
  itemId: number;
  furniType: string;
  spriteId: number;
  category: number;
  extra: number;
  isWallItem: boolean;
}

export interface FurnitureInventoryFragment {
  totalFragments: number;
  fragmentNumber: number;
  items: FurnitureInventoryItem[];
}

export class FurnitureInventoryParser implements PacketParser<FurnitureInventoryFragment> {
  flush(): void {}

  parse(reader: PacketReader): FurnitureInventoryFragment {
    const totalFragments = reader.readInt();
    const fragmentNumber = reader.readInt();
    const totalItems = reader.readInt();
    const items: FurnitureInventoryItem[] = [];

    for (let index = 0; index < totalItems && reader.bytesAvailable; index++) {
      const itemId = reader.readInt();
      const furniType = reader.readString();
      reader.readInt();
      const spriteId = reader.readInt();
      const category = reader.readInt();
      skipObjectData(reader);
      reader.readBoolean();
      reader.readBoolean();
      reader.readBoolean();
      reader.readBoolean();
      reader.readInt();
      reader.readBoolean();
      reader.readInt();
      let extra = 0;
      if (furniType === "S") {
        reader.readString();
        extra = reader.readInt();
      }
      items.push({ itemId, furniType, spriteId, category, extra, isWallItem: furniType === "I" });
    }

    return { totalFragments, fragmentNumber, items };
  }
}

function skipObjectData(reader: PacketReader): void {
  const rawFormat = reader.readInt();
  const format = rawFormat & 0xff;
  const flags = rawFormat & 0xff00;

  if (format === 0) {
    reader.readString();
  } else if (format === 1) {
    const count = reader.readInt();
    for (let index = 0; index < count; index++) {
      reader.readString();
      reader.readString();
    }
  } else if (format === 2) {
    const count = reader.readInt();
    for (let index = 0; index < count; index++) reader.readString();
  } else if (format === 3) {
    reader.readString();
    reader.readInt();
  } else if (format === 5) {
    const count = reader.readInt();
    for (let index = 0; index < count; index++) reader.readInt();
  } else if (format === 6) {
    skipHighScore(reader);
  } else if (format === 7) {
    reader.readString();
    reader.readInt();
    reader.readInt();
  }

  if (flags & 0x100) {
    reader.readInt();
    reader.readInt();
  }
}

function skipHighScore(reader: PacketReader): void {
  const state = reader.readString();
  const nextOffset = reader.offset;
  const nextStringLength = reader.readShort();
  reader.offset = nextOffset;

  if (nextStringLength !== 0) {
    reader.readString();
    reader.readInt();
    reader.readString();
    reader.readString();
    reader.readInt();
    reader.readInt();
    reader.readInt();
    return;
  }

  reader.readInt();
  reader.readShort();
  reader.readShort();
  reader.readInt();
  void state;
}
