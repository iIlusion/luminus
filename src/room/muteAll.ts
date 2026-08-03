import type { LuminusApi } from "../ws/api";
import { readRoomUnitPacketEntries, type RoomUnit, type RoomUnitPacketEntry } from "../messages/incoming/UsersParser";
import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { RoomUnitUpdate } from "../messages/incoming/UserUpdateParser";
import { getTargetWindow } from "../ws/interceptWebSocket";
import { readPref, writePref } from "../util/prefs";
import { ensureRoomEngine } from "./nitroWorldOverlay";
import { BinaryWriter } from "../protocol/binary";
import type { DecodedPacket, PacketDecision } from "../protocol/types";

const UNIT_CATEGORY = 100;
const CHAT_HEADERS = [1446, 1036, 2704] as const;

const PREF_HIDE = "luminus.player.muteAll.hideAvatars";
const PREF_SHOW_ICONS = "luminus.player.muteAll.showMuteIcons";
const PREF_WHITELIST = "luminus.player.muteAll.whitelist";
const PREF_MANUAL = "luminus.player.muteAll.manual";

const FIGURE_IS_MUTED = "figure_is_muted";
const FIGURE_IS_TYPING = "figure_is_typing";
/** AvatarVisualization.MUTED_BUBBLE_ID — mute balloon is an addition, not body art. */
const MUTED_BUBBLE_ID = 6;
/** AvatarVisualization.TYPING_BUBBLE_ID — fights mute for the same extra sprite slot. */
const TYPING_BUBBLE_ID = 2;

export interface MuteAllState {
  enabled: boolean;
  hideAvatars: boolean;
  /** When false, mute-all still blocks chat but skips native mute balloons. */
  showMuteIcons: boolean;
  whitelist: string[];
  mutedCount: number;
}

type Listener = (state: MuteAllState) => void;

type NitroSprite = {
  _visible?: boolean;
  _alpha?: number;
  visible?: boolean;
  alpha?: number;
  texture?: unknown;
  _texture?: unknown;
  _libraryAssetName?: string;
  _name?: string;
  offsetX?: number;
  offsetY?: number;
  _offsetX?: number;
  _offsetY?: number;
};

type MuteAddition = {
  id?: number;
  update?: (sprite: NitroSprite, scale: number) => void;
  dispose?: () => void;
};

type NitroVisualization = {
  _sprites?: Array<NitroSprite | null | undefined>;
  _shadow?: NitroSprite | null;
  _additions?: Map<number, MuteAddition>;
  _extraSpritesStartIndex?: number;
  updateModelCounter?: number;
  _lastUpdate?: number;
  update?: (...args: unknown[]) => unknown;
  updateModel?: (model: NitroModel, scale?: number) => unknown;
  updateShadow?: (...args: unknown[]) => unknown;
  getAddition?: (id: number) => MuteAddition | null | undefined;
  addAddition?: (addition: MuteAddition) => unknown;
  removeAddition?: (id: number) => unknown;
  getSprite?: (index: number) => NitroSprite | null;
  createSpriteAtIndex?: (index: number) => NitroSprite | null;
  __lmForceHidden?: boolean;
  __lmHidePatched?: boolean;
  __lmOrigUpdate?: (...args: unknown[]) => unknown;
  __lmOrigUpdateShadow?: (...args: unknown[]) => unknown;
};

type NitroModel = {
  getValue?: (key: string) => unknown;
  setValue?: (key: string, value: unknown) => void;
  updateCounter?: number;
};

type NitroRoomObject = {
  id?: number;
  _visualization?: NitroVisualization | null;
  visualization?: NitroVisualization | null;
  _model?: NitroModel | null;
  model?: NitroModel | null;
};

type RoomGeometry = { scale?: number; updateId?: number };

type RoomEngineLike = {
  activeRoomId?: number;
  getRoomObject?: (roomId: number, id: number, category: number) => NitroRoomObject | null | undefined;
  getRoomObjects?: (roomId: number, category: number) => NitroRoomObject[] | null | undefined;
  getRoomGeometry?: (roomId: number, canvasId?: number) => RoomGeometry | null | undefined;
  getRoomInstanceGeometry?: (roomId: number, canvasId?: number) => RoomGeometry | null | undefined;
  updateRoomObjectUserAction?: (
    roomId: number,
    objectId: number,
    action: string,
    value: number,
    extra?: unknown,
  ) => boolean;
  changeObjectModelData?: (
    roomId: number,
    objectId: number,
    category: number,
    key: string,
    value: unknown,
  ) => boolean;
};

let apiRef: LuminusApi | null = null;
let enabled = false;
let hideAvatars = false;
/** Show native Calado balloons while muted (default on). */
let showMuteIcons = true;
const whitelist = new Map<string, string>();
const localMuted = new Set<string>();
const listeners = new Set<Listener>();
const unsubs: Array<() => void> = [];
let started = false;

type UsersPacketSnapshot = {
  roomId: number | null;
  wireHeader: number;
  body: ArrayBuffer;
  entries: RoomUnitPacketEntry[];
  allEntries: Map<number, ArrayBuffer>;
  allUnits: Map<number, RoomUnit>;
  allUpdates: Map<number, RoomUnitUpdate>;
};

let usersPacketSnapshot: UsersPacketSnapshot | null = null;
let replayingUsersPacket = false;
let usersReplayTimer: number | null = null;

/** True while mute-all injects synthetic 374/1640/2661 into Nitro (not real room traffic). */
export function isUsersPacketReplay(): boolean {
  return replayingUsersPacket;
}

let visualRaf = 0;
const forcedHidden = new Set<number>();
/** Last desired mute-icon state per index. */
const iconApplied = new Map<number, boolean>();

function norm(name: string): string {
  return name.trim().toLowerCase();
}

function snapshot(): MuteAllState {
  return {
    enabled,
    hideAvatars,
    showMuteIcons,
    whitelist: [...whitelist.values()].sort((a, b) => a.localeCompare(b)),
    mutedCount: enabled ? -1 : localMuted.size,
  };
}

function emit(): void {
  const state = snapshot();
  for (const listener of listeners) {
    try { listener(state); } catch { /* soft */ }
  }
}

/** The preference may stay checked while the main mute switch is off. */
function avatarHidingActive(): boolean {
  return enabled && hideAvatars;
}

function saveWhitelist(): void {
  writePref(PREF_WHITELIST, [...whitelist.values()]);
}

function saveManualMutes(): void {
  writePref(PREF_MANUAL, [...localMuted]);
}

function meIndex(): number | null {
  const idx = apiRef?.myself?.index;
  return idx == null ? null : idx;
}

function meId(): number | null {
  const id = apiRef?.myself?.id;
  return id == null ? null : id;
}

function meNameKey(): string | null {
  const name = apiRef?.myself?.username;
  return name ? norm(name) : null;
}

function isSelf(unit: RoomUnit): boolean {
  const idx = meIndex();
  if (idx != null && unit.index === idx) return true;
  const id = meId();
  if (id != null && unit.id === id) return true;
  const key = meNameKey();
  if (key && norm(unit.name) === key) return true;
  return false;
}

function isSelfName(name: string): boolean {
  const key = norm(name);
  if (!key) return false;
  const mine = meNameKey();
  if (mine && mine === key) return true;
  const idx = meIndex();
  if (idx != null) {
    const unit = apiRef?.room.units.get(idx);
    if (unit && norm(unit.name) === key) return true;
  }
  return false;
}

function isWhitelisted(name: string): boolean {
  return whitelist.has(norm(name));
}

export function shouldMuteUnit(unit: RoomUnit): boolean {
  if (!unit.name) return false;
  if (isSelf(unit)) return false;
  const key = norm(unit.name);
  if (localMuted.has(key)) return true;
  if (isWhitelisted(unit.name)) return false;
  if (enabled) return true;
  return false;
}

export function isNameMuted(name: string): boolean {
  const key = norm(name);
  if (!key || isSelfName(key)) return false;
  if (localMuted.has(key)) return true;
  if (isWhitelisted(name)) return false;
  if (enabled) return true;
  return false;
}

function findUnitByName(name: string): RoomUnit | undefined {
  const key = norm(name);
  for (const unit of apiRef?.room.units.values() ?? []) {
    if (norm(unit.name) === key) return unit;
  }
  return undefined;
}

function visualsNeeded(): boolean {
  if (avatarHidingActive() && usersPacketSnapshot) return false;
  return enabled || localMuted.size > 0 || avatarHidingActive() || forcedHidden.size > 0 || iconApplied.size > 0;
}

function shouldFilterUsersPacket(): boolean {
  if (!avatarHidingActive() || !usersPacketSnapshot) return false;
  return [...usersPacketSnapshot.allUnits.values()].some(isHiddenByPacket);
}

function isHiddenByPacket(unit: RoomUnit): boolean {
  return avatarHidingActive() && shouldMuteUnit(unit);
}

function frameIncomingPacket(wireHeader: number, body: ArrayBuffer): ArrayBuffer {
  return new BinaryWriter()
    .writeInt(body.byteLength + 2)
    .writeShort(wireHeader)
    .writeArrayBuffer(body)
    .toArrayBuffer();
}

function buildFilteredUsersBody(body: ArrayBuffer, entries: RoomUnitPacketEntry[], hidden: Set<number>): ArrayBuffer {
  const kept = entries.filter(entry => !hidden.has(entry.index));
  const writer = new BinaryWriter().writeInt(kept.length);
  for (const entry of kept) writer.writeArrayBuffer(body.slice(entry.start, entry.end));
  return writer.toArrayBuffer();
}

function buildSnapshotBody(snapshot: UsersPacketSnapshot, hidden: Set<number>): ArrayBuffer {
  const entries = [...snapshot.allEntries.entries()].filter(([index]) => !hidden.has(index));
  const writer = new BinaryWriter().writeInt(entries.length);
  for (const [, bytes] of entries) writer.writeArrayBuffer(bytes);
  return writer.toArrayBuffer();
}

function buildSnapshotUpdatesBody(snapshot: UsersPacketSnapshot): ArrayBuffer {
  const updates = [...snapshot.allUpdates.values()].filter(update => snapshot.allEntries.has(update.index));
  const writer = new BinaryWriter().writeInt(updates.length);
  for (const update of updates) {
    writer
      .writeInt(update.index)
      .writeInt(update.x)
      .writeInt(update.y)
      .writeString(String(update.z))
      .writeInt(update.headDirection)
      .writeInt(update.bodyDirection)
      .writeString(update.actions);
  }
  return writer.toArrayBuffer();
}

function captureUsersPacket(packet: DecodedPacket): void {
  if (replayingUsersPacket || !Array.isArray(packet.parsed)) return;
  try {
    const roomId = apiRef?.room.id ?? null;
    const entries = readRoomUnitPacketEntries(packet.body);
    if (!usersPacketSnapshot || usersPacketSnapshot.roomId !== roomId) {
      usersPacketSnapshot = {
        roomId,
        wireHeader: packet.wireHeader,
        body: packet.body.slice(0),
        entries,
        allEntries: new Map(),
        allUnits: new Map(),
        allUpdates: new Map()
      };
    } else {
      usersPacketSnapshot.wireHeader = packet.wireHeader;
      usersPacketSnapshot.body = packet.body.slice(0);
      usersPacketSnapshot.entries = entries;
    }

    for (const entry of entries) {
      usersPacketSnapshot.allEntries.set(entry.index, packet.body.slice(entry.start, entry.end));
    }
    for (const unit of packet.parsed as RoomUnit[]) usersPacketSnapshot.allUnits.set(unit.index, unit);
  } catch {
    usersPacketSnapshot = null;
  }
}

function filterUsersPacket(packet: DecodedPacket): PacketDecision {
  if (replayingUsersPacket || !shouldFilterUsersPacket() || !Array.isArray(packet.parsed)) return "pass";

  const units = packet.parsed as RoomUnit[];
  const hidden = new Set(units.filter(isHiddenByPacket).map(unit => unit.index));
  if (!hidden.size) return "pass";

  try {
    const entries = readRoomUnitPacketEntries(packet.body);
    return {
      action: "replace",
      data: frameIncomingPacket(packet.wireHeader, buildFilteredUsersBody(packet.body, entries, hidden))
    };
  } catch {
    return "pass";
  }
}

function replayUsersPacket(filtered: boolean): void {
  const snapshot = usersPacketSnapshot;
  const socket = apiRef?.socket as (WebSocket & { handleNativeMessage?: (event: MessageEvent) => void }) | null;
  if (!snapshot || !socket?.handleNativeMessage) return;

  for (const unit of snapshot.allUnits.values()) apiRef?.room.units.set(unit.index, unit);
  const units = [...snapshot.allUnits.values()];
  const hidden = new Set(filtered ? units.filter(isHiddenByPacket).map(unit => unit.index) : []);
  const body = filtered ? buildSnapshotBody(snapshot, hidden) : buildSnapshotBody(snapshot, new Set());

  replayingUsersPacket = true;
  try {
    socket.handleNativeMessage(new MessageEvent("message", {
      data: frameIncomingPacket(snapshot.wireHeader, body)
    }));
    if (!filtered) replayUsersUpdates(snapshot, socket);
  } finally {
    replayingUsersPacket = false;
  }
}

function replayUsersUpdates(
  snapshot: UsersPacketSnapshot,
  socket: WebSocket & { handleNativeMessage?: (event: MessageEvent) => void }
): void {
  const updates = [...snapshot.allUpdates.values()].filter(update => snapshot.allEntries.has(update.index));
  if (!updates.length || !socket.handleNativeMessage) return;
  const wireHeader = 1640 + (apiRef?.getOffsets().incoming ?? 0);
  socket.handleNativeMessage(new MessageEvent("message", {
    data: frameIncomingPacket(wireHeader, buildSnapshotUpdatesBody(snapshot))
  }));
}

function removeHiddenUnitsImmediately(): void {
  const snapshot = usersPacketSnapshot;
  const socket = apiRef?.socket as (WebSocket & { handleNativeMessage?: (event: MessageEvent) => void }) | null;
  if (!snapshot || !socket?.handleNativeMessage) return;

  const hidden = [...snapshot.allUnits.values()].filter(isHiddenByPacket);
  const incomingOffset = apiRef?.getOffsets().incoming ?? 0;
  const wireHeader = 2661 + incomingOffset;

  replayingUsersPacket = true;
  try {
    for (const unit of hidden) {
      const body = new BinaryWriter().writeString(String(unit.index)).toArrayBuffer();
      socket.handleNativeMessage(new MessageEvent("message", {
        data: frameIncomingPacket(wireHeader, body)
      }));
    }
  } finally {
    replayingUsersPacket = false;
  }

  for (const unit of snapshot.allUnits.values()) apiRef?.room.units.set(unit.index, unit);
}

function scheduleUsersPacketReplay(): void {
  if (usersReplayTimer !== null) return;
  usersReplayTimer = window.setTimeout(() => {
    usersReplayTimer = null;
    const filtering = shouldFilterUsersPacket();
    if (filtering) removeHiddenUnitsImmediately();
    replayUsersPacket(filtering);
    if (!filtering) syncAllVisualsNow(true, true);
  }, 0);
}

function shouldBlockChatPacket(packet: DecodedPacket): boolean {
  if (!enabled && localMuted.size === 0) return false;
  const chat = packet.parsed as RoomChat | undefined;
  if (!chat || chat.roomIndex == null) return false;
  const selfIdx = meIndex();
  if (selfIdx != null && chat.roomIndex === selfIdx) return false;
  const unit = apiRef?.room.units.get(chat.roomIndex);
  if (unit) {
    if (isSelf(unit)) return false;
    return shouldMuteUnit(unit);
  }
  return enabled;
}

// ── RoomEngine ──

function getEngine(): RoomEngineLike | null {
  return ensureRoomEngine(getTargetWindow()) as RoomEngineLike | null;
}

function roomIdOf(): number | null {
  const id = apiRef?.room.id;
  if (id != null) return id;
  return getEngine()?.activeRoomId ?? null;
}

function getVis(obj: NitroRoomObject | null | undefined): NitroVisualization | null {
  return obj?._visualization ?? obj?.visualization ?? null;
}

function getModel(obj: NitroRoomObject | null | undefined): NitroModel | null {
  return obj?._model ?? obj?.model ?? null;
}

function roomGeometry(engine: RoomEngineLike, roomId: number): RoomGeometry | null {
  try {
    return engine.getRoomGeometry?.(roomId)
      ?? engine.getRoomGeometry?.(roomId, 1)
      ?? engine.getRoomInstanceGeometry?.(roomId)
      ?? engine.getRoomInstanceGeometry?.(roomId, 1)
      ?? null;
  } catch {
    return null;
  }
}

function roomScale(engine: RoomEngineLike, roomId: number): number {
  const scale = roomGeometry(engine, roomId)?.scale;
  if (typeof scale === "number" && scale > 0) return scale;
  return 64;
}

/** Drop typing bubble so it cannot share/steal the mute extra-sprite slot. */
function stripTypingBubble(vis: NitroVisualization, model: NitroModel | null): void {
  try {
    if (vis.getAddition?.(TYPING_BUBBLE_ID) || vis._additions?.has(TYPING_BUBBLE_ID)) {
      vis.removeAddition?.(TYPING_BUBBLE_ID);
    }
  } catch { /* soft */ }
  if (model) {
    try { model.setValue?.(FIGURE_IS_TYPING, 0); } catch { /* soft */ }
  }
}

/**
 * Force a full AvatarVisualization.update so body layers rebuild immediately
 * after unhide (otherwise Nitro may leave a 1–few frame lag until next engine tick).
 */
function forceVisRedraw(vis: NitroVisualization, model: NitroModel | null, geo: RoomGeometry | null): void {
  if (model) {
    try {
      vis.updateModelCounter = -1;
      vis.updateModel?.(model);
    } catch { /* soft */ }
  }
  if (geo && typeof vis.update === "function") {
    try {
      vis._lastUpdate = 0;
      vis.update(geo, performance.now() + 1000);
    } catch {
      try { vis.update(geo, performance.now() + 1000, true, false); } catch { /* soft */ }
    }
  }
  try { vis.updateShadow?.(1); } catch { /* soft */ }
}

function isMuteBubbleSprite(sprite: NitroSprite | null | undefined): boolean {
  if (!sprite) return false;
  if (/muted/i.test(String(sprite._libraryAssetName ?? ""))) return true;
  if (/muted/i.test(String(sprite._name ?? ""))) return true;
  const tex = sprite.texture as { textureCacheIds?: unknown[] } | null | undefined;
  const ids = tex?.textureCacheIds;
  if (Array.isArray(ids) && ids.some(id => /muted/i.test(String(id)))) return true;
  return false;
}

function hideSprite(sprite: NitroSprite | null | undefined): void {
  if (!sprite) return;
  sprite._visible = false;
  sprite.visible = false;
  sprite._alpha = 0;
  if (typeof sprite.alpha === "number") sprite.alpha = 0;
}

function showSprite(sprite: NitroSprite | null | undefined, alpha = 255): void {
  if (!sprite) return;
  sprite._visible = true;
  sprite.visible = true;
  if (sprite._alpha === 0 || sprite._alpha == null) sprite._alpha = alpha;
  if (typeof sprite.alpha === "number" && sprite.alpha === 0) sprite.alpha = alpha <= 1 ? 1 : alpha;
}

/**
 * Paint / erase the native mute balloon on the visualization sprites NOW.
 *
 * Live-proven (MCP, 170+ units):
 * - model + updateModel only puts the addition in a Map — balloon still invisible
 * - need createSpriteAtIndex(extraStart) + addition.update(sprite, scale) to show
 * - on clear, removeAddition leaves texture on the sprite — must hard-clear it
 *   or balloons vanish in batches when Nitro later recycles units
 */
function scrubExtraSprites(vis: NitroVisualization, fromIndex: number): void {
  const sprites = vis._sprites;
  if (!Array.isArray(sprites)) return;
  for (let i = fromIndex; i < sprites.length; i++) {
    const s = sprites[i];
    if (!s) continue;
    hideSprite(s);
    try { s.texture = null; } catch { /* soft */ }
    try { s._texture = null; } catch { /* soft */ }
    try { s._libraryAssetName = ""; } catch { /* soft */ }
  }
  // Also scrub any leftover muted texture even if index shifted.
  for (let i = 0; i < sprites.length; i++) {
    const s = sprites[i];
    if (!s || !isMuteBubbleSprite(s)) continue;
    hideSprite(s);
    try { s.texture = null; } catch { /* soft */ }
    try { s._libraryAssetName = ""; } catch { /* soft */ }
  }
}

function paintMuteBubble(
  vis: NitroVisualization,
  muted: boolean,
  scale: number,
  model: NitroModel | null = null,
): void {
  const start = vis._extraSpritesStartIndex ?? 2;

  if (muted) {
    // Typing + mute both use extra sprite slots from _extraSpritesStartIndex.
    // Nitro's updateModel does NOT remove typing when muted is true (only handles
    // typing in the !muted branch) → both additions paint alternating → flicker.
    stripTypingBubble(vis, model);

    const add = vis.getAddition?.(MUTED_BUBBLE_ID) ?? vis._additions?.get(MUTED_BUBBLE_ID);
    if (!add?.update) return;

    // Only mute should occupy the first extra slot while muted.
    scrubExtraSprites(vis, start);

    let sprite = vis.getSprite?.(start) ?? vis._sprites?.[start] ?? null;
    if (!sprite) {
      try { vis.createSpriteAtIndex?.(start); } catch { /* soft */ }
      sprite = vis.getSprite?.(start) ?? vis._sprites?.[start] ?? null;
    }
    if (!sprite) return;
    try { add.update(sprite, scale); } catch { /* soft */ }
    sprite._visible = true;
    sprite.visible = true;
    if (sprite._alpha === 0) sprite._alpha = 255;
    return;
  }

  // Unmute: drop mute addition then scrub residual mute sprites.
  try {
    if (vis.getAddition?.(MUTED_BUBBLE_ID) || vis._additions?.has(MUTED_BUBBLE_ID)) {
      vis.removeAddition?.(MUTED_BUBBLE_ID);
    }
  } catch { /* soft */ }

  scrubExtraSprites(vis, start);
}

function setNativeMuteIcon(
  engine: RoomEngineLike,
  roomId: number,
  index: number,
  muted: boolean,
  scale: number,
  force = false,
): void {
  // Option "sem balões": still mute chat, never paint Calado icons.
  const wantIcon = muted && showMuteIcons;
  if (!force && iconApplied.get(index) === wantIcon) return;

  try {
    engine.updateRoomObjectUserAction?.(roomId, index, FIGURE_IS_MUTED, wantIcon ? 1 : 0);
  } catch { /* soft */ }
  try {
    engine.changeObjectModelData?.(roomId, index, UNIT_CATEGORY, FIGURE_IS_MUTED, wantIcon ? 1 : 0);
  } catch { /* soft */ }

  // Kill typing flag only when showing mute bubble (typing fights the same sprite slot).
  // When icons are hidden, leave typing alone so people can still see "digitando".
  if (wantIcon) {
    try {
      engine.updateRoomObjectUserAction?.(roomId, index, FIGURE_IS_TYPING, 0);
    } catch { /* soft */ }
    try {
      engine.changeObjectModelData?.(roomId, index, UNIT_CATEGORY, FIGURE_IS_TYPING, 0);
    } catch { /* soft */ }
  }

  const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
  const vis = getVis(obj);
  const model = getModel(obj);
  if (model) {
    try { model.setValue?.(FIGURE_IS_MUTED, wantIcon ? 1 : 0); } catch { /* soft */ }
    if (wantIcon) {
      try { model.setValue?.(FIGURE_IS_TYPING, 0); } catch { /* soft */ }
    }
  }
  if (vis && model) {
    if (wantIcon) stripTypingBubble(vis, model);
    try {
      vis.updateModelCounter = -1;
      vis.updateModel?.(model);
    } catch { /* soft */ }
    if (wantIcon) stripTypingBubble(vis, model);
  }
  if (vis) paintMuteBubble(vis, wantIcon, scale, model);

  iconApplied.set(index, wantIcon);
}

// ── Hide body (all sprites + shadow); patch keeps it hidden after Nitro ticks ──

function hideLayers(vis: NitroVisualization): void {
  if (Array.isArray(vis._sprites)) {
    for (const s of vis._sprites) hideSprite(s);
  }
  if (vis._shadow) hideSprite(vis._shadow);
  if (vis._additions) {
    try {
      for (const add of vis._additions.values()) {
        // additions paint via getSprite slots already zeroed above
        void add;
      }
    } catch { /* soft */ }
  }
}

function showBodyLayers(vis: NitroVisualization): void {
  if (Array.isArray(vis._sprites)) {
    const start = vis._extraSpritesStartIndex ?? 2;
    for (let i = 0; i < vis._sprites.length; i++) {
      const s = vis._sprites[i];
      if (!s) continue;
      // Never revive mute bubble here — paintMuteBubble owns that.
      if (isMuteBubbleSprite(s) || i >= start) {
        hideSprite(s);
        continue;
      }
      // body (0) full alpha; shadow (1) often ~50
      showSprite(s, i === 1 ? 50 : 255);
    }
  }
  if (vis._shadow) showSprite(vis._shadow, 50);
}

function ensureHidePatch(vis: NitroVisualization): void {
  if (vis.__lmHidePatched) return;
  vis.__lmHidePatched = true;

  if (typeof vis.updateShadow === "function") {
    vis.__lmOrigUpdateShadow = vis.updateShadow.bind(vis);
    vis.updateShadow = function luminusUpdateShadow(this: NitroVisualization, ...args: unknown[]) {
      if (this.__lmForceHidden) {
        hideLayers(this);
        return;
      }
      return vis.__lmOrigUpdateShadow?.apply(this, args);
    };
  }

  if (typeof vis.update === "function") {
    vis.__lmOrigUpdate = vis.update.bind(vis);
    vis.update = function luminusUpdate(this: NitroVisualization, ...args: unknown[]) {
      const result = vis.__lmOrigUpdate?.apply(this, args);
      if (this.__lmForceHidden) hideLayers(this);
      return result;
    };
  }
}

function removeHidePatch(vis: NitroVisualization): void {
  if (!vis.__lmHidePatched) {
    vis.__lmForceHidden = false;
    return;
  }
  if (vis.__lmOrigUpdate) {
    vis.update = vis.__lmOrigUpdate;
    delete vis.__lmOrigUpdate;
  }
  if (vis.__lmOrigUpdateShadow) {
    vis.updateShadow = vis.__lmOrigUpdateShadow;
    delete vis.__lmOrigUpdateShadow;
  }
  delete vis.__lmHidePatched;
  vis.__lmForceHidden = false;
}

function hideObject(obj: NitroRoomObject): void {
  const vis = getVis(obj);
  if (!vis) return;
  ensureHidePatch(vis);
  vis.__lmForceHidden = true;
  hideLayers(vis);
}

function showObject(obj: NitroRoomObject, geo: RoomGeometry | null = null): void {
  const vis = getVis(obj);
  if (!vis) return;
  // Clear force flag BEFORE unpatch so an in-flight Nitro update cannot re-hide.
  vis.__lmForceHidden = false;
  removeHidePatch(vis);
  showBodyLayers(vis);
  forceVisRedraw(vis, getModel(obj), geo);
}

function listMutedIndices(): number[] {
  const api = apiRef;
  if (!api) return [];
  const selfIdx = meIndex();
  const out: number[] = [];
  for (const unit of api.room.units.values()) {
    if (selfIdx != null && unit.index === selfIdx) continue;
    if (!shouldMuteUnit(unit)) continue;
    out.push(unit.index);
  }
  return out;
}

function allTargetIndices(): number[] {
  const selfIdx = meIndex();
  const set = new Set<number>();
  const api = apiRef;

  if (api) {
    for (const unit of api.room.units.values()) {
      if (selfIdx != null && unit.index === selfIdx) continue;
      set.add(unit.index);
    }
  }

  const engine = getEngine();
  const roomId = roomIdOf();
  if (engine?.getRoomObjects && roomId != null) {
    try {
      for (const obj of engine.getRoomObjects(roomId, UNIT_CATEGORY) ?? []) {
        const id = obj?.id;
        if (typeof id === "number" && (selfIdx == null || id !== selfIdx)) set.add(id);
      }
    } catch { /* soft */ }
  }

  for (const index of forcedHidden) {
    if (selfIdx == null || index !== selfIdx) set.add(index);
  }
  for (const index of iconApplied.keys()) {
    if (selfIdx == null || index !== selfIdx) set.add(index);
  }

  return [...set];
}

function applyVisualForIndex(
  engine: RoomEngineLike,
  roomId: number,
  index: number,
  wantMuted: boolean,
  scale: number,
  force: boolean,
  geo: RoomGeometry | null,
): void {
  const selfIdx = meIndex();
  if (selfIdx != null && index === selfIdx) return;

  const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
  if (!obj) return;

  const wantHidden = avatarHidingActive() && wantMuted;

  if (wantHidden) {
    // Hide body+extras. No mute balloon while fully hidden.
    setNativeMuteIcon(engine, roomId, index, false, scale, force);
    hideObject(obj);
    forcedHidden.add(index);
    return;
  }

  if (forcedHidden.has(index) || getVis(obj)?.__lmForceHidden || getVis(obj)?.__lmHidePatched) {
    showObject(obj, geo);
    forcedHidden.delete(index);
  }

  setNativeMuteIcon(engine, roomId, index, wantMuted, scale, force);
}

/**
 * Full-room sync, one synchronous pass.
 * Stops the rAF loop first so a concurrent re-hide cannot fight unhide mid-pass.
 */
function syncAllVisualsNow(force = true, skipPacketReplay = false): void {
  if (!skipPacketReplay && usersPacketSnapshot && avatarHidingActive()) {
    stopVisualLoop();
    forcedHidden.clear();
    iconApplied.clear();
    scheduleUsersPacketReplay();
    return;
  }

  // Prevent visualTick from re-hiding while we unhide the whole room.
  stopVisualLoop();

  const roomId = roomIdOf();
  const engine = getEngine();
  if (roomId == null || !engine?.getRoomObject) {
    startVisualLoop();
    return;
  }

  const geo = roomGeometry(engine, roomId);
  const scale = typeof geo?.scale === "number" && geo.scale > 0 ? geo.scale : 64;
  const mutedSet = new Set(listMutedIndices());
  const indices = allTargetIndices();

  // Unhide pass first (everyone who should be visible), then mute icons.
  // Ordering matters: hide patches must be gone before paintMuteBubble.
  for (const index of indices) {
    applyVisualForIndex(engine, roomId, index, mutedSet.has(index), scale, force, geo);
  }

  const api = apiRef;
  if (api) {
    for (const index of [...iconApplied.keys()]) {
      if (!api.room.units.has(index) && !mutedSet.has(index)) iconApplied.delete(index);
    }
    for (const index of [...forcedHidden]) {
      if (!api.room.units.has(index) && !mutedSet.has(index)) forcedHidden.delete(index);
    }
  }

  if (visualsNeeded()) startVisualLoop();
}

function visualTick(): void {
  visualRaf = 0;
  if (!visualsNeeded()) return;

  const roomId = roomIdOf();
  const engine = getEngine();
  if (roomId == null || !engine?.getRoomObject) {
    visualRaf = requestAnimationFrame(visualTick);
    return;
  }

  const geo = roomGeometry(engine, roomId);
  const scale = typeof geo?.scale === "number" && geo.scale > 0 ? geo.scale : 64;
  const mutedSet = new Set(listMutedIndices());

  // Re-hide (Nitro fights us every update).
  if (avatarHidingActive()) {
    for (const index of mutedSet) {
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      if (obj) {
        hideObject(obj);
        forcedHidden.add(index);
      }
    }
  }

  // Unhide stragglers no longer muted/hidden.
  for (const index of [...forcedHidden]) {
    if (!(avatarHidingActive() && mutedSet.has(index))) {
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      if (obj) showObject(obj, geo);
      forcedHidden.delete(index);
      setNativeMuteIcon(engine, roomId, index, mutedSet.has(index), scale, true);
    }
  }

  // Keep mute balloon stable when icons are enabled.
  if (!avatarHidingActive() && showMuteIcons) {
    for (const index of mutedSet) {
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      const vis = getVis(obj);
      const model = getModel(obj);
      if (!vis) continue;

      // Always kill typing addition while muted (typing packets re-add it).
      if (vis.getAddition?.(TYPING_BUBBLE_ID) || vis._additions?.has(TYPING_BUBBLE_ID)) {
        stripTypingBubble(vis, model);
        paintMuteBubble(vis, true, scale, model);
        continue;
      }

      const start = vis._extraSpritesStartIndex ?? 2;
      const slot = vis.getSprite?.(start) ?? vis._sprites?.[start];
      const hasAdd = !!(vis.getAddition?.(MUTED_BUBBLE_ID) || vis._additions?.has(MUTED_BUBBLE_ID));
      const painted = isMuteBubbleSprite(slot) && slot?._visible !== false;
      if (hasAdd && !painted) {
        paintMuteBubble(vis, true, scale, model);
      } else if (!hasAdd && iconApplied.get(index) === true) {
        setNativeMuteIcon(engine, roomId, index, true, scale, true);
      }
    }
  } else if (!avatarHidingActive() && !showMuteIcons) {
    // Ensure no balloons linger if option was just turned off.
    for (const index of mutedSet) {
      if (iconApplied.get(index) === true) {
        setNativeMuteIcon(engine, roomId, index, true, scale, true);
      }
    }
  }

  if (visualsNeeded()) visualRaf = requestAnimationFrame(visualTick);
}

function startVisualLoop(): void {
  if (visualRaf) return;
  if (!visualsNeeded()) return;
  visualRaf = requestAnimationFrame(visualTick);
}

function stopVisualLoop(): void {
  if (!visualRaf) return;
  cancelAnimationFrame(visualRaf);
  visualRaf = 0;
}

function clearAllVisuals(): void {
  stopVisualLoop();
  const roomId = roomIdOf();
  const engine = getEngine();
  if (roomId == null || !engine?.getRoomObject) {
    iconApplied.clear();
    forcedHidden.clear();
    return;
  }

  const geo = roomGeometry(engine, roomId);
  const scale = typeof geo?.scale === "number" && geo.scale > 0 ? geo.scale : 64;
  for (const index of allTargetIndices()) {
    const obj = engine.getRoomObject(roomId, index, UNIT_CATEGORY);
    if (obj) showObject(obj, geo);
    setNativeMuteIcon(engine, roomId, index, false, scale, true);
  }
  iconApplied.clear();
  forcedHidden.clear();
}

export function getMuteAllState(): MuteAllState {
  return snapshot();
}

export function subscribeMuteAll(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMuteAllEnabled(on: boolean): void {
  if (enabled === on) return;
  const wasHiding = avatarHidingActive();
  enabled = on;
  if (on) syncAllVisualsNow(true);
  else if (wasHiding && usersPacketSnapshot) {
    stopVisualLoop();
    forcedHidden.clear();
    iconApplied.clear();
    scheduleUsersPacketReplay();
  }
  else syncAllVisualsNow(true);
  emit();
}

function clearMuteAllBulkOnly(): void {
  enabled = false;
  forcedHidden.clear();
  iconApplied.clear();
  stopVisualLoop();
  if (localMuted.size > 0 || avatarHidingActive()) syncAllVisualsNow(true);
  emit();
}

export function setMuteAllHideAvatars(on: boolean): void {
  if (on && !enabled) return;
  if (hideAvatars === on) return;
  hideAvatars = on;
  writePref(PREF_HIDE, on);
  emit();

  if (usersPacketSnapshot) {
    stopVisualLoop();
    forcedHidden.clear();
    iconApplied.clear();
    scheduleUsersPacketReplay();
    return;
  }

  syncAllVisualsNow(true);
}

/** Show/hide native mute balloons while people stay muted. */
export function setMuteAllShowIcons(on: boolean): void {
  if (showMuteIcons === on) return;
  showMuteIcons = on;
  writePref(PREF_SHOW_ICONS, on);
  syncAllVisualsNow(true);
  emit();
}

export function addMuteAllWhitelist(name: string): void {
  const key = norm(name);
  if (!key || isSelfName(key)) return;
  if (!whitelist.has(key)) whitelist.set(key, name.trim());
  saveWhitelist();
  if (localMuted.delete(key)) saveManualMutes();
  syncAllVisualsNow(true);
  emit();
}

export function removeMuteAllWhitelist(name: string): void {
  const key = norm(name);
  if (!key || isSelfName(key)) return;
  whitelist.delete(key);
  saveWhitelist();
  syncAllVisualsNow(true);
  emit();
}

export function desmuteUser(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || isSelfName(trimmed)) return;
  localMuted.delete(norm(trimmed));
  saveManualMutes();
  if (enabled) {
    addMuteAllWhitelist(trimmed);
    return;
  }
  if (localMuted.size === 0 && !avatarHidingActive()) clearAllVisuals();
  else syncAllVisualsNow(true);
  emit();
}

export function muteUser(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || isSelfName(trimmed)) return;
  const key = norm(trimmed);
  if (whitelist.has(key)) {
    whitelist.delete(key);
    saveWhitelist();
  }
  localMuted.add(key);
  saveManualMutes();
  syncAllVisualsNow(true);
  emit();
}

export function initMuteAll(api: LuminusApi): void {
  if (started) return;
  started = true;
  apiRef = api;

  try {
    getTargetWindow().document.getElementById("luminus-mute-overlay")?.remove();
  } catch { /* soft */ }

  enabled = false;
  hideAvatars = readPref(PREF_HIDE, false);
  showMuteIcons = readPref(PREF_SHOW_ICONS, true);
  whitelist.clear();
  for (const entry of readPref<string[]>(PREF_WHITELIST, [])) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    whitelist.set(norm(trimmed), trimmed);
  }
  localMuted.clear();
  for (const entry of readPref<string[]>(PREF_MANUAL, [])) {
    const key = norm(entry);
    if (key) localMuted.add(key);
  }

  api.muteAll = {
    getState: getMuteAllState,
    subscribe: subscribeMuteAll,
    setEnabled: setMuteAllEnabled,
    setHideAvatars: setMuteAllHideAvatars,
    setShowMuteIcons: setMuteAllShowIcons,
    addWhitelist: addMuteAllWhitelist,
    removeWhitelist: removeMuteAllWhitelist,
    muteUser,
    desmuteUser,
    isNameMuted,
  };

  for (const header of CHAT_HEADERS) {
    unsubs.push(api.blockIncoming(header, shouldBlockChatPacket));
  }

  unsubs.push(api.onIncoming(374, ({ packet }) => {
    captureUsersPacket(packet);
    const decision = filterUsersPacket(packet);
    if (decision !== "pass") return decision;
    if ((enabled || localMuted.size > 0 || avatarHidingActive()) && !shouldFilterUsersPacket()) syncAllVisualsNow(true);
  }));

  unsubs.push(api.onIncoming(1640, ({ packet }) => {
    if (Array.isArray(packet.parsed) && usersPacketSnapshot && !replayingUsersPacket) {
      for (const update of packet.parsed as RoomUnitUpdate[]) {
        usersPacketSnapshot.allUpdates.set(update.index, update);
      }
    }
    if (!avatarHidingActive() && !enabled && localMuted.size === 0 && forcedHidden.size === 0) return;
    // Cheap re-assert after Nitro paints from unit status.
    const roomId = roomIdOf();
    const engine = getEngine();
    if (roomId == null || !engine?.getRoomObject) return;
    const scale = roomScale(engine, roomId);
    for (const index of listMutedIndices()) {
      const obj = engine.getRoomObject(roomId, index, UNIT_CATEGORY);
      if (!obj) continue;
      if (avatarHidingActive()) {
        hideObject(obj);
        forcedHidden.add(index);
      } else if (showMuteIcons) {
        const vis = getVis(obj);
        const model = getModel(obj);
        if (vis) {
          stripTypingBubble(vis, model);
          paintMuteBubble(vis, true, scale, model);
        }
      }
    }
  }));

  unsubs.push(api.onIncoming(2031, () => {
    if (usersReplayTimer !== null) {
      window.clearTimeout(usersReplayTimer);
      usersReplayTimer = null;
    }
    usersPacketSnapshot = null;
    replayingUsersPacket = false;
    clearMuteAllBulkOnly();
  }));

  unsubs.push(api.onIncoming(2661, ({ packet }) => {
    if (replayingUsersPacket || typeof packet.parsed !== "number") return;
    usersPacketSnapshot?.allEntries.delete(packet.parsed);
    usersPacketSnapshot?.allUnits.delete(packet.parsed);
    usersPacketSnapshot?.allUpdates.delete(packet.parsed);
  }));

  if (localMuted.size > 0 || avatarHidingActive()) syncAllVisualsNow(true);
  emit();
}
