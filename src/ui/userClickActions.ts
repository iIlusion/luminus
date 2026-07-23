import { EvaWireCodec } from "../protocol/codec";
import { normalizeHeader } from "../protocol/headerOffsets";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import { RoomUserClickComposer } from "../messages/outgoing/RoomUserClickComposer";
import { gmFetch } from "../util/gmFetch";
import { readPref, writePref } from "../util/prefs";
import type { LuminusApi } from "../ws/api";

const OUTGOING_CLICK_ALERT_PREF = "luminus.player.outgoingClickAlert";
const CLIENT_CTRL_CLICK_WINDOW_MS = 750;
const PLAYER_API_URL = "https://api.habblet.city/player/timido";
const PLAYER_CACHE_TTL_MS = 5 * 60 * 1000;
const FAKE_USER_ID = 91337001;
const FAKE_USER_INDEX = -1337;
const FAKE_USER_NAME = "Luminus";
const ROOM_USERS_HEADER = 374;
const ROOM_USER_UPDATE_HEADER = 1640;
const ROOM_USER_REMOVE_HEADER = 2661;
const ROOM_CHAT_SHOUT_HEADER = 1036;
const ROOM_CHAT_GESTURE = 0;
const ROOM_CHAT_BUBBLE = 56;
const ROOM_CHAT_URL_COUNT = 0;

interface TimidoProfileResponse {
  figure?: string;
  gender?: string;
}

interface FakePlayerLookCache {
  figure: string;
  gender: string;
  fetchedAt: number;
}

let clickListenerInstalled = false;
let clientCtrlClickUntil = 0;
let fakeLookCache: FakePlayerLookCache | null = null;
let fakeLookRefresh: Promise<FakePlayerLookCache> | null = null;

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function now(): number {
  return Date.now();
}

function getCachedFakeLook(api: LuminusApi): FakePlayerLookCache {
  return fakeLookCache ?? {
    figure: api.myself?.figure ?? "",
    gender: api.myself?.gender ?? "M",
    fetchedAt: 0,
  };
}

async function refreshFakeLook(api: LuminusApi): Promise<FakePlayerLookCache> {
  const cached = getCachedFakeLook(api);
  if (fakeLookCache && now() - cached.fetchedAt < PLAYER_CACHE_TTL_MS) return cached;
  if (fakeLookRefresh) return fakeLookRefresh;

  fakeLookRefresh = (async () => {
    try {
      const data = await gmFetch<TimidoProfileResponse>(PLAYER_API_URL);
      fakeLookCache = {
        figure: data.figure?.trim() || api.myself?.figure || cached.figure,
        gender: (data.gender?.trim() || api.myself?.gender || cached.gender || "M").toUpperCase().startsWith("F") ? "F" : "M",
        fetchedAt: now(),
      };
    } catch {
      fakeLookCache = {
        figure: cached.figure || api.myself?.figure || "",
        gender: cached.gender || api.myself?.gender || "M",
        fetchedAt: now(),
      };
    }
    return fakeLookCache;
  })().finally(() => { fakeLookRefresh = null; });

  return fakeLookRefresh;
}

export function getOutgoingClickAlertEnabled(): boolean {
  return readPref(OUTGOING_CLICK_ALERT_PREF, true);
}

export function setOutgoingClickAlertEnabled(enabled: boolean): void {
  writePref(OUTGOING_CLICK_ALERT_PREF, enabled);
}

export function findRoomUnitByName(api: LuminusApi, name: string): RoomUnit | undefined {
  const wanted = normalizeText(name);
  for (const unit of api.room.units.values()) {
    if (normalizeText(unit.name) === wanted) return unit;
  }
  return undefined;
}

export function handleCtrlUserClick(
  event: { ctrlKey?: boolean; preventDefault(): void; stopPropagation(): void },
  api: LuminusApi,
  name: string
): boolean {
  if (!event.ctrlKey) return false;
  event.preventDefault();
  event.stopPropagation();
  return sendRoomUserClickByName(api, name, true);
}

export function sendRoomUserClickByName(api: LuminusApi, name: string, emitAlert: boolean): boolean {
  const unit = findRoomUnitByName(api, name);
  return unit ? sendRoomUserClick(api, unit, emitAlert) : false;
}

export function sendRoomUserClick(api: LuminusApi, unit: RoomUnit, emitAlert: boolean): boolean {
  const ok = api.send(new RoomUserClickComposer(unit.index));
  if (ok && emitAlert && getOutgoingClickAlertEnabled()) void emitOutgoingClickAlert(api, unit);
  return ok;
}

export function initOutgoingClickAlerts(api: LuminusApi): void {
  if (clickListenerInstalled) return;
  clickListenerInstalled = true;

  void refreshFakeLook(api);
  window.setInterval(() => { void refreshFakeLook(api); }, PLAYER_CACHE_TTL_MS);

  window.addEventListener("pointerdown", event => {
    if (event.button === 0 && event.ctrlKey) clientCtrlClickUntil = now() + CLIENT_CTRL_CLICK_WINDOW_MS;
  }, true);

  api.onOutgoing(431, ({ packet, origin }) => {
    if (origin !== "client") return;
    if (!getOutgoingClickAlertEnabled()) return;

    const blockClickEnabled = Boolean(readPref<Record<string, boolean>>("luminus.player", { blockClick: false }).blockClick);
    const bypassedWithCtrl = now() <= clientCtrlClickUntil;
    if (blockClickEnabled && !bypassedWithCtrl) return;
    clientCtrlClickUntil = 0;

    if (packet.body.byteLength < 4) return;
    const roomIndex = new DataView(packet.body).getInt32(0, false);
    const unit = api.room.units.get(roomIndex);
    if (unit) void emitOutgoingClickAlert(api, unit);
  });
}

async function emitOutgoingClickAlert(api: LuminusApi, unit: RoomUnit): Promise<void> {
  const socket = api.socket as (WebSocket & { handleNativeMessage?: (event: MessageEvent) => void }) | null;
  const selfUnit = api.myself?.index != null ? api.room.units.get(api.myself.index) : null;
  if (!socket || typeof socket.handleNativeMessage !== "function" || !selfUnit) return;

  const look = await refreshFakeLook(api);
  const message = `Voce clicou em ${unit.name}`;

  injectIncomingPacket(socket, api, ROOM_USERS_HEADER, [
    1,
    FAKE_USER_ID,
    FAKE_USER_NAME,
    "",
    look.figure,
    FAKE_USER_INDEX,
    selfUnit.x,
    selfUnit.y,
    String(selfUnit.z),
    selfUnit.direction,
    1,
    look.gender,
    0,
    0,
    "",
    "",
    0,
    false,
  ]);
  await sleep(6);

  injectIncomingPacket(socket, api, ROOM_USER_UPDATE_HEADER, [
    1,
    FAKE_USER_INDEX,
    selfUnit.x,
    selfUnit.y,
    String(selfUnit.z),
    selfUnit.direction,
    selfUnit.direction,
    "",
  ]);
  await sleep(6);

  injectIncomingPacket(socket, api, ROOM_CHAT_SHOUT_HEADER, [
    FAKE_USER_INDEX,
    message,
    ROOM_CHAT_GESTURE,
    ROOM_CHAT_BUBBLE,
    ROOM_CHAT_URL_COUNT,
    message.length,
  ]);
  await sleep(8);

  injectIncomingPacket(socket, api, ROOM_USER_REMOVE_HEADER, [String(FAKE_USER_INDEX)]);
}

function injectIncomingPacket(
  socket: WebSocket & { handleNativeMessage?: (event: MessageEvent) => void },
  api: LuminusApi,
  header: number,
  values: Array<number | string | boolean>
): void {
  const incomingOffset = api.getOffsets().incoming ?? 0;
  const wireHeader = normalizeHeader(header + incomingOffset);
  const data = new EvaWireCodec().encode(wireHeader, values);
  socket.handleNativeMessage?.(new MessageEvent("message", { data }));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}
