import type { PacketComposer } from "../../protocol/types";

export class UserFigureComposer implements PacketComposer<[string, string]> {
  constructor(private readonly gender: string, private readonly figure: string) {}

  getMessageArray(): [string, string] {
    return [this.gender, this.figure];
  }
}
