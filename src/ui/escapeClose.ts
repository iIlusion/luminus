import { readPref, writePref } from "../util/prefs";

const CLOSE_ON_ESCAPE_KEY = "luminus.interface.closeWindowsOnEscape";
let initialized = false;

export function getCloseWindowsOnEscape(): boolean {
  return readPref(CLOSE_ON_ESCAPE_KEY, true);
}

export function setCloseWindowsOnEscape(enabled: boolean): void {
  writePref(CLOSE_ON_ESCAPE_KEY, enabled);
}

export function initEscapeClose(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.defaultPrevented || !getCloseWindowsOnEscape()) return;

    const windows = [...document.querySelectorAll<HTMLElement>(
      ".draggable-window:has(.nitro-card-header-close)",
    )];
    const topWindow = windows.reduce<HTMLElement | null>((top, current) => {
      const currentZ = Number.parseFloat(getComputedStyle(current).zIndex) || 0;
      const topZ = top ? Number.parseFloat(getComputedStyle(top).zIndex) || 0 : -Infinity;
      return currentZ >= topZ ? current : top;
    }, null);

    const close = topWindow?.querySelector<HTMLElement>(".nitro-card-header-close");
    if (!close) return;
    event.preventDefault();
    close.click();
  });
}
