import type { PacketComposer } from "../../protocol/types";

export class RoomUnitWalkComposer implements PacketComposer<[number, number]> {
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {}

  getMessageArray(): [number, number] {
    return [this.x, this.y];
  }
}
