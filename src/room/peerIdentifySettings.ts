import { readPref, writePref } from "../util/prefs";

const SHOW_PEER_ICONS_KEY = "luminus.peerIcons.enabled";
const LEGACY_SHOW_PEER_ICONS_KEY = "luminus.interaction.showExtensionIcons";
const ANNOUNCE_PEER_KEY = "luminus.peerIcons.announce";

const listeners = new Set<() => void>();

export function getPeerIconsEnabled(): boolean {
  return readPref(SHOW_PEER_ICONS_KEY, readPref(LEGACY_SHOW_PEER_ICONS_KEY, true));
}

export function getPeerAnnounceEnabled(): boolean {
  return readPref(ANNOUNCE_PEER_KEY, true);
}

export function setPeerIconsEnabled(enabled: boolean): void {
  writePref(SHOW_PEER_ICONS_KEY, enabled);
  listeners.forEach(listener => listener());
}

export function setPeerAnnounceEnabled(enabled: boolean): void {
  writePref(ANNOUNCE_PEER_KEY, enabled);
  listeners.forEach(listener => listener());
}

export function subscribePeerIdentifySettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
