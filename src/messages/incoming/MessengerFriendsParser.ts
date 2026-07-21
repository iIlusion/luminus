import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";
import { type FriendUpdate, parseFriendUpdate } from "./MessengerUpdateParser";

// Login-time friend roster snapshot (Nitro: FriendListFragmentParser). Sent as one or more
// fragments — accumulate by fragmentNumber until fragmentNumber === totalFragments - 1.
export interface MessengerFriends {
  totalFragments: number;
  fragmentNumber: number;
  friends: FriendUpdate[];
}

export class MessengerFriendsParser implements PacketParser<MessengerFriends> {
  flush(): void {}
  parse(reader: PacketReader): MessengerFriends {
    const totalFragments = reader.readInt();
    const fragmentNumber = reader.readInt();
    const friendCount = reader.readInt();

    const friends: FriendUpdate[] = [];
    for (let i = 0; i < friendCount && reader.bytesAvailable; i++) {
      friends.push(parseFriendUpdate(reader));
    }

    return { totalFragments, fragmentNumber, friends };
  }
}
