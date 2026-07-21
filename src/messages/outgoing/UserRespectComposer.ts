import type { PacketComposer } from "../../protocol/types";

export class UserRespectComposer implements PacketComposer<[number]> {
  constructor(private readonly userId: number) {}

  getMessageArray(): [number] {
    return [this.userId];
  }
}
