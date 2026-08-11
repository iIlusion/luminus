import type { PacketComposer } from "../../protocol/types";

export class RoomUnitSignComposer implements PacketComposer<[number]> {
  constructor(private readonly signId: number) {}

  getMessageArray(): [number] {
    return [this.signId];
  }
}
