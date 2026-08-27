import type { PacketComposer } from "../../protocol/types";

export class RoomModelSaveComposer implements PacketComposer<[string, number, number, number, number, number, number]> {
  constructor(private readonly values: [string, number, number, number, number, number, number]) {}

  getMessageArray(): [string, number, number, number, number, number, number] {
    return this.values;
  }
}
