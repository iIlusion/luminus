import type { PacketComposer } from "../../protocol/types";

export class RoomUnitChatComposer implements PacketComposer<[string, number, number]> {
  constructor(
    private readonly message: string,
    private readonly colorId = 0,
    private readonly styleId = 0
  ) {}

  getMessageArray(): [string, number, number] {
    return [this.message, this.colorId, this.styleId];
  }
}
