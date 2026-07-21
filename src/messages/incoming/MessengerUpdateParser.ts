import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface FriendUpdate {
  id: number;
  name: string;
  gender: number;       // 0=M 1=F
  online: boolean;
  followingAllowed: boolean;
  figure: string;       // empty string when offline
  categoryId: number;
  motto: string;
  realName: string;
  lastAccess: string;
  persistedMessageUser: boolean;
  vipMember: boolean;
  pocketHabboUser: boolean;
  relationshipStatus: number;
}

export interface MessengerUpdate {
  removedIds: number[];
  friends: FriendUpdate[];
}

// Shared with MessengerFriendsParser (3130) — both wire formats embed the exact same
// per-friend field sequence (ported from Nitro's FriendParser).
export function parseFriendUpdate(reader: PacketReader): FriendUpdate {
  const id                   = reader.readInt();
  const name                 = reader.readString();
  const gender                = reader.readInt();
  const online               = reader.readBoolean();
  const followingAllowed     = reader.readBoolean();
  const figure               = reader.readString();
  const categoryId           = reader.readInt();
  const motto                = reader.readString();
  const realName             = reader.readString();
  const lastAccess           = reader.readString();
  const persistedMessageUser = reader.readBoolean();
  const vipMember            = reader.readBoolean();
  const pocketHabboUser      = reader.readBoolean();
  const relationshipStatus   = reader.readShort();
  return { id, name, gender, online, followingAllowed, figure,
    categoryId, motto, realName, lastAccess,
    persistedMessageUser, vipMember, pocketHabboUser, relationshipStatus };
}

export class MessengerUpdateParser implements PacketParser<MessengerUpdate> {
  flush(): void {}
  parse(reader: PacketReader): MessengerUpdate {
    const catCount = reader.readInt();
    for (let i = 0; i < catCount; i++) {
      reader.readInt();
      reader.readString();
    }

    const updateCount = reader.readInt();
    const removedIds: number[] = [];
    const friends: FriendUpdate[] = [];

    for (let i = 0; i < updateCount && reader.bytesAvailable; i++) {
      const type = reader.readInt();
      if (type === -1) {
        removedIds.push(reader.readInt());
      } else {
        friends.push(parseFriendUpdate(reader));
      }
    }

    return { removedIds, friends };
  }
}
