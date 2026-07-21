import type { PacketComposer } from "../../protocol/types";

export class UserProfileComposer implements PacketComposer<[number]> {
  constructor(private readonly userId: number) {}

  getMessageArray(): [number] {
    return [this.userId];
  }
}
