import { readPref, writePref } from "../util/prefs";

const PREF_KEY = "luminus.ui.contextGenderIcon";
const listeners = new Set<() => void>();

export function getContextGenderIconEnabled(): boolean {
  return readPref(PREF_KEY, true);
}

export function setContextGenderIconEnabled(enabled: boolean): void {
  writePref(PREF_KEY, enabled);
  for (const listener of listeners) listener();
}

export function subscribeContextGenderIcon(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
