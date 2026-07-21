import type { PacketComposer } from "../../protocol/types";

export class HabboSearchComposer implements PacketComposer<[string]> {
  constructor(private readonly query: string) {}

  getMessageArray(): [string] {
    return [this.query];
  }
}
