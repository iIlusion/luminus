import type { PacketComposer } from "../../protocol/types";

export class RoomUnitLookComposer implements PacketComposer<[number, number]> {
  constructor(private readonly x: number, private readonly y: number) {}

  getMessageArray(): [number, number] {
    return [this.x, this.y];
  }
}
