import { readPref, writePref } from "../util/prefs";

const TOOLBAR_GLASS_KEY = "luminus.ui.toolbarGlass";
const RADIO_VISIBLE_KEY = "luminus.ui.radioVisible";
const PURSE_COLLAPSED_KEY = "luminus.ui.purseCollapsed";
const ROOM_TOOLS_COLLAPSED_KEY = "luminus.ui.roomToolsCollapsed";
let purseCollapsedState: boolean | null = null;
let roomToolsCollapsedState: boolean | null = null;

export const UI_GLASS_CATEGORIES = ["toolbar", "menus", "roomTools", "purse", "notifications", "infostand", "userChooser"] as const;
export type UiGlassCategory = typeof UI_GLASS_CATEGORIES[number];
export type UiGlassSettings = Record<UiGlassCategory, boolean>;

const CATEGORY_KEYS: Record<UiGlassCategory, string> = {
  toolbar: "luminus.ui.glass.toolbar",
  menus: "luminus.ui.glass.menus",
  roomTools: "luminus.ui.glass.roomTools",
  purse: "luminus.ui.glass.purse",
  notifications: "luminus.ui.glass.notifications",
  infostand: "luminus.ui.glass.infostand",
  userChooser: "luminus.ui.glass.userChooser"
};

const CATEGORY_LABELS: Record<UiGlassCategory, string> = {
  toolbar: "Barra superior",
  menus: "Menus e pop-ups",
  roomTools: "Ferramentas do quarto",
  purse: "Carteira e moedas",
  notifications: "Notificações",
  infostand: "Infostand e perfil",
  userChooser: "Lista de Habblets"
};

export function getUiGlassCategoryLabel(category: UiGlassCategory): string {
  return CATEGORY_LABELS[category];
}

export function getToolbarGlass(): boolean {
  return readPref(TOOLBAR_GLASS_KEY, true);
}

export function getUiGlassSettings(): UiGlassSettings {
  return Object.fromEntries(UI_GLASS_CATEGORIES.map(category => [
    category,
    readPref(CATEGORY_KEYS[category], true)
  ])) as UiGlassSettings;
}

function applyUiGlass(): void {
  const body = document.body;
  if (!body) return;

  const enabled = getToolbarGlass();
  const settings = getUiGlassSettings();
  for (const category of UI_GLASS_CATEGORIES) {
    const className = category === "roomTools"
      ? "luminus-ui-room-tools"
      : category === "userChooser"
        ? "luminus-ui-user-chooser"
        : `luminus-ui-${category}`;
    body.classList.toggle(className, enabled && settings[category]);
    // Remove the camel-case class used by older bundles so the active state
    // has one canonical selector and never leaves a stale visual behind.
    if (category === "roomTools") body.classList.remove("luminus-ui-roomTools");
    if (category === "userChooser") body.classList.remove("luminus-ui-userChooser");
  }
}

export function setToolbarGlass(enabled: boolean): void {
  writePref(TOOLBAR_GLASS_KEY, enabled);
  applyUiGlass();
}

export function setUiGlassCategory(category: UiGlassCategory, enabled: boolean): void {
  writePref(CATEGORY_KEYS[category], enabled);
  applyUiGlass();
}

export function getRadioVisible(): boolean {
  return readPref(RADIO_VISIBLE_KEY, true);
}

export function setRadioVisible(visible: boolean): void {
  writePref(RADIO_VISIBLE_KEY, visible);
  document.body?.classList.toggle("luminus-radio-hidden", !visible);
  markRadioBubbles();
}

function markRadioBubbles(): void {
  document.querySelectorAll<HTMLElement>(".nitro-notification-bubble").forEach(bubble => {
    bubble.classList.toggle("luminus-radio-bubble", Boolean(bubble.querySelector(".radio-item, audio[src*='stream']")));
  });
}

function purseToggleIcon(collapsed: boolean): string {
  const path = collapsed ? "m6 9 6 6 6-6" : "m18 15-6-6-6 6";
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${path}"/></svg>`;
}

function ensurePurseToggle(): void {
  // The toggle belongs to the main `nitro-purse` row only. Seasonal currency
  // rows remain siblings outside this shell.
  const purse = document.querySelector<HTMLElement>(".nitro-purse");
  if (!purse) return;
  const existingShell = purse.parentElement?.matches(".luminus-purse-shell")
    ? purse.parentElement
    : null;
  const host = existingShell?.parentElement ?? purse.parentElement;
  const shell = existingShell ?? document.createElement("div");
  if (!existingShell) {
    shell.className = "luminus-purse-shell";
    host?.insertBefore(shell, purse);
    shell.appendChild(purse);
  }
  const purseGroup = purse.closest<HTMLElement>(".nitro-purse-container") ?? host;
  const seasonalRows = [...new Set([
    ...(purseGroup?.querySelectorAll<HTMLElement>(".nitro-purse-seasonal-currency") ?? []),
    ...(host?.querySelectorAll<HTMLElement>(".nitro-purse-seasonal-currency") ?? []),
  ])];
  purse.classList.remove("luminus-purse-collapsed");
  const purseRect = purse.getBoundingClientRect();
  if (purseRect.width > 0) shell.style.setProperty("--luminus-purse-width", `${purseRect.width}px`);

  const collapsed = purseCollapsedState ?? (purseCollapsedState = readPref(PURSE_COLLAPSED_KEY, false));
  purse.classList.toggle("luminus-purse-collapsed", collapsed);
  seasonalRows.forEach(row => row.classList.toggle("luminus-purse-seasonal-collapsed", collapsed));
  host?.classList.add("luminus-purse-host");
  host?.classList.remove("luminus-purse-host-collapsed");
  shell.classList.toggle("luminus-purse-shell-collapsed", collapsed);

  let button = shell.querySelector<HTMLButtonElement>(":scope > .luminus-purse-toggle");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "luminus-purse-toggle";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const nextCollapsed = !purse.classList.contains("luminus-purse-collapsed");
      purseCollapsedState = nextCollapsed;
      purse.classList.toggle("luminus-purse-collapsed", nextCollapsed);
      seasonalRows.forEach(row => row.classList.toggle("luminus-purse-seasonal-collapsed", nextCollapsed));
      shell.classList.toggle("luminus-purse-shell-collapsed", nextCollapsed);
      host?.classList.remove("luminus-purse-host-collapsed");
      writePref(PURSE_COLLAPSED_KEY, nextCollapsed);
      button!.dataset.luminusCollapsed = String(nextCollapsed);
      button!.setAttribute("aria-expanded", String(!nextCollapsed));
      button!.setAttribute("aria-label", nextCollapsed ? "Expandir carteira" : "Recolher carteira");
      button!.title = nextCollapsed ? "Expandir carteira" : "Recolher carteira";
      button!.innerHTML = purseToggleIcon(nextCollapsed);
    });
  }
  const purseState = String(collapsed);
  if (button.dataset.luminusCollapsed !== purseState) {
    button.dataset.luminusCollapsed = purseState;
    button.innerHTML = purseToggleIcon(collapsed);
  }
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", collapsed ? "Expandir carteira" : "Recolher carteira");
  button.title = collapsed ? "Expandir carteira" : "Recolher carteira";
  if (button.parentElement !== shell || button.nextElementSibling !== purse) shell.insertBefore(button, purse);
}

function roomToolsToggleIcon(collapsed: boolean): string {
  const path = collapsed ? "m9 6 6 6-6 6" : "m15 18-6-6 6-6";
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${path}"/></svg>`;
}

function ensureRoomToolsToggle(): void {
  const tools = document.querySelector<HTMLElement>(".nitro-room-tools");
  if (!tools) return;
  const existingShell = tools.parentElement?.matches(".luminus-room-tools-shell")
    ? tools.parentElement
    : null;
  const host = existingShell?.parentElement ?? tools.parentElement;
  const shell = existingShell ?? document.createElement("div");
  if (!existingShell) {
    shell.className = "luminus-room-tools-shell";
    host?.insertBefore(shell, tools);
    shell.appendChild(tools);
  }

  const collapsed = roomToolsCollapsedState ?? (roomToolsCollapsedState = readPref(ROOM_TOOLS_COLLAPSED_KEY, false));
  tools.classList.toggle("luminus-room-tools-collapsed", collapsed);
  host?.classList.add("luminus-room-tools-host");
  host?.classList.toggle("luminus-room-tools-host-collapsed", collapsed);
  shell.classList.toggle("luminus-room-tools-shell-collapsed", collapsed);

  let button = shell.querySelector<HTMLButtonElement>(":scope > .luminus-room-tools-toggle");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "luminus-room-tools-toggle";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const nextCollapsed = !tools.classList.contains("luminus-room-tools-collapsed");
      roomToolsCollapsedState = nextCollapsed;
      tools.classList.toggle("luminus-room-tools-collapsed", nextCollapsed);
      shell.classList.toggle("luminus-room-tools-shell-collapsed", nextCollapsed);
      host?.classList.toggle("luminus-room-tools-host-collapsed", nextCollapsed);
      writePref(ROOM_TOOLS_COLLAPSED_KEY, nextCollapsed);
      button!.dataset.luminusCollapsed = String(nextCollapsed);
      button!.setAttribute("aria-label", nextCollapsed ? "Expandir ferramentas do quarto" : "Recolher ferramentas do quarto");
      button!.title = nextCollapsed ? "Expandir ferramentas do quarto" : "Recolher ferramentas do quarto";
      button!.setAttribute("aria-expanded", String(!nextCollapsed));
      button!.innerHTML = roomToolsToggleIcon(nextCollapsed);
    });
  }
  const roomToolsState = String(collapsed);
  if (button.dataset.luminusCollapsed !== roomToolsState) {
    button.dataset.luminusCollapsed = roomToolsState;
    button.innerHTML = roomToolsToggleIcon(collapsed);
  }
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", collapsed ? "Expandir ferramentas do quarto" : "Recolher ferramentas do quarto");
  button.title = collapsed ? "Expandir ferramentas do quarto" : "Recolher ferramentas do quarto";
  if (button.parentElement !== shell || button.nextElementSibling !== tools) shell.insertBefore(button, tools);
}

export function initUiAppearance(): void {
  applyUiGlass();
  document.body?.classList.toggle("luminus-radio-hidden", !getRadioVisible());
  ensurePurseToggle();
  ensureRoomToolsToggle();
  markRadioBubbles();

  if (!document.body || document.body.dataset.luminusUiObserver === "1") return;
  document.body.dataset.luminusUiObserver = "1";
  const observer = new MutationObserver(() => {
    applyUiGlass();
    ensurePurseToggle();
    ensureRoomToolsToggle();
    markRadioBubbles();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function getWardrobeStacked(): boolean {
  return readPref("luminus.ui.wardrobeStacked", true);
}

export function setWardrobeStacked(enabled: boolean): void {
  writePref("luminus.ui.wardrobeStacked", enabled);
  document.body?.classList.toggle("luminus-wardrobe-stacked", enabled);
}
