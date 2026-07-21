import { readPref, writePref } from "../util/prefs";

const TOOLBAR_GLASS_KEY = "luminus.ui.toolbarGlass";
const RADIO_VISIBLE_KEY = "luminus.ui.radioVisible";
const PURSE_COLLAPSED_KEY = "luminus.ui.purseCollapsed";

export const UI_GLASS_CATEGORIES = ["toolbar", "menus", "roomTools", "purse", "notifications", "infostand"] as const;
export type UiGlassCategory = typeof UI_GLASS_CATEGORIES[number];
export type UiGlassSettings = Record<UiGlassCategory, boolean>;

const CATEGORY_KEYS: Record<UiGlassCategory, string> = {
  toolbar: "luminus.ui.glass.toolbar",
  menus: "luminus.ui.glass.menus",
  roomTools: "luminus.ui.glass.roomTools",
  purse: "luminus.ui.glass.purse",
  notifications: "luminus.ui.glass.notifications",
  infostand: "luminus.ui.glass.infostand"
};

const CATEGORY_LABELS: Record<UiGlassCategory, string> = {
  toolbar: "Barra superior",
  menus: "Menus e pop-ups",
  roomTools: "Ferramentas do quarto",
  purse: "Carteira e moedas",
  notifications: "Notificações",
  infostand: "Infostand e perfil"
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
    body.classList.toggle(`luminus-ui-${category}`, enabled && settings[category]);
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
  const purse = document.querySelector<HTMLElement>(".nitro-purse");
  if (!purse) return;

  const collapsed = readPref(PURSE_COLLAPSED_KEY, false);
  purse.classList.toggle("luminus-purse-collapsed", collapsed);
  if (purse.querySelector(".luminus-purse-toggle")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "luminus-purse-toggle";
  button.setAttribute("aria-label", collapsed ? "Expandir carteira" : "Recolher carteira");
  button.title = collapsed ? "Expandir carteira" : "Recolher carteira";
  button.innerHTML = purseToggleIcon(collapsed);
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const collapsed = !purse.classList.contains("luminus-purse-collapsed");
    purse.classList.toggle("luminus-purse-collapsed", collapsed);
    writePref(PURSE_COLLAPSED_KEY, collapsed);
    button.setAttribute("aria-label", collapsed ? "Expandir carteira" : "Recolher carteira");
    button.title = collapsed ? "Expandir carteira" : "Recolher carteira";
    button.innerHTML = purseToggleIcon(collapsed);
  });
  purse.appendChild(button);
}

export function initUiAppearance(): void {
  applyUiGlass();
  document.body?.classList.toggle("luminus-radio-hidden", !getRadioVisible());
  ensurePurseToggle();
  markRadioBubbles();

  if (!document.body || document.body.dataset.luminusUiObserver === "1") return;
  document.body.dataset.luminusUiObserver = "1";
  const observer = new MutationObserver(() => {
    applyUiGlass();
    ensurePurseToggle();
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
