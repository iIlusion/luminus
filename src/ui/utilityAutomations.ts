import type { RoomEntryInfo } from "../messages/incoming/RoomParsers";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import { RoomUnitSignComposer } from "../messages/outgoing/RoomUnitSignComposer";
import { readPref, writePref } from "../util/prefs";
import type { LuminusApi } from "../ws/api";

export type RoomEntryActionSettings = {
  zoomEnabled: boolean;
  zoom: number;
  enableEnabled: boolean;
  enable: number;
  handitemEnabled: boolean;
  handitem: number;
  petEnabled: boolean;
  pet: string;
  teleWithRights: boolean;
};

export type MuteSignSettings = {
  enabled: boolean;
  ignoreOnRoomEntry: boolean;
  signId: number;
};

const ROOM_ENTRY_KEY = "luminus.utilities.roomEntryActions";
const MUTE_SIGN_KEY = "luminus.utilities.muteSign";

export const ROOM_ENTRY_ACTION_DEFAULTS: RoomEntryActionSettings = {
  zoomEnabled: false,
  zoom: 1,
  enableEnabled: false,
  enable: 25,
  handitemEnabled: false,
  handitem: 1019,
  petEnabled: false,
  pet: "cat",
  teleWithRights: false,
};

export const MUTE_SIGN_DEFAULTS: MuteSignSettings = {
  enabled: false,
  ignoreOnRoomEntry: true,
  signId: 13,
};

export function getRoomEntryActionSettings(): RoomEntryActionSettings {
  return { ...ROOM_ENTRY_ACTION_DEFAULTS, ...readPref(ROOM_ENTRY_KEY, ROOM_ENTRY_ACTION_DEFAULTS) };
}

export function setRoomEntryActionSettings(settings: RoomEntryActionSettings): void {
  writePref(ROOM_ENTRY_KEY, settings);
}

export function getMuteSignSettings(): MuteSignSettings {
  return { ...MUTE_SIGN_DEFAULTS, ...readPref(MUTE_SIGN_KEY, MUTE_SIGN_DEFAULTS) };
}

export function setMuteSignSettings(settings: MuteSignSettings): void {
  writePref(MUTE_SIGN_KEY, settings);
}

let initialized = false;
let roomGeneration = 0;
let roomEnteredAt = 0;
let teleSentGeneration = -1;

function sendCommand(api: LuminusApi, command: string): void {
  api.send(new RoomUnitChatComposer(command, 0, 0));
}

function sendTeleOnce(api: LuminusApi): void {
  if (!getRoomEntryActionSettings().teleWithRights || teleSentGeneration === roomGeneration) return;
  teleSentGeneration = roomGeneration;
  sendCommand(api, ":tele");
}

function runRoomEntryActions(api: LuminusApi, entry: RoomEntryInfo | undefined): void {
  const settings = getRoomEntryActionSettings();
  const generation = roomGeneration;

  if (settings.zoomEnabled) sendCommand(api, `:zoom ${settings.zoom}`);

  const commands = [
    settings.enableEnabled ? `:enable ${settings.enable}` : null,
    settings.handitemEnabled ? `:handitem ${settings.handitem}` : null,
    settings.petEnabled && settings.pet.trim() ? `:pet ${settings.pet.trim()}` : null,
  ].filter((command): command is string => Boolean(command));

  commands.forEach((command, index) => {
    window.setTimeout(() => {
      if (generation === roomGeneration) sendCommand(api, command);
    }, index * 500);
  });

  if (entry?.isOwner) sendTeleOnce(api);
}

export function initUtilityAutomations(api: LuminusApi): void {
  if (initialized) return;
  initialized = true;

  api.onIncoming(2031, () => {
    roomGeneration++;
    roomEnteredAt = Date.now();
  });

  api.onIncoming(749, ({ packet }) => {
    runRoomEntryActions(api, packet.parsed as RoomEntryInfo | undefined);
  });

  api.onIncoming(780, () => sendTeleOnce(api));
  api.onIncoming(339, () => sendTeleOnce(api));

  api.onIncoming(566, () => {
    const settings = getMuteSignSettings();
    if (!settings.enabled) return;
    if (settings.ignoreOnRoomEntry && Date.now() - roomEnteredAt < 5_000) return;
    api.send(new RoomUnitSignComposer(settings.signId));
  });
}
