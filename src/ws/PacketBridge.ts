import { EvaWireCodec, toArrayBuffer } from "../protocol/codec";
import {
  applyHeaderOffset,
  normalizeHeader,
  readProxyHandshakeOffsets,
  type HeaderOffsets
} from "../protocol/headerOffsets";
import { incomingHeaderNames, outgoingHeaderNames } from "../protocol/headerLookup";
import { previewPacketBody } from "../protocol/preview";
import type {
  DecodedPacket,
  PacketDecision,
  PacketDirection,
  PacketHandler,
  PacketHandlerContext,
  PacketOrigin
} from "../protocol/types";
import { packetRegistry, PacketRegistry } from "../messages/registry";
import type { Myself, UserObject } from "../messages/incoming/UserObjectParser";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { RoomUnitUpdate } from "../messages/incoming/UserUpdateParser";
import type { RoomUnitInfo } from "../messages/incoming/RoomUnitInfoParser";
import type { FigureUpdate } from "../messages/incoming/FigureUpdateParser";
import type { FurnitureFloor } from "../messages/incoming/FurnitureFloorParser";
import type { FurnitureFloorAdd } from "../messages/incoming/FurnitureFloorAddParser";
import type { GuestRoomData, RoomEntryInfo, RoomReady } from "../messages/incoming/RoomParsers";
import type { ObjectDataUpdate } from "../messages/incoming/ObjectsDataUpdateParser";
import type { RoomModelData } from "../messages/incoming/RoomModelParser";
import type { RoomEntryTile } from "../messages/incoming/RoomEntryTileParser";
import type { RoomThickness } from "../messages/incoming/RoomThicknessParser";
import type { WiredDefinition } from "../messages/incoming/WiredDefinitionParser";
import { findLinkInMotto } from "../links/linkDomains";
import { rememberLink, removePerson } from "../links/linkStore";
import { isSocketLike, isSocketOpen } from "./socketContract";
import {
  createRoomStore,
  addRoomFurni,
  classifyUserRemove,
  createRoomEnterGuard,
  enterRoom,
  markRoomEnter,
  noteEnterRoster,
  resetRoomStore,
  setRoomFurnis,
  updateRoomFurniStates,
  updateRoomUnits,
  upsertRoomUnits,
  type RoomStore
} from "../room/roomStore";
import { isUsersPacketReplay } from "../room/muteAll";

interface PacketAction {
  action: "pass" | "block" | "defer" | "replace";
  data?: ArrayBuffer;
}

type SendTarget = number | string | { getMessageArray(): unknown[] };

export class PacketBridge {
  readonly registry: PacketRegistry;

  private readonly codec = new EvaWireCodec();
  private readonly incomingHandlers = new Map<number, Set<PacketHandler>>();
  private readonly outgoingHandlers = new Map<number, Set<PacketHandler>>();
  private readonly outgoingDeferrers = new Map<number, (data: ArrayBuffer, packet: DecodedPacket) => void>();
  private readonly packetListeners = new Set<(packet: DecodedPacket) => void>();
  private debug = true;
  private logParsedOnly = false;
  private offsets: HeaderOffsets = { incoming: null, outgoing: null };
  private socket: WebSocket | null = null;
  private nativeSend: ((data: Parameters<WebSocket["send"]>[0]) => void) | null = null;
  myself: Myself | null = null;
  room: RoomStore = createRoomStore();
  private readonly enterGuard = createRoomEnterGuard();
  private expectHotelView = false;

  constructor(registry = packetRegistry) {
    this.registry = registry;
  }

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  getDebug(): boolean {
    return this.debug;
  }

  setLogParsedOnly(enabled: boolean): void {
    this.logParsedOnly = enabled;
  }

  getLogParsedOnly(): boolean {
    return this.logParsedOnly;
  }

  getOffsets(): HeaderOffsets {
    return { ...this.offsets };
  }

  setOffsets(offsets: Partial<HeaderOffsets>): void {
    this.offsets = { ...this.offsets, ...offsets };
    this.debugLog("[Luminus] Header offsets definidos:", this.offsets);
  }

  onIncoming(header: number, handler: PacketHandler): () => void {
    return this.addHandler(this.incomingHandlers, header, handler);
  }

  onOutgoing(header: number, handler: PacketHandler): () => void {
    return this.addHandler(this.outgoingHandlers, header, handler);
  }

  blockIncoming(header: number, predicate?: (packet: DecodedPacket) => boolean): () => void {
    return this.onIncoming(header, ({ packet }) => {
      if (!predicate || predicate(packet)) return "block";
    });
  }

  blockOutgoing(header: number, predicate?: (packet: DecodedPacket) => boolean): () => void {
    return this.onOutgoing(header, ({ packet, origin }) => {
      if (origin !== "client") return;
      if (!predicate || predicate(packet)) return "block";
    });
  }

  deferOutgoing(header: number, defer: (data: ArrayBuffer, packet: DecodedPacket) => void): () => void {
    this.outgoingDeferrers.set(header, defer);
    return () => { if (this.outgoingDeferrers.get(header) === defer) this.outgoingDeferrers.delete(header); };
  }

  // Fires for every decoded packet regardless of header (unlike onIncoming/onOutgoing, which
  // are per-header). Used by the MCP packet-capture ring buffer.
  onPacket(listener: (packet: DecodedPacket) => void): () => void {
    this.packetListeners.add(listener);
    return () => this.packetListeners.delete(listener);
  }

  setSocket(socket: WebSocket): void {
    this.socket = socket;
  }

  setNativeSend(fn: (data: Parameters<WebSocket["send"]>[0]) => void): void {
    this.nativeSend = fn;
  }

  getSocket(): WebSocket | null {
    return this.socket;
  }

  send(headerOrComposer: SendTarget, values?: unknown[]): boolean;
  send(socket: WebSocket, headerOrComposer: SendTarget, values?: unknown[]): boolean;
  send(socketOrHeader: WebSocket | SendTarget, headerOrValues?: SendTarget | unknown[], maybeValues?: unknown[]): boolean {
    const socket = isSocketLike(socketOrHeader) ? socketOrHeader : this.socket;
    const headerOrComposer = isSocketLike(socketOrHeader) ? headerOrValues as SendTarget : socketOrHeader;
    const values = isSocketLike(socketOrHeader) ? maybeValues : headerOrValues as unknown[] | undefined;

    if (!socket || !headerOrComposer) return false;

    const data = this.registry.compose(headerOrComposer, values);
    if (!data || !isSocketOpen(socket)) return false;

    const encoded = this.encodeOutgoing(data);
    const result = this.handleOutgoing(socket, encoded, "script");
    if (result.action === "block") return false;
    if (result.action === "defer") return true;

    const outgoing = result.action === "replace" && result.data ? result.data : encoded;
    if (this.nativeSend) this.nativeSend(outgoing);
    else socket.send(outgoing);
    return true;
  }

  handleOutgoing(
    socket: WebSocket,
    data: Parameters<WebSocket["send"]>[0],
    origin: "client" | "script" = "client"
  ): PacketAction {
    if (!isBinary(data)) return { action: "pass" };
    return this.handlePackets(socket, "outgoing", toArrayBuffer(data), origin);
  }

  handleIncoming(socket: WebSocket, data: unknown): PacketAction {
    if (!isBinary(data)) return { action: "pass" };
    return this.handlePackets(socket, "incoming", toArrayBuffer(data), "server");
  }

  sendQueuedRaw(data: ArrayBuffer): boolean {
    if (!this.socket || !isSocketOpen(this.socket) || !this.nativeSend) return false;
    try {
      this.nativeSend(data);
      return true;
    } catch {
      return false;
    }
  }

  private handlePackets(
    socket: WebSocket,
    direction: PacketDirection,
    data: ArrayBuffer,
    origin: PacketOrigin
  ): PacketAction {
    if (direction === "incoming" && this.tryReadHandshake(data)) return { action: "pass" };

    let packets: DecodedPacket[];

    try {
      packets = this.decode(direction, data);
    } catch (error) {
      this.debugWarn("[Luminus] Packet decode falhou:", direction, error);
      return { action: "pass" };
    }

    if (!packets.length) return { action: "pass" };

    for (const packet of packets) {
      this.updateState(packet);
      this.logPacket(packet);
      for (const listener of this.packetListeners) listener(packet);

      const decision = this.runHandlers(socket, direction, packet, origin);
      if (decision === "block") return { action: "block" };
      if (typeof decision === "object" && decision.action === "replace") {
        return { action: "replace", data: decision.data };
      }
      const defer = direction === "outgoing" ? this.outgoingDeferrers.get(packet.header) : undefined;
      if (defer) {
        defer(packet.raw, packet);
        return { action: "defer" };
      }
    }

    return { action: "pass" };
  }

  private decode(direction: PacketDirection, data: ArrayBuffer): DecodedPacket[] {
    const offset = direction === "incoming" ? this.offsets.incoming : this.offsets.outgoing;

    return this.codec.decode(data).map((packet) => {
      const logicalHeader = offset === null ? packet.header : normalizeHeader(packet.header - offset);
      const parsed =
        direction === "incoming"
          ? this.registry.parseIncoming(logicalHeader, packet.body)
          : { name: this.registry.getOutgoingName(logicalHeader) };

      return {
        direction,
        header: logicalHeader,
        wireHeader: packet.wireHeader,
        body: packet.body,
        raw: packet.raw,
        ...parsed
      };
    });
  }

  private runHandlers(
    socket: WebSocket,
    direction: PacketDirection,
    packet: DecodedPacket,
    origin: PacketOrigin
  ): Exclude<PacketDecision, Promise<PacketDecision>> {
    const handlers =
      direction === "incoming"
        ? this.incomingHandlers.get(packet.header)
        : this.outgoingHandlers.get(packet.header);

    if (!handlers?.size) return "pass";

    const context: PacketHandlerContext = { socket, packet, origin };

    for (const handler of handlers) {
      const decision = handler(context);

      if (decision instanceof Promise) {
        this.debugWarn("[Luminus] Handler async ignorado:", packet.header);
        continue;
      }

      if (decision === "block" || (typeof decision === "object" && decision.action === "replace")) {
        return decision;
      }
    }

    return "pass";
  }

  private addHandler(
    map: Map<number, Set<PacketHandler>>,
    header: number,
    handler: PacketHandler
  ): () => void {
    let handlers = map.get(header);

    if (!handlers) {
      handlers = new Set();
      map.set(header, handlers);
    }

    handlers.add(handler);

    return () => {
      handlers?.delete(handler);
      if (!handlers?.size) map.delete(header);
    };
  }

  private logPacket(packet: DecodedPacket): void {
    if (!this.debug) return;
    if (this.logParsedOnly && (!packet.parsed || packet.parseError)) return;

    console.log(
      `[Luminus] ${packet.direction}`,
      packet.header,
      packet.wireHeader === packet.header ? "" : `(wire ${packet.wireHeader})`,
      packet.name ?? (packet.direction === "incoming" ? incomingHeaderNames : outgoingHeaderNames).get(packet.header) ?? "UNKNOWN",
      packet.parseError ? `parseError: ${packet.parseError}` : "",
      packet.parsed ?? previewPacketBody(packet.body)
    );
  }

  private debugLog(...args: unknown[]): void {
    if (this.debug) console.log(...args);
  }

  private debugWarn(...args: unknown[]): void {
    if (this.debug) console.warn(...args);
  }

  private updateState(packet: DecodedPacket): void {
    if (packet.direction === "incoming" && packet.header === 2725 && packet.parsed) {
      const userObject = packet.parsed as UserObject;
      this.myself = {
        id: userObject.id,
        username: userObject.username,
        figure: userObject.figure,
        gender: userObject.gender,
        motto: userObject.motto,
        index: null
      };
      this.healMyselfIndexFromStore();
      this.debugLog("[Luminus] myself definido:", this.myself);
      return;
    }

    if (packet.direction === "outgoing" && packet.header === 105) {
      this.expectHotelView = true;
      return;
    }

    if (packet.direction === "incoming" && packet.header === 374 && packet.parsed) {
      const units = packet.parsed as RoomUnit[];
      upsertRoomUnits(this.room, units);
      noteEnterRoster(this.enterGuard, units.map(unit => unit.index));
      for (const unit of units) {
        if (unit.type !== 1) {
          removePerson(unit.name);
          continue;
        }
        const link = findLinkInMotto(unit.motto);
        if (link) rememberLink(unit.name, link.text, unit.sex);
      }
      this.updateMyselfIndex(units);
      const myselfUnit = this.findMyselfUnit(units);
      if (myselfUnit) this.syncMyselfFromUnit(myselfUnit);
      // Heal if self was already in the store but missing from this 374 batch.
      this.healMyselfIndexFromStore();
      this.debugLog("[Luminus] room units:", this.room.units);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 3920 && packet.parsed) {
      const info = packet.parsed as RoomUnitInfo;
      const unit = this.room.units.get(info.index);
      if (unit) {
        unit.figure = info.figure;
        unit.sex = info.gender;
        unit.gender = info.gender;
        unit.motto = info.motto;
        if (this.myself?.index === info.index) this.syncMyselfFromUnit(unit);
      } else if (this.myself?.index === info.index) {
        this.myself.figure = info.figure;
        this.myself.gender = info.gender;
        this.myself.motto = info.motto;
      }
      return;
    }

    if (packet.direction === "incoming" && packet.header === 2429 && packet.parsed) {
      const update = packet.parsed as FigureUpdate;
      if (!this.myself) return;
      this.myself.figure = update.figure;
      this.myself.gender = update.gender;
      const unit = this.myself.index == null ? undefined : this.room.units.get(this.myself.index);
      if (unit) {
        unit.figure = update.figure;
        unit.sex = update.gender;
        unit.gender = update.gender;
      }
      return;
    }

    if (packet.direction === "incoming" && packet.header === 2031 && packet.parsed) {
      const roomReady = packet.parsed as RoomReady;
      this.expectHotelView = false;
      markRoomEnter(this.enterGuard);
      enterRoom(this.room, roomReady.roomId, roomReady.model);
      if (this.myself) this.myself.index = null;
      this.debugLog("[Luminus] room ready:", this.room);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 749 && packet.parsed) {
      const roomEntry = packet.parsed as RoomEntryInfo;
      this.room.id = roomEntry.roomId;
      this.room.isOwner = roomEntry.isOwner;
      return;
    }

    if (packet.direction === "incoming" && packet.header === 687 && packet.parsed) {
      const room = packet.parsed as GuestRoomData;
      this.room.id = room.id;
      this.room.name = room.name;
      this.room.description = room.description;
      this.room.ownerId = room.ownerId;
      this.room.ownerName = room.ownerName;
      this.room.userCount = room.userCount;
      this.room.maxUserCount = room.maxUserCount;
      this.debugLog("[Luminus] room info:", this.room);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 1778 && packet.parsed) {
      setRoomFurnis(this.room, (packet.parsed as FurnitureFloor).items);
      this.debugLog("[Luminus] room furnis:", this.room.furnis);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 1534 && packet.parsed) {
      const added = packet.parsed as FurnitureFloorAdd;
      added.item.ownerName = added.username || added.item.ownerName;
      addRoomFurni(this.room, added.item);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 1301 && packet.parsed) {
      this.room.modelData = packet.parsed as RoomModelData;
      return;
    }

    if (packet.direction === "incoming" && packet.header === 1664 && packet.parsed) {
      this.room.entryTile = packet.parsed as RoomEntryTile;
      return;
    }

    if (packet.direction === "incoming" && packet.header === 3547 && packet.parsed) {
      this.room.thickness = packet.parsed as RoomThickness;
      return;
    }

    if (packet.direction === "incoming" && [1434, 1108, 383, 362, 356, 368].includes(packet.header) && packet.parsed) {
      const definition = packet.parsed as WiredDefinition;
      this.room.wiredDefinitions.set(definition.id, definition);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 1453 && packet.parsed) {
      updateRoomFurniStates(this.room, packet.parsed as ObjectDataUpdate[]);
      return;
    }

    if (packet.direction === "incoming" && packet.header === 1640 && packet.parsed) {
      updateRoomUnits(this.room, packet.parsed as RoomUnitUpdate[]);
      // After RoomReady, index can stay null if 374 rematch was missed — heal on motion.
      if (this.myself && this.myself.index == null) this.healMyselfIndexFromStore();
      return;
    }

    if (packet.direction === "incoming" && packet.header === 2661 && typeof packet.parsed === "number") {
      if (isUsersPacketReplay()) return;
      const removed = packet.parsed;
      const kind = this.expectHotelView && this.myself?.index === removed
        ? "self-leave"
        : classifyUserRemove(this.enterGuard, removed, this.myself?.index);
      if (kind === "ignore") {
        this.debugLog("[Luminus] ignored stale user remove", removed);
        return;
      }
      this.room.units.delete(removed);
      if (kind === "self-leave") {
        this.expectHotelView = false;
        if (this.myself) this.myself.index = null;
        resetRoomStore(this.room);
        this.debugLog("[Luminus] left room — store reset");
      }
    }
  }

  private updateMyselfIndex(units: RoomUnit[]): void {
    if (!this.myself) return;

    const myselfUnit = this.findMyselfUnit(units);
    if (myselfUnit) this.myself.index = myselfUnit.index;
  }

  private findMyselfUnit(units: Iterable<RoomUnit>): RoomUnit | undefined {
    if (!this.myself) return undefined;
    return [...units].find((unit) =>
      unit.type === 1 && (unit.id === this.myself?.id || unit.name === this.myself?.username)
    );
  }

  private syncMyselfFromUnit(unit: RoomUnit): void {
    if (!this.myself) return;
    this.myself.index = unit.index;
    this.myself.figure = unit.figure;
    this.myself.motto = unit.motto;
    if (unit.sex) this.myself.gender = unit.sex.toUpperCase();
  }

  /** Recover myself.index from room.units when sticky-null after RoomReady. */
  private healMyselfIndexFromStore(): void {
    if (!this.myself || this.myself.index != null) return;
    for (const unit of this.room.units.values()) {
      if (unit.type !== 1) continue;
      if (unit.id === this.myself.id || unit.name === this.myself.username) {
        this.syncMyselfFromUnit(unit);
        return;
      }
    }
  }

  private encodeOutgoing(logicalBuffer: ArrayBuffer): ArrayBuffer {
    return this.offsets.outgoing === null
      ? logicalBuffer
      : applyHeaderOffset(logicalBuffer, this.offsets.outgoing);
  }

  private tryReadHandshake(data: ArrayBuffer): boolean {
    const offsets = readProxyHandshakeOffsets(data);
    if (!offsets) return false;

    this.setOffsets(offsets);
    return true;
  }
}

function isBinary(data: unknown): data is ArrayBuffer | ArrayBufferView {
  return data instanceof ArrayBuffer || ArrayBuffer.isView(data);
}
