import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface MessengerSearchResult {
  id: number;
  name: string;
  motto: string;
  unknown1: number;
  unknown2: number;
  unknown3: number;
}

export interface MessengerSearch {
  searchType: number;
  resultCount: number;
  users: MessengerSearchResult[];
}

export class MessengerSearchParser implements PacketParser<MessengerSearch> {
  flush(): void {}

  parse(reader: PacketReader): MessengerSearch {
    const searchType = reader.readInt();
    const resultCount = reader.readInt();
    const users: MessengerSearchResult[] = [];

    for (let i = 0; i < resultCount && reader.bytesAvailable; i++) {
      users.push({
        id: reader.readInt(),
        name: reader.readString(),
        motto: reader.readString(),
        unknown1: reader.readInt(),
        unknown2: reader.readInt(),
        unknown3: reader.readInt()
      });
    }

    return { searchType, resultCount, users };
  }
}
