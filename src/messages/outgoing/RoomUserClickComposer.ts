import type { PacketComposer } from "../../protocol/types";

export class RoomUserClickComposer implements PacketComposer<[number]> {
  constructor(private readonly roomIndex: number) {}

  getMessageArray(): [number] {
    return [this.roomIndex];
  }
}
