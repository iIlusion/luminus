import type { Myself } from "../messages/incoming/UserObjectParser";
import { RoomUnitWalkComposer } from "../messages/outgoing/RoomUnitWalkComposer";
import { RoomUnitActionComposer } from "../messages/outgoing/RoomUnitActionComposer";
import { UserFigureComposer } from "../messages/outgoing/UserFigureComposer";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import { RoomUnitWhisperComposer } from "../messages/outgoing/RoomUnitWhisperComposer";
import { UserIgnoreComposer } from "../messages/outgoing/UserIgnoreComposer";
import { UserUnignoreComposer } from "../messages/outgoing/UserUnignoreComposer";
import { RoomEntryTileComposer } from "../messages/outgoing/RoomEntryTileComposer";
import { RoomModelSaveComposer } from "../messages/outgoing/RoomModelSaveComposer";
import { FurniturePlaceComposer } from "../messages/outgoing/FurniturePlaceComposer";
import { RoomConstructionToolComposer } from "../messages/outgoing/RoomConstructionToolComposer";
import { FurnitureInventoryComposer } from "../messages/outgoing/FurnitureInventoryComposer";
import { ProductOfferComposer } from "../messages/outgoing/ProductOfferComposer";
import { CatalogPurchaseComposer } from "../messages/outgoing/CatalogPurchaseComposer";
import { GetCatalogPageComposer } from "../messages/outgoing/GetCatalogPageComposer";
import { RoomModelComposer } from "../messages/outgoing/RoomModelComposer";
import { FurnitureMultiStateComposer } from "../messages/outgoing/FurnitureMultiStateComposer";
import { WiredActionSaveComposer, WiredAddonSaveComposer, WiredConditionSaveComposer, WiredSelectorSaveComposer, WiredTriggerSaveComposer, WiredVariableSaveComposer } from "../messages/outgoing/WiredSaveComposers";
import { GetWiredVariablesComposer } from "../messages/outgoing/GetWiredVariablesComposer";
import { GetWiredToolInspectionComposer } from "../messages/outgoing/GetWiredToolInspectionComposer";
import { FurnitureClickComposer } from "../messages/outgoing/FurnitureClickComposer";
import { FurniturePickupComposer } from "../messages/outgoing/FurniturePickupComposer";
import type { PacketComposer, PacketHandler } from "../protocol/types";
import { PacketBridge } from "./PacketBridge";
import { readPref, writePref } from "../util/prefs";
import type { MuteAllState } from "../room/muteAll";
import type { FurniClassHideState } from "../room/furniClassHide";
import type { AchievementData } from "../messages/incoming/AchievementsParser";
import type { BadgePointLimit } from "../messages/incoming/BadgePointLimitsParser";
import type { BadgeProgress, LevelThreshold } from "../achievements/achievementStore";
import { runChatBetaDiag } from "../diag/chatBetaDiag";
import { chatStressApi, runChatThreadStress } from "../diag/chatStress";
import { runNitroWeightProbe } from "../diag/nitroWeightProbe";
import { createFurnitureDataApi, type FurnitureDataApi } from "../room/furnitureData";
import type { RoomPickApi } from "../room/roomPick";
import {
  abortCatalogThumbBake,
  bakeCatalogThumbs,
  getCatalogThumbBakeProgress,
  type BakeCatalogThumbOptions,
} from "../ui/catalogThumbBakeDev";
import {
  clearCatalogThumbAssetCache,
  getCatalogThumbBaseUrl,
  setCatalogThumbDevBaseUrl,
} from "../ui/catalogThumbAssets";

type SendTarget = number | string | PacketComposer;

export interface LuminusApi {
  myself: Myself | null;
  room: PacketBridge["room"];
  furnitureData: FurnitureDataApi;
  roomPick?: RoomPickApi;
  bridge: PacketBridge;
  onIncoming(header: number, handler: PacketHandler): () => void;
  onOutgoing(header: number, handler: PacketHandler): () => void;
  onPacket(listener: Parameters<PacketBridge["onPacket"]>[0]): () => void;
  socket: WebSocket | null;
  send(headerOrComposer: SendTarget, values?: unknown[]): boolean;
  send(socket: WebSocket, headerOrComposer: SendTarget, values?: unknown[]): boolean;
  blockIncoming(header: number, predicate?: Parameters<PacketBridge["blockIncoming"]>[1]): () => void;
  blockOutgoing(header: number, predicate?: Parameters<PacketBridge["blockOutgoing"]>[1]): () => void;
  setFigure(gender: string, figure: string): boolean;
  getOffsets(): ReturnType<PacketBridge["getOffsets"]>;
  setOffsets(offsets: Parameters<PacketBridge["setOffsets"]>[0]): void;
  registry: PacketBridge["registry"];
  composers: {
    RoomUnitWalk: typeof RoomUnitWalkComposer;
    RoomUnitAction: typeof RoomUnitActionComposer;
    UserFigure: typeof UserFigureComposer;
    RoomUnitChat: typeof RoomUnitChatComposer;
    RoomUnitWhisper: typeof RoomUnitWhisperComposer;
    UserIgnore: typeof UserIgnoreComposer;
    UserUnignore: typeof UserUnignoreComposer;
    RoomEntryTile: typeof RoomEntryTileComposer;
    RoomModelSave: typeof RoomModelSaveComposer;
    FurniturePlace: typeof FurniturePlaceComposer;
    RoomConstructionTool: typeof RoomConstructionToolComposer;
    FurnitureInventory: typeof FurnitureInventoryComposer;
    ProductOffer: typeof ProductOfferComposer;
    CatalogPurchase: typeof CatalogPurchaseComposer;
    GetCatalogPage: typeof GetCatalogPageComposer;
    RoomModel: typeof RoomModelComposer;
    FurnitureMultiState: typeof FurnitureMultiStateComposer;
    WiredActionSave: typeof WiredActionSaveComposer;
    WiredConditionSave: typeof WiredConditionSaveComposer;
    WiredTriggerSave: typeof WiredTriggerSaveComposer;
    WiredSelectorSave: typeof WiredSelectorSaveComposer;
    WiredAddonSave: typeof WiredAddonSaveComposer;
    WiredVariableSave: typeof WiredVariableSaveComposer;
    GetWiredVariables: typeof GetWiredVariablesComposer;
    GetWiredToolInspection: typeof GetWiredToolInspectionComposer;
    FurnitureClick: typeof FurnitureClickComposer;
    FurniturePickup: typeof FurniturePickupComposer;
  };
  muteAll?: {
    getState(): MuteAllState;
    subscribe(listener: (state: MuteAllState) => void): () => void;
    setEnabled(on: boolean): void;
    setHideAvatars(on: boolean): void;
    setShowMuteIcons(on: boolean): void;
    addWhitelist(name: string): void;
    removeWhitelist(name: string): void;
    muteUser(name: string): void;
    desmuteUser(name: string): void;
    isNameMuted(name: string): boolean;
  };
  /** Session hide of furniture classes (infostand eye + Mobis chooser). */
  furniClassHide?: {
    getState(): FurniClassHideState;
    subscribe(listener: (state: FurniClassHideState) => void): () => void;
    setEnabled(on: boolean): void;
    hideFocused(): boolean;
    showHidden(): void;
    isFocusHidden(): boolean;
    isTypeHidden(type: string | null | undefined): boolean;
    toggleType(type: string, label?: string | null): boolean;
    hideType(type: string, label?: string | null): boolean;
    showType(type: string): boolean;
  };
  achievements?: {
    list(): BadgeProgress[];
    get(badgeIdOrBase: string): BadgeProgress | null;
    getLevelTable(badgeIdOrBase: string): LevelThreshold[];
    fetch(timeoutMs?: number): Promise<AchievementData[]>;
    fetchPointLimits(timeoutMs?: number): Promise<BadgePointLimit[]>;
    fetchAll(timeoutMs?: number): Promise<{
      progress: BadgeProgress[];
      tables: Record<string, LevelThreshold[]>;
    }>;
    subscribe(listener: (entries: BadgeProgress[]) => void): () => void;
  };
  debug: {
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    isParsedOnly(): boolean;
    setParsedOnly(enabled: boolean): void;
    /** Captura avatar + efeito/handitem numa room de preview isolada. */
    bakeCatalogThumbs(options?: BakeCatalogThumbOptions): Promise<{
      running: boolean;
      done: number;
      total: number;
      currentKind: "enable" | "handitem" | null;
      currentId: number | null;
      ready: number;
      unavailable: number;
      failed: number;
      message: string;
    }>;
    catalogThumbBakeProgress(): {
      running: boolean;
      done: number;
      total: number;
      currentKind: "enable" | "handitem" | null;
      currentId: number | null;
      ready: number;
      unavailable: number;
      failed: number;
      message: string;
    };
    abortCatalogThumbBake(): void;
    setCatalogThumbBaseUrl(url: string | null): void;
    getCatalogThumbBaseUrl(): string | null;
    clearCatalogThumbCache(): void;
  };
  // Gates the panel's Packets/Debug tabs — callable as Luminus.toggleDevMode().
  toggleDevMode(): boolean;
  runChatBetaDiag(options?: { leaveOpen?: boolean }): Promise<unknown>;
  runChatThreadStress(options?: {
    peer?: string;
    seedCount?: number;
    streamMs?: number;
    streamIntervalMs?: number;
    loadAllVisible?: boolean;
    probeMs?: number;
    samples?: number;
    keepSeed?: boolean;
  }): Promise<unknown>;
  chatStress: typeof chatStressApi;
  runNitroWeightProbe(options?: { frameSampleMs?: number; quick?: boolean }): Promise<unknown>;
}

export function createApi(bridge: PacketBridge): LuminusApi {
  const api: LuminusApi = {
    get myself() {
      return bridge.myself;
    },
    get room() {
      return bridge.room;
    },
    get socket() {
      return bridge.getSocket();
    },
    bridge,
    furnitureData: createFurnitureDataApi(),
    onIncoming: bridge.onIncoming.bind(bridge),
    onOutgoing: bridge.onOutgoing.bind(bridge),
    onPacket: bridge.onPacket.bind(bridge),
    send: bridge.send.bind(bridge),
    blockIncoming: bridge.blockIncoming.bind(bridge),
    blockOutgoing: bridge.blockOutgoing.bind(bridge),
    setFigure(gender: string, figure: string): boolean {
      const ok = bridge.send(new UserFigureComposer(gender, figure));
      if (ok && bridge.myself) {
        bridge.myself.figure = figure;
        bridge.myself.gender = gender;
        const unit = bridge.myself.index == null ? undefined : bridge.room.units.get(bridge.myself.index);
        if (unit) {
          unit.figure = figure;
          unit.sex = gender.toUpperCase();
          unit.gender = gender.toUpperCase();
        }
      }
      return ok;
    },
    getOffsets: bridge.getOffsets.bind(bridge),
    setOffsets: bridge.setOffsets.bind(bridge),
    registry: bridge.registry,
    composers: {
      RoomUnitWalk: RoomUnitWalkComposer,
      RoomUnitAction: RoomUnitActionComposer,
      UserFigure: UserFigureComposer,
      RoomUnitChat: RoomUnitChatComposer,
      RoomUnitWhisper: RoomUnitWhisperComposer,
      UserIgnore: UserIgnoreComposer,
      UserUnignore: UserUnignoreComposer,
      RoomEntryTile: RoomEntryTileComposer,
      RoomModelSave: RoomModelSaveComposer,
      FurniturePlace: FurniturePlaceComposer,
      RoomConstructionTool: RoomConstructionToolComposer,
      FurnitureInventory: FurnitureInventoryComposer,
      ProductOffer: ProductOfferComposer,
      CatalogPurchase: CatalogPurchaseComposer,
      GetCatalogPage: GetCatalogPageComposer,
      RoomModel: RoomModelComposer,
      FurnitureMultiState: FurnitureMultiStateComposer,
      GetWiredVariables: GetWiredVariablesComposer,
      GetWiredToolInspection: GetWiredToolInspectionComposer,
      FurnitureClick: FurnitureClickComposer,
      FurniturePickup: FurniturePickupComposer,
      WiredActionSave: WiredActionSaveComposer,
      WiredConditionSave: WiredConditionSaveComposer,
      WiredTriggerSave: WiredTriggerSaveComposer,
      WiredSelectorSave: WiredSelectorSaveComposer,
      WiredAddonSave: WiredAddonSaveComposer,
      WiredVariableSave: WiredVariableSaveComposer,
    },
    debug: {
      isEnabled: bridge.getDebug.bind(bridge),
      setEnabled: bridge.setDebug.bind(bridge),
      isParsedOnly: bridge.getLogParsedOnly.bind(bridge),
      setParsedOnly: bridge.setLogParsedOnly.bind(bridge),
      bakeCatalogThumbs: (options) => bakeCatalogThumbs(api, options),
      catalogThumbBakeProgress: getCatalogThumbBakeProgress,
      abortCatalogThumbBake,
      setCatalogThumbBaseUrl: setCatalogThumbDevBaseUrl,
      getCatalogThumbBaseUrl,
      clearCatalogThumbCache: clearCatalogThumbAssetCache,
    },
    toggleDevMode(): boolean {
      const enabled = !readPref("luminus.devMode", false);
      writePref("luminus.devMode", enabled);
      console.log(`[Luminus] devMode ${enabled ? "ativado" : "desativado"} — recarregue a página.`);
      return enabled;
    },
    runChatBetaDiag,
    runChatThreadStress,
    chatStress: chatStressApi,
    runNitroWeightProbe,
  };
  return api;
}
