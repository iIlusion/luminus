import { IncomingHeader } from "./IncomingHeader";
import { OutgoingHeader } from "./OutgoingHeader";

function buildLookup(cls: object): Map<number, string> {
  const map = new Map<number, string>();
  for (const [name, value] of Object.entries(cls)) {
    if (typeof value === "number" && value >= 0) map.set(value, name);
  }
  return map;
}

export const incomingHeaderNames = buildLookup(IncomingHeader);
export const outgoingHeaderNames = buildLookup(OutgoingHeader);
