import type { PacketComposer } from "../../protocol/types";
import type { WiredDefinition } from "../incoming/WiredDefinitionParser";

type Base = [number, number[], string, number[]];

function base(definition: WiredDefinition, itemId: number, selectedItems: number[]): Base {
  return [itemId, definition.intData, definition.stringData, selectedItems];
}

export class WiredActionSaveComposer implements PacketComposer<unknown[]> {
  constructor(private readonly definition: WiredDefinition, private readonly itemId: number, private readonly selectedItems: number[]) {}
  getMessageArray(): unknown[] {
    return [...base(this.definition, this.itemId, this.selectedItems), this.definition.delayInPulses ?? 0, this.definition.stuffTypeSelectionCode, this.definition.furniSourceTypes, this.definition.userSourceTypes, this.definition.variableIds];
  }
}

export class WiredTriggerSaveComposer implements PacketComposer<unknown[]> {
  constructor(private readonly definition: WiredDefinition, private readonly itemId: number, private readonly selectedItems: number[]) {}
  getMessageArray(): unknown[] {
    return [...base(this.definition, this.itemId, this.selectedItems), this.definition.stuffTypeSelectionCode, this.definition.furniSourceTypes, this.definition.userSourceTypes, this.definition.variableIds];
  }
}

export class WiredConditionSaveComposer implements PacketComposer<unknown[]> {
  constructor(private readonly definition: WiredDefinition, private readonly itemId: number, private readonly selectedItems: number[]) {}
  getMessageArray(): unknown[] {
    return [...base(this.definition, this.itemId, this.selectedItems), this.definition.stuffTypeSelectionCode, this.definition.quantifierCode ?? 0, this.definition.furniSourceTypes, this.definition.userSourceTypes, this.definition.variableIds];
  }
}

export class WiredSelectorSaveComposer implements PacketComposer<unknown[]> {
  constructor(private readonly definition: WiredDefinition, private readonly itemId: number, private readonly selectedItems: number[]) {}
  getMessageArray(): unknown[] {
    return [...base(this.definition, this.itemId, this.selectedItems), this.definition.stuffTypeSelectionCode, Boolean(this.definition.isFilter), Boolean(this.definition.isInvert), this.definition.furniSourceTypes, this.definition.userSourceTypes, this.definition.variableIds];
  }
}

export class WiredAddonSaveComposer implements PacketComposer<unknown[]> {
  constructor(private readonly definition: WiredDefinition, private readonly itemId: number, private readonly selectedItems: number[]) {}
  getMessageArray(): unknown[] {
    return [...base(this.definition, this.itemId, this.selectedItems), this.definition.stuffTypeSelectionCode, this.definition.furniSourceTypes, this.definition.userSourceTypes, this.definition.variableIds];
  }
}

export class WiredVariableSaveComposer implements PacketComposer<unknown[]> {
  constructor(private readonly definition: WiredDefinition, private readonly itemId: number) {}
  getMessageArray(): unknown[] {
    return [this.itemId, this.definition.intData, this.definition.stringData, this.definition.stuffTypeSelectionCode, this.definition.furniSourceTypes, this.definition.userSourceTypes, this.definition.variableIds];
  }
}
