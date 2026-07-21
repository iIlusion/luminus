import type { Myself } from "../messages/incoming/UserObjectParser";
import { RoomUnitWalkComposer } from "../messages/outgoing/RoomUnitWalkComposer";
import { RoomUnitActionComposer } from "../messages/outgoing/RoomUnitActionComposer";
import { UserFigureComposer } from "../messages/outgoing/UserFigureComposer";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import { UserIgnoreComposer } from "../messages/outgoing/UserIgnoreComposer";
import { UserUnignoreComposer } from "../messages/outgoing/UserUnignoreComposer";
import type { PacketComposer, PacketHandler } from "../protocol/types";
import { PacketBridge } from "./PacketBridge";
import { readPref, writePref } from "../util/prefs";
import type { MuteAllState } from "../room/muteAll";

type SendTarget = number | string | PacketComposer;

export interface LuminusApi {
  myself: Myself | null;
  room: PacketBridge["room"];
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
    UserIgnore: typeof UserIgnoreComposer;
    UserUnignore: typeof UserUnignoreComposer;
  };
  muteAll?: {
    getState(): MuteAllState;
    subscribe(listener: (state: MuteAllState) => void): () => void;
    setEnabled(on: boolean): void;
    setHideAvatars(on: boolean): void;
    addWhitelist(name: string): void;
    removeWhitelist(name: string): void;
    muteUser(name: string): void;
    desmuteUser(name: string): void;
    isNameMuted(name: string): boolean;
  };
  debug: {
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    isParsedOnly(): boolean;
    setParsedOnly(enabled: boolean): void;
  };
  // Gates the panel's Packets/Debug tabs — callable as Luminus.toggleDevMode().
  toggleDevMode(): boolean;
}

export function createApi(bridge: PacketBridge): LuminusApi {
  return {
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
      UserIgnore: UserIgnoreComposer,
      UserUnignore: UserUnignoreComposer,
    },
    debug: {
      isEnabled: bridge.getDebug.bind(bridge),
      setEnabled: bridge.setDebug.bind(bridge),
      isParsedOnly: bridge.getLogParsedOnly.bind(bridge),
      setParsedOnly: bridge.setLogParsedOnly.bind(bridge)
    },
    toggleDevMode(): boolean {
      const enabled = !readPref("luminus.devMode", false);
      writePref("luminus.devMode", enabled);
      console.log(`[Luminus] devMode ${enabled ? "ativado" : "desativado"} — recarregue a página.`);
      return enabled;
    }
  };
}
