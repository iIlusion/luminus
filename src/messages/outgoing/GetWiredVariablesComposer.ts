import type { PacketComposer } from "../../protocol/types";

export class GetWiredVariablesComposer implements PacketComposer<[number]> {
  constructor(private readonly itemId: number) {}

  getMessageArray(): [number] {
    return [this.itemId];
  }
}
