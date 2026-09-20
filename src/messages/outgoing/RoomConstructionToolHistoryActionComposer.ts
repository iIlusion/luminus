import type { PacketComposer } from "../../protocol/types";

export class RoomConstructionToolHistoryActionComposer implements PacketComposer<unknown[]> {
  constructor(private readonly values: unknown[]) {}

  getMessageArray(): unknown[] {
    return this.values;
  }
}
