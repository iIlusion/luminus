import type { PacketComposer } from "../../protocol/types";

export class RoomConstructionToolComposer implements PacketComposer<unknown[]> {
  constructor(private readonly values: unknown[]) {}

  getMessageArray(): unknown[] {
    return this.values;
  }
}
