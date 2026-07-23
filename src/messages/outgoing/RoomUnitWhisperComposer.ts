import type { PacketComposer } from "../../protocol/types";

export class RoomUnitWhisperComposer implements PacketComposer<[string]> {
  constructor(
    private readonly recipient: string,
    private readonly message: string
  ) {}

  getMessageArray(): [string] {
    return [`${this.recipient.trim()} ${this.message.trim()}`];
  }
}
