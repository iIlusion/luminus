import type { PacketComposer } from "../../protocol/types";

export class NativeGroupWhisperMemberComposer implements PacketComposer<[string]> {
  constructor(private readonly name: string) {}

  getMessageArray(): [string] {
    return [this.name.trim()];
  }
}
