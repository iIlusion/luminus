import type { PacketComposer } from "../../protocol/types";

/** Outgoing 3314 — native client ignore/mute by user id. */
export class UserIgnoreIdComposer implements PacketComposer<[number]> {
  constructor(private readonly userId: number) {}

  getMessageArray(): [number] {
    return [this.userId];
  }
}
