import type { LuminusApi } from "../ws/api";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import type { RoomChat } from "../messages/incoming/RoomChatParser";
import type { DecodedPacket } from "../protocol/types";
import { getTargetWindow } from "../ws/interceptWebSocket";
import { readPref, writePref } from "../util/prefs";

const UNIT_CATEGORY = 100;

/** Incoming chat headers (talk / shout / whisper). */
const CHAT_HEADERS = [1446, 1036, 2704] as const;

// Mute-all bulk toggle is session/room scoped — never persisted.
// Manual mutes (localMuted) and whitelist survive reload + room changes.
const PREF_HIDE = "luminus.player.muteAll.hideAvatars";
const PREF_WHITELIST = "luminus.player.muteAll.whitelist";
const PREF_MANUAL = "luminus.player.muteAll.manual";

/**
 * Avatars to process per animation frame for visuals (mute icon + hide).
 * Higher = faster full-room apply; keep bounded so main thread stays smooth.
 */
const VISUAL_PER_FRAME = 20;

/** Nitro action key used by the client's native "Calar" mute icon. */
const FIGURE_IS_MUTED = "figure_is_muted";

export interface MuteAllState {
  enabled: boolean;
  hideAvatars: boolean;
  whitelist: string[];
  /** UI only — -1 when mute-all is on (everyone except whitelist). */
  mutedCount: number;
}

type Listener = (state: MuteAllState) => void;

type NitroSprite = {
  _visible?: boolean;
  _alpha?: number;
  visible?: boolean;
  alpha?: number;
  __lmHide?: boolean;
};

type NitroVisualization = {
  _sprites?: Array<NitroSprite | null | undefined>;
  _shadow?: NitroSprite | null;
  getSprite?: (id: number) => NitroSprite | null;
  update?: (...args: unknown[]) => unknown;
  updateShadow?: (...args: unknown[]) => unknown;
  /** Luminus: fully hide this avatar (body + foot shadow). */
  __lmForceHidden?: boolean;
  __lmHidePatched?: boolean;
  __lmOrigUpdate?: (...args: unknown[]) => unknown;
  __lmOrigUpdateShadow?: (...args: unknown[]) => unknown;
};

type NitroRoomObject = {
  _visualization?: NitroVisualization | null;
  _model?: {
    getValue?: (key: string) => unknown;
    setValue?: (key: string, value: unknown) => void;
  };
};

type RoomEngineLike = {
  getRoomObject?: (roomId: number, id: number, category: number) => NitroRoomObject | null | undefined;
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
/** lowercased → display name */
const whitelist = new Map<string, string>();
/** Manual local mutes when mute-all is off (lowercased). */
const localMuted = new Set<string>();

const listeners = new Set<Listener>();
const unsubs: Array<() => void> = [];
let started = false;

// ── Visual loop (mute icon always when muted; sprite hide only if option on) ──
let visualRaf = 0;
let visualCursor = 0;
let cachedEngine: RoomEngineLike | null = null;
/** Indices we forced invisible. */
const forcedHidden = new Set<number>();
/** Last mute-icon value we applied per room index (avoid re-spamming Nitro). */
const iconApplied = new Map<number, boolean>();

function norm(name: string): string {
  return name.trim().toLowerCase();
}

function snapshot(): MuteAllState {
  return {
    enabled,
    hideAvatars,
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

/**
 * True if this unit is under local mute (never self).
 * Priority: explicit Calar/muteUser (localMuted) beats whitelist; whitelist only
 * protects from bulk mute-all.
 */
export function shouldMuteUnit(unit: RoomUnit): boolean {
  if (!unit.name) return false;
  if (isSelf(unit)) return false;
  const key = norm(unit.name);
  // Explicit mute always wins — muting a whitelisted user must re-hide/re-mute them.
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
  return enabled || localMuted.size > 0 || hideAvatars || forcedHidden.size > 0 || iconApplied.size > 0;
}

/**
 * Chat block — O(1), no RoomEngine. Instant mute of speech.
 */
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

  // Unknown speaker while mute-all is on (not self): block.
  return enabled;
}

// ── RoomEngine visuals ──

function getCachedEngine(): RoomEngineLike | null {
  if (cachedEngine?.getRoomObject) return cachedEngine;
  const page = getTargetWindow() as Window & { RoomEngine?: RoomEngineLike };
  const eng = page.RoomEngine;
  if (eng && typeof eng.getRoomObject === "function") {
    cachedEngine = eng;
    return eng;
  }
  return null;
}

/**
 * Same path the client uses for "Calar": FIGURE_IS_MUTED action → mute balloon icon.
 * Falls back to changeObjectModelData / model.setValue.
 */
function setNativeMuteIcon(index: number, muted: boolean): void {
  const engine = getCachedEngine();
  const roomId = apiRef?.room.id;
  if (!engine || roomId == null) return;
  const value = muted ? 1 : 0;

  let ok = false;
  try {
    if (engine.updateRoomObjectUserAction) {
      ok = engine.updateRoomObjectUserAction(roomId, index, FIGURE_IS_MUTED, value) === true;
    }
  } catch { /* soft */ }

  if (!ok) {
    try {
      if (engine.changeObjectModelData) {
        ok = engine.changeObjectModelData(roomId, index, UNIT_CATEGORY, FIGURE_IS_MUTED, value) === true;
      }
    } catch { /* soft */ }
  }

  if (!ok) {
    try {
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      obj?._model?.setValue?.(FIGURE_IS_MUTED, value);
    } catch { /* soft */ }
  }

  iconApplied.set(index, muted);
}

function forceSpriteHidden(sprite: NitroSprite | null | undefined): void {
  if (!sprite) return;
  sprite.__lmHide = true;
  sprite._visible = false;
  sprite.visible = false;
  sprite._alpha = 0;
  if (typeof sprite.alpha === "number") sprite.alpha = 0;
}

function forceSpriteShown(sprite: NitroSprite | null | undefined): void {
  if (!sprite || !sprite.__lmHide) return;
  delete sprite.__lmHide;
  sprite._visible = true;
  sprite.visible = true;
  sprite._alpha = 255;
  if (typeof sprite.alpha === "number") sprite.alpha = 255;
}

/** Zero every drawable layer (body, head, foot-shadow sprite, _shadow asset). */
function hideVisualizationLayers(vis: NitroVisualization): void {
  const sprites = vis._sprites;
  if (Array.isArray(sprites)) {
    for (let i = 0; i < sprites.length; i++) forceSpriteHidden(sprites[i]);
  }
  if (vis._shadow) forceSpriteHidden(vis._shadow);
  // Nitro keeps shadow on a fixed layer and updateShadow() sets visible=true every tick.
  try {
    if (typeof vis.getSprite === "function") {
      for (let i = 0; i < 8; i++) forceSpriteHidden(vis.getSprite(i));
    }
  } catch { /* soft */ }
}

/**
 * Nitro's avatar updateShadow() forces the foot shadow visible every frame.
 * Patch update + updateShadow once so after every engine tick we re-hide.
 */
function ensureHidePatch(vis: NitroVisualization): void {
  if (vis.__lmHidePatched) return;
  vis.__lmHidePatched = true;

  if (typeof vis.updateShadow === "function") {
    vis.__lmOrigUpdateShadow = vis.updateShadow.bind(vis);
    vis.updateShadow = function luminusUpdateShadow(this: NitroVisualization, ...args: unknown[]) {
      if (this.__lmForceHidden) {
        hideVisualizationLayers(this);
        return;
      }
      return vis.__lmOrigUpdateShadow?.apply(this, args);
    };
  }

  if (typeof vis.update === "function") {
    vis.__lmOrigUpdate = vis.update.bind(vis);
    vis.update = function luminusUpdate(this: NitroVisualization, ...args: unknown[]) {
      const result = vis.__lmOrigUpdate?.apply(this, args);
      if (this.__lmForceHidden) hideVisualizationLayers(this);
      return result;
    };
  }
}

function hideObjectSprites(obj: NitroRoomObject): void {
  const vis = obj._visualization;
  if (!vis) return;
  ensureHidePatch(vis);
  vis.__lmForceHidden = true;
  hideVisualizationLayers(vis);
}

function showObjectSprites(obj: NitroRoomObject): void {
  const vis = obj._visualization;
  if (!vis) return;
  vis.__lmForceHidden = false;
  const sprites = vis._sprites;
  if (Array.isArray(sprites)) {
    for (let i = 0; i < sprites.length; i++) forceSpriteShown(sprites[i]);
  }
  if (vis._shadow) forceSpriteShown(vis._shadow);
  try {
    if (typeof vis.getSprite === "function") {
      for (let i = 0; i < 8; i++) forceSpriteShown(vis.getSprite(i));
    }
  } catch { /* soft */ }
  // Let Nitro rebuild a normal shadow next tick.
  try { vis.__lmOrigUpdateShadow?.(1); } catch { /* soft */ }
}

/** Room indices that should currently be muted (never self). */
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

function applyVisualForIndex(
  engine: RoomEngineLike,
  roomId: number,
  index: number,
  wantMuted: boolean,
): void {
  const selfIdx = meIndex();
  if (selfIdx != null && index === selfIdx) return;

  // While avatars are fully hidden, NEVER drive figure_is_muted.
  // updateRoomObjectUserAction rebuilds avatar layers; the hide loop then zeros them
  // again → "Calado" / body flicker every frame.
  if (hideAvatars && wantMuted) {
    if (iconApplied.get(index) === true) {
      setNativeMuteIcon(index, false);
    }
    const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
    if (obj) {
      hideObjectSprites(obj);
      forcedHidden.add(index);
    }
    return;
  }

  // Native "Calado" icon — only when state changes (or first apply).
  if (iconApplied.get(index) !== wantMuted) {
    setNativeMuteIcon(index, wantMuted);
  }

  if (!wantMuted) {
    if (forcedHidden.has(index)) {
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      if (obj) showObjectSprites(obj);
      forcedHidden.delete(index);
    }
    return;
  }
}

function visualTick(): void {
  visualRaf = 0;
  if (!visualsNeeded()) return;

  const api = apiRef;
  const roomId = api?.room.id;
  const engine = getCachedEngine();
  if (!api || roomId == null || !engine?.getRoomObject) {
    visualRaf = requestAnimationFrame(visualTick);
    return;
  }

  const muted = listMutedIndices();
  const mutedSet = new Set(muted);

  // Cheap every-frame re-hide for units already in forcedHidden (stops foot-shadow blink
  // between batch visits). Patch on visualization also covers engine updates.
  if (hideAvatars && forcedHidden.size > 0) {
    const selfIdx = meIndex();
    for (const index of forcedHidden) {
      if (selfIdx != null && index === selfIdx) continue;
      if (!mutedSet.has(index)) continue;
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      if (obj) hideObjectSprites(obj);
    }
  }

  // Also revisit indices that still have icon/hide leftover but are no longer muted.
  const cleanup: number[] = [];
  for (const index of iconApplied.keys()) {
    if (!mutedSet.has(index) && iconApplied.get(index)) cleanup.push(index);
  }
  for (const index of forcedHidden) {
    if (!mutedSet.has(index) && !cleanup.includes(index)) cleanup.push(index);
  }

  if (muted.length === 0 && cleanup.length === 0) {
    if (iconApplied.size === 0 && forcedHidden.size === 0 && !enabled && localMuted.size === 0 && !hideAvatars) {
      return;
    }
    visualRaf = requestAnimationFrame(visualTick);
    return;
  }

  const queue = muted.length ? [...muted, ...cleanup] : cleanup;
  const n = queue.length;
  const start = visualCursor % n;
  const budget = Math.min(VISUAL_PER_FRAME, n);

  for (let k = 0; k < budget; k++) {
    const index = queue[(start + k) % n];
    applyVisualForIndex(engine, roomId, index, mutedSet.has(index));
  }
  visualCursor = start + budget;

  // Drop dead room indices from maps.
  for (const index of [...iconApplied.keys()]) {
    if (!api.room.units.has(index)) iconApplied.delete(index);
  }
  for (const index of [...forcedHidden]) {
    if (!api.room.units.has(index)) forcedHidden.delete(index);
  }

  if (visualsNeeded()) visualRaf = requestAnimationFrame(visualTick);
}

function startVisualLoop(): void {
  if (visualRaf) return;
  if (!visualsNeeded()) return;
  visualCursor = 0;
  visualRaf = requestAnimationFrame(visualTick);
}

function stopVisualLoop(): void {
  if (!visualRaf) return;
  cancelAnimationFrame(visualRaf);
  visualRaf = 0;
}

/** Clear mute icons + unhide everything we touched. */
function clearAllVisuals(): void {
  stopVisualLoop();
  const api = apiRef;
  const roomId = api?.room.id;
  const engine = getCachedEngine();
  if (api && roomId != null && engine) {
    for (const index of new Set([...iconApplied.keys(), ...forcedHidden])) {
      if (iconApplied.get(index)) setNativeMuteIcon(index, false);
      const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
      if (obj) showObjectSprites(obj);
    }
  }
  iconApplied.clear();
  forcedHidden.clear();
}

/** Apply/clear visuals for one unit immediately (infostand / whitelist). */
function applyUnitNow(unit: RoomUnit): void {
  const engine = getCachedEngine();
  const roomId = apiRef?.room.id;
  if (!engine || roomId == null || isSelf(unit)) return;
  applyVisualForIndex(engine, roomId, unit.index, shouldMuteUnit(unit));
}

export function getMuteAllState(): MuteAllState {
  return snapshot();
}

export function subscribeMuteAll(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Mutar geral ON/OFF — chat filter is instant; visuals batch on rAF.
 * Not saved to prefs: dies on reload and on room change.
 */
export function setMuteAllEnabled(on: boolean): void {
  if (enabled === on) return;
  enabled = on;

  if (on) {
    startVisualLoop();
  } else if (localMuted.size === 0) {
    // Bulk mute off and no manual mutes → clear room icons/hides.
    clearAllVisuals();
  } else {
    // Keep manual mutes; re-sync icons.
    startVisualLoop();
  }
  emit();
}

/**
 * Room change / bulk-only reset: turn mute-all off.
 * Keeps manual mutes (localMuted) and whitelist so Calar survives forever.
 */
function clearMuteAllBulkOnly(): void {
  if (!enabled) {
    // Still drop room-local hide/icon state; re-apply manuals after units load.
    forcedHidden.clear();
    iconApplied.clear();
    cachedEngine = null;
    if (localMuted.size > 0 || hideAvatars) startVisualLoop();
    emit();
    return;
  }
  enabled = false;
  forcedHidden.clear();
  iconApplied.clear();
  cachedEngine = null;
  // Manual mutes stay; re-sync their icons/hide when people are in the new room.
  if (localMuted.size > 0 || hideAvatars) startVisualLoop();
  else stopVisualLoop();
  emit();
}

export function setMuteAllHideAvatars(on: boolean): void {
  if (hideAvatars === on) return;
  hideAvatars = on;
  writePref(PREF_HIDE, on);

  if (on) {
    // Drop Calado icons so they don't fight the hide loop.
    for (const index of [...iconApplied.keys()]) {
      if (iconApplied.get(index)) setNativeMuteIcon(index, false);
    }
    startVisualLoop();
  } else {
    // Unhide sprites, then re-apply Calado for anyone still muted.
    const api = apiRef;
    const roomId = api?.room.id;
    const engine = getCachedEngine();
    if (api && roomId != null && engine) {
      for (const index of [...forcedHidden]) {
        const obj = engine.getRoomObject?.(roomId, index, UNIT_CATEGORY);
        if (obj) showObjectSprites(obj);
      }
    }
    forcedHidden.clear();
    // Force icon re-apply on next ticks.
    iconApplied.clear();
    if (enabled || localMuted.size > 0) startVisualLoop();
    else stopVisualLoop();
  }
  emit();
}

export function addMuteAllWhitelist(name: string): void {
  const key = norm(name);
  if (!key || isSelfName(key)) return;
  if (!whitelist.has(key)) whitelist.set(key, name.trim());
  saveWhitelist();
  if (localMuted.delete(key)) saveManualMutes();

  const unit = findUnitByName(name);
  if (unit) applyUnitNow(unit);
  startVisualLoop();
  emit();
}

export function removeMuteAllWhitelist(name: string): void {
  const key = norm(name);
  if (!key || isSelfName(key)) return;
  whitelist.delete(key);
  saveWhitelist();
  startVisualLoop();
  emit();
}

/** Infostand Desmutar — local only. */
export function desmuteUser(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || isSelfName(trimmed)) return;

  localMuted.delete(norm(trimmed));
  saveManualMutes();
  if (enabled) {
    addMuteAllWhitelist(trimmed);
    return;
  }

  const unit = findUnitByName(trimmed);
  if (unit) applyUnitNow(unit);
  if (!visualsNeeded()) clearAllVisuals();
  else startVisualLoop();
  emit();
}

/**
 * Mutar / Calar — always leaves whitelist (if present) and marks explicit local mute.
 * Never self. With "Esconder personagens", they become hidden again.
 */
export function muteUser(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || isSelfName(trimmed)) return;

  const key = norm(trimmed);
  // Critical: Calar after "Ouvir Habblet" must drop whitelist, otherwise hide skips them
  // while chat/icon still treat them as special → visible + muted.
  if (whitelist.has(key)) {
    whitelist.delete(key);
    saveWhitelist();
  }
  localMuted.add(key);
  saveManualMutes();

  const unit = findUnitByName(trimmed);
  if (unit) {
    // Force icon/hide re-eval even if maps had stale state.
    iconApplied.delete(unit.index);
    applyUnitNow(unit);
  }
  startVisualLoop();
  emit();
}

export function initMuteAll(api: LuminusApi): void {
  if (started) return;
  started = true;
  apiRef = api;

  // Always start with mute-all off (not persisted).
  enabled = false;
  hideAvatars = readPref(PREF_HIDE, false);
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
    addWhitelist: addMuteAllWhitelist,
    removeWhitelist: removeMuteAllWhitelist,
    muteUser,
    desmuteUser,
    isNameMuted,
  };

  for (const header of CHAT_HEADERS) {
    unsubs.push(api.blockIncoming(header, shouldBlockChatPacket));
  }

  // New users enter → visual loop will pick them up on next frames.
  unsubs.push(api.onIncoming(374, () => {
    if (enabled || localMuted.size > 0 || hideAvatars) startVisualLoop();
  }));

  // Room change: only bulk mute-all turns off; manual mutes persist.
  unsubs.push(api.onIncoming(2031, () => {
    clearMuteAllBulkOnly();
  }));

  if (localMuted.size > 0 || hideAvatars) startVisualLoop();
  emit();
}
