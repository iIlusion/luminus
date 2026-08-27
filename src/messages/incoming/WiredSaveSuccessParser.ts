import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export interface WiredSaveSuccess {
  ok: true;
}

export class WiredSaveSuccessParser implements PacketParser<WiredSaveSuccess> {
  flush(): void {}

  parse(_reader: PacketReader): WiredSaveSuccess {
    return { ok: true };
  }
}
