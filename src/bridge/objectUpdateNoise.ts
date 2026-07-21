import type { ObjectDataUpdate } from "../messages/incoming/ObjectsDataUpdateParser";

const LEARNING_MS = 10_000;
const startedAt = Date.now();
const idleObjectIds = new Set<number>();

export function filterObjectUpdateNoise(updates: ObjectDataUpdate[], canLearn: boolean): ObjectDataUpdate[] {
  if (canLearn && Date.now() - startedAt <= LEARNING_MS) {
    for (const update of updates) idleObjectIds.add(update.id);
    return [];
  }
  return updates.filter((update) => !idleObjectIds.has(update.id));
}
