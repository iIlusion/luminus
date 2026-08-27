import type { PacketParser } from "../../protocol/types";
import type { PacketReader } from "../../protocol/wrapper";

export type WiredDefinitionKind = "action" | "condition" | "trigger" | "selector" | "addon" | "variable";

export interface WiredInputSources {
  furniSelections: number[][];
  userSelections: number[][];
  defaultFurniSources: number[];
  defaultUserSources: number[];
}

export interface WiredDefinition {
  kind: WiredDefinitionKind;
  stuffTypeSelectionEnabled: boolean;
  maximumItemSelectionCount: number;
  selectedItems: number[];
  spriteId: number;
  id: number;
  stringData: string;
  intData: number[];
  variableIds: number[];
  furniSourceTypes: number[];
  userSourceTypes: number[];
  stuffTypeSelectionCode: number;
  inputSources: WiredInputSources;
  type?: number;
  delayInPulses?: number;
  conflictingTriggers?: number[];
  conflictingActions?: number[];
  quantifierType?: number;
  quantifierCode?: number;
  isInvert?: boolean;
  isFilter?: boolean;
  inspectionCurrentValue?: string;
}

export class WiredDefinitionParser implements PacketParser<WiredDefinition> {
  constructor(private readonly kind: WiredDefinitionKind) {}

  flush(): void {}

  parse(reader: PacketReader): WiredDefinition {
    const definition: WiredDefinition = {
      kind: this.kind,
      stuffTypeSelectionEnabled: reader.readBoolean(),
      maximumItemSelectionCount: reader.readInt(),
      selectedItems: readIntArray(reader),
      spriteId: reader.readInt(),
      id: reader.readInt(),
      stringData: reader.readString(),
      intData: readIntArray(reader),
      variableIds: readLongArray(reader),
      furniSourceTypes: readIntArray(reader),
      userSourceTypes: readIntArray(reader),
      stuffTypeSelectionCode: reader.readInt(),
      inputSources: {
        furniSelections: readNestedIntArray(reader),
        userSelections: readNestedIntArray(reader),
        defaultFurniSources: readIntArray(reader),
        defaultUserSources: readIntArray(reader),
      },
    };

    if (this.kind === "action") {
      definition.type = reader.readInt();
      definition.delayInPulses = reader.readInt();
      definition.conflictingTriggers = readIntArray(reader);
    } else if (this.kind === "trigger") {
      definition.type = reader.readInt();
      definition.conflictingActions = readIntArray(reader);
    } else if (this.kind === "condition") {
      definition.type = reader.readInt();
      definition.quantifierType = reader.readInt();
      definition.quantifierCode = reader.readInt();
      definition.isInvert = reader.readBoolean();
    } else if (this.kind === "selector") {
      definition.type = reader.readInt();
      definition.isFilter = reader.readBoolean();
      definition.isInvert = reader.readBoolean();
    } else if (this.kind === "addon") {
      definition.type = reader.readInt();
    } else {
      definition.type = reader.readInt();
      definition.inspectionCurrentValue = reader.readString();
    }

    return definition;
  }
}

export class WiredActionParser extends WiredDefinitionParser { constructor() { super("action"); } }
export class WiredConditionParser extends WiredDefinitionParser { constructor() { super("condition"); } }
export class WiredTriggerParser extends WiredDefinitionParser { constructor() { super("trigger"); } }
export class WiredSelectorParser extends WiredDefinitionParser { constructor() { super("selector"); } }
export class WiredAddonParser extends WiredDefinitionParser { constructor() { super("addon"); } }
export class WiredVariableParser extends WiredDefinitionParser { constructor() { super("variable"); } }

function readIntArray(reader: PacketReader): number[] {
  const count = reader.readInt();
  const values: number[] = [];
  for (let index = 0; index < count; index++) values.push(reader.readInt());
  return values;
}

function readLongArray(reader: PacketReader): number[] {
  const count = reader.readInt();
  const values: number[] = [];
  for (let index = 0; index < count; index++) values.push(reader.readLong());
  return values;
}

function readNestedIntArray(reader: PacketReader): number[][] {
  const count = reader.readInt();
  const values: number[][] = [];
  for (let index = 0; index < count; index++) values.push(readIntArray(reader));
  return values;
}
