import type { PacketComposer } from "../../protocol/types";

/** Outgoing 1117 — native client ignore/mute by username. */
export class UserIgnoreComposer implements PacketComposer<[string]> {
  constructor(private readonly username: string) {}

  getMessageArray(): [string] {
    return [this.username];
  }
}
