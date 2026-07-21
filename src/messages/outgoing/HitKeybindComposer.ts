import type { PacketComposer } from "../../protocol/types";

/**
 * Habblet Nitro HIT_KEYBIND (logical 365).
 * ArrowUp/Right/Down/Left/Space/Ctrl/Alt/Shift map to keybind ids 1–8
 * (wired "keybind selection"), not avatar walk.
 */
export class HitKeybindComposer implements PacketComposer<[number]> {
  constructor(private readonly keybindId: number) {}

  getMessageArray(): [number] {
    return [this.keybindId];
  }
}
