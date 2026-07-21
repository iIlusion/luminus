import type { PacketComposer } from "../../protocol/types";

/** Outgoing 2061 — native client unignore/unmute by username. */
export class UserUnignoreComposer implements PacketComposer<[string]> {
  constructor(private readonly username: string) {}

  getMessageArray(): [string] {
    return [this.username];
  }
}
