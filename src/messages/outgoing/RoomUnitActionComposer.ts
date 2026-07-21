import type { PacketComposer } from "../../protocol/types";

export class RoomUnitActionComposer implements PacketComposer<[number]> {
  constructor(private readonly actionType: number) {}

  getMessageArray(): [number] {
    return [this.actionType];
  }
}
