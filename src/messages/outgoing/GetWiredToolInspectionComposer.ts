import type { PacketComposer } from "../../protocol/types";

export class GetWiredToolInspectionComposer implements PacketComposer<[number, number]> {
  constructor(private readonly entityType: number, private readonly entityId: number) {}

  getMessageArray(): [number, number] {
    return [this.entityType, this.entityId];
  }
}
