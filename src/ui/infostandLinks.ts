import type { LuminusApi } from "../ws/api";
import type { RoomUnit } from "../messages/incoming/UsersParser";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import { findLinkInMotto, toUrl } from "../links/linkDomains";
import {
  recordLink, rememberLink, getLinksFor, hasLinks, hasOpenedLink, hasBlockedLink,
  isLinkBlocked, toggleLinkBlocked, fmtClickInfo
} from "../links/linkStore";
import { desmuteUser, isNameMuted, muteUser, subscribeMuteAll } from "../room/muteAll";
import {
  getState as getFurniClassHideState,
  isFocusHidden,
  onFurnitureInfostand,
  subscribeFurniClassHide,
  toggleFocusedClass,
} from "../room/furniClassHide";
import { isBotUnitType } from "../chat/roomChatPresentation";
import { getContextGenderIconEnabled, subscribeContextGenderIcon } from "./contextGender";

const ACTIONS: { label: string; cmd: string }[] = [
  { label: "Abraçar",  cmd: "abracar" },
  { label: "Beijar",   cmd: "kis" },
  { label: "Puxar",    cmd: "pull" },
  { label: "Empurrar", cmd: "push" },
  { label: "Soco",     cmd: "soco" },
];

let apiRef: LuminusApi | null = null;
let openMenuFor: string | null = null;

const EYE_ICON_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="#26de81" stroke-width="2"/>
    <circle cx="12" cy="12" r="3" fill="#26de81"/>
  </svg>`;

/** Open eye — class currently visible (click to hide). */
const FURNI_EYE_OPEN_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
  </svg>`;

/** Eye-off — class currently hidden (click to show). */
const FURNI_EYE_OFF_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

const LINK_ICON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.9 5.03" stroke="#8ea2ff" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07l1.22-1.22" stroke="#8ea2ff" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

const BLOCK_ICON_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" stroke="#ff8a8a" stroke-width="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#ff8a8a" stroke-width="2"/>
  </svg>`;

const GENDER_ICON_SVG: Record<"M" | "F", string> = {
  F: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15v7M9 19h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="9" r="6" stroke="currentColor" stroke-width="2"/></svg>`,
  M: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 3h5v5M21 3l-6.75 6.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="14" r="6" stroke="currentColor" stroke-width="2"/></svg>`,
};

const BOT_ICON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="3" stroke="currentColor" stroke-width="2"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function closeLinkMenu(): void {
  document.getElementById("luminus-link-ctxmenu")?.remove();
  openMenuFor = null;
}

function removeActionBar(): void {
  document.getElementById("luminus-action-bar")?.remove();
}

function findRoomUnitByName(name: string): RoomUnit | undefined {
  for (const unit of apiRef?.room.units.values() ?? []) {
    if (unit.name === name) return unit;
  }
  return undefined;
}

function showLinkMenu(name: string, anchor: Element): void {
  closeLinkMenu();
  const links = getLinksFor(name);
  if (links.length === 0) return;

  const rect = anchor.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = "luminus-link-ctxmenu";
  menu.style.top = `${rect.top}px`;
  menu.style.right = `${window.innerWidth - rect.left + 10}px`;

  const header = document.createElement("div");
  header.className = "luminus-ctxmenu-header";
  const title = document.createElement("span");
  title.className = "luminus-ctxmenu-title";
  title.textContent = name;
  const closeBtn = document.createElement("button");
  closeBtn.className = "luminus-ctxmenu-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", e => { e.stopPropagation(); closeLinkMenu(); });
  header.appendChild(title);
  header.appendChild(closeBtn);
  menu.appendChild(header);

  for (const rec of links) {
    const unit = findRoomUnitByName(name);
    const a = document.createElement("a");
    a.href = toUrl(rec.link);
    a.target = "_blank";
    a.rel = "noreferrer";
    a.addEventListener("click", () => {
      recordLink(name, rec.link, unit?.sex);
      renderContextNameIcon(menu, name);
    });

    const urlSpan = document.createElement("span");
    urlSpan.className = "luminus-ctxmenu-link-url";
    urlSpan.textContent = rec.link;

    const metaSpan = document.createElement("span");
    metaSpan.className = "luminus-ctxmenu-link-meta";
    metaSpan.textContent = fmtClickInfo(rec);

    const block = document.createElement("button");
    block.type = "button";
    block.className = "luminus-link-block-btn";
    block.textContent = isLinkBlocked(name, rec.link) ? "Desbloquear" : "Bloquear";
    block.title = "Altera apenas o ícone; o link continua abrindo normalmente";
    block.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      toggleLinkBlocked(name, rec.link);
      closeLinkMenu();
      renderPersonLinkIcon(document.querySelector<HTMLElement>(".nitro-infostand-container .goldfish.fw-bold") ?? document.querySelector<HTMLElement>(".user-profile .profile-bar .username") ?? anchor as HTMLElement, name);
    });

    a.appendChild(urlSpan);
    a.appendChild(metaSpan);
    metaSpan.appendChild(block);
    menu.appendChild(a);
  }

  document.body.appendChild(menu);
  openMenuFor = name;

  window.setTimeout(() => {
    const close = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        closeLinkMenu();
        window.removeEventListener("mousedown", close);
      }
    };
    window.addEventListener("mousedown", close);
  }, 0);
}

function isNameOnlyMenu(menu: HTMLElement): boolean {
  if (menu.classList.contains("nitro-widget-high-score")) return false;
  if (menu.classList.contains("name-only") || menu.classList.contains("is-name-only")) return true;
  if (menu.querySelector(":scope > .menu-header.is-name-only, :scope > .is-name-only")) return true;
  // Small hover-name menus: plain text chip, no action list items.
  if (!menu.classList.contains("nitro-context-menu")) return false;
  if (menu.querySelector(".menu-item")) return false;
  const text = (menu.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length < 40;
}

function linkIconState(name: string): { state: string; blocked: boolean; seen: boolean; html: string; title: string } | null {
  if (!hasLinks(name)) return null;
  const blocked = hasBlockedLink(name);
  const seen = hasOpenedLink(name);
  const state = blocked ? "blocked" : seen ? "seen" : "pending";
  return {
    state,
    blocked,
    seen,
    html: blocked ? BLOCK_ICON_SVG : seen ? EYE_ICON_SVG : LINK_ICON_SVG,
    title: blocked
      ? "Link bloqueado visualmente — clique para ver ou desbloquear"
      : seen
        ? "Você já clicou em um link dessa pessoa — clique para ver todos"
        : "Essa pessoa tem link na missão — clique para ver todos",
  };
}

function normalizedGender(unit: RoomUnit | undefined): "M" | "F" | null {
  const gender = unit?.sex?.trim().toUpperCase();
  if (gender?.startsWith("F")) return "F";
  if (gender?.startsWith("M")) return "M";
  return null;
}

function renderContextGenderIcon(host: HTMLElement, unit: RoomUnit | undefined): void {
  let icon = host.querySelector<HTMLElement>(":scope > .luminus-gender-icon");
  const isBot = Boolean(unit && isBotUnitType(unit.type));
  const gender = !isBot && unit?.type === 1 ? normalizedGender(unit) : null;
  if (!getContextGenderIconEnabled() || (!isBot && !gender)) {
    icon?.remove();
    return;
  }

  if (!icon) {
    icon = document.createElement("span");
    icon.className = "luminus-gender-icon";
    icon.setAttribute("role", "img");
    host.prepend(icon);
  } else if (host.firstChild !== icon) {
    host.prepend(icon);
  }
  icon.dataset.gender = gender ?? "";
  icon.dataset.role = isBot ? "bot" : "gender";
  icon.classList.toggle("is-bot", isBot);
  icon.classList.toggle("gender-f", gender === "F");
  icon.classList.toggle("gender-m", gender === "M");
  icon.title = isBot ? "Bot" : gender === "F" ? "Feminino" : "Masculino";
  icon.setAttribute("aria-label", icon.title);
  icon.innerHTML = isBot ? BOT_ICON_SVG : GENDER_ICON_SVG[gender!];
}

/**
 * Link / eye / blocked icon on name-only menus and user context-menu headers.
 */
function renderContextNameIcon(host: HTMLElement, name: string, anchor: HTMLElement = host): void {
  let icon = host.querySelector<HTMLElement>(":scope > .luminus-name-only-link-icon");
  const unit = findRoomUnitByName(name);
  renderContextGenderIcon(host, unit);
  if (unit && unit.type !== 1) {
    icon?.remove();
    return;
  }
  const mottoLink = unit ? findLinkInMotto(unit.motto) : null;
  if (mottoLink) rememberLink(name, mottoLink.text, unit?.sex);

  const info = linkIconState(name);
  if (!info) {
    icon?.remove();
    delete host.dataset.luminusNameOnlyName;
    return;
  }

  if (icon && host.dataset.luminusNameOnlyName === name && icon.dataset.luminusIconState === info.state) return;

  suppressObserverUntil = performance.now() + 50;

  if (!icon) {
    icon = document.createElement("span");
    icon.className = "luminus-name-only-link-icon";
    icon.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const currentName = host.dataset.luminusNameOnlyName;
      if (!currentName) return;
      if (openMenuFor === currentName) closeLinkMenu();
      else showLinkMenu(currentName, anchor);
    });
    host.appendChild(icon);
  }

  host.dataset.luminusNameOnlyName = name;
  icon.dataset.luminusIconState = info.state;
  icon.classList.toggle("luminus-eye", info.seen && !info.blocked);
  icon.classList.toggle("luminus-link-pending", !info.seen && !info.blocked);
  icon.classList.toggle("luminus-link-blocked", info.blocked);
  icon.title = info.title;
  icon.innerHTML = info.html;
}

function nameOnlyMenuName(menu: HTMLElement): string {
  const icon = menu.querySelector(".luminus-name-only-link-icon");
  const genderIcon = menu.querySelector(".luminus-gender-icon");
  // Prefer plain text content excluding our icon.
  const name = [...menu.childNodes]
    .filter(node => node !== icon && node !== genderIcon && !(node instanceof Element && (
      node.classList.contains("luminus-name-only-link-icon") || node.classList.contains("luminus-gender-icon")
    )))
    .map(node => node.textContent ?? "")
    .join("")
    .trim();
  if (name) return name;
  return (menu.textContent ?? "").replace(/\s+/g, " ").trim();
}

function processNameOnlyContextMenu(menu: HTMLElement): void {
  if (!isNameOnlyMenu(menu)) return;
  const name = nameOnlyMenuName(menu);
  if (name) renderContextNameIcon(menu, name, menu);
}

function processNameOnlyContextMenus(root: ParentNode = document): void {
  if (root instanceof HTMLElement && root.matches(".nitro-context-menu") && isNameOnlyMenu(root)) {
    processNameOnlyContextMenu(root);
  }
  root.querySelectorAll?.<HTMLElement>(".nitro-context-menu.name-only, .nitro-context-menu.is-name-only, .nitro-context-menu").forEach(menu => {
    if (isNameOnlyMenu(menu)) processNameOnlyContextMenu(menu);
  });
}

const CALAR_LABEL = "Calar";
const OUVIR_LABEL = "Ouvir Habblet";

function menuItemLabel(item: HTMLElement): string {
  return (item.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isCalarMenuItem(item: HTMLElement): boolean {
  if (item.dataset.luminusMuteItem === "1") return true;
  const text = menuItemLabel(item);
  if (!text) return false;
  // Exact or contains (icons/extra nodes sometimes wrap the label).
  if (text === CALAR_LABEL || text === OUVIR_LABEL) return true;
  if (text.includes(OUVIR_LABEL)) return true;
  // "Calar" alone as word — avoid matching unrelated long labels.
  return /^calar$/i.test(text) || text.toLowerCase() === "calar";
}

function contextMenuUserName(menu: HTMLElement): string {
  const header = menu.querySelector<HTMLElement>(".menu-header");
  if (!header) return "";
  // Prefer direct text nodes / non-icon children (header may nest status UI).
  const fromNodes = [...header.childNodes]
    .filter(n => !(n instanceof Element && (
      n.classList.contains("luminus-name-only-link-icon")
      || n.classList.contains("luminus-gender-icon")
      || n.classList.contains("luminus-person-link-icon")
    )))
    .map(n => n.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (fromNodes) return fromNodes;
  return (header.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Habblet user menu: `.position-absolute.nitro-context-menu.visible`
 * When the target is muted by Luminus (incl. Mutar geral), rewrite "Calar" → "Ouvir Habblet".
 */
function processUserContextMenu(menu: HTMLElement): void {
  if (!menu.classList.contains("nitro-context-menu")) return;
  // Skip high-score widgets.
  if (menu.classList.contains("nitro-widget-high-score")) return;
  // Name-only hover menus use their own path.
  if (isNameOnlyMenu(menu)) {
    processNameOnlyContextMenu(menu);
    return;
  }

  const header = menu.querySelector<HTMLElement>(".menu-header");
  const name = contextMenuUserName(menu);
  if (!name) return;

  // Link / eye / blocked icon next to the nickname in the full user menu header.
  if (header) renderContextNameIcon(header, name, menu);

  // Prefer .menu-item.list-item; fall back to any .menu-item (Habblet markup drifts).
  const items = menu.querySelectorAll<HTMLElement>(".menu-item.list-item, .menu-item");
  let calarItem: HTMLElement | null = null;
  for (const item of items) {
    if (isCalarMenuItem(item)) {
      calarItem = item;
      break;
    }
  }
  if (!calarItem) return;

  const muted = isNameMuted(name);
  const want = muted ? OUVIR_LABEL : CALAR_LABEL;
  const state = muted ? "ouvir" : "calar";

  if (calarItem.dataset.luminusMuteState !== state || menuItemLabel(calarItem) !== want) {
    suppressObserverUntil = performance.now() + 80;
    calarItem.dataset.luminusMuteItem = "1";
    calarItem.dataset.luminusMuteState = state;
    calarItem.dataset.luminusMuteName = name;
    calarItem.textContent = want;
  } else {
    calarItem.dataset.luminusMuteName = name;
  }

  // Always route Calar/Ouvir through Luminus so whitelist stays consistent.
  // Native Calar alone left whitelist intact → visible + muted when hide was on.
  if (calarItem.dataset.luminusMuteBound !== "1") {
    calarItem.dataset.luminusMuteBound = "1";
    calarItem.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const currentName = calarItem!.dataset.luminusMuteName || name;
      suppressObserverUntil = performance.now() + 80;
      if (isNameMuted(currentName)) {
        desmuteUser(currentName);
        calarItem!.dataset.luminusMuteState = "calar";
        calarItem!.textContent = CALAR_LABEL;
      } else {
        muteUser(currentName); // removes whitelist + mutes (+ hide if option on)
        calarItem!.dataset.luminusMuteState = "ouvir";
        calarItem!.textContent = OUVIR_LABEL;
      }
    }, true);
  } else {
    calarItem.dataset.luminusMuteName = name;
  }
}

function processUserContextMenus(root: ParentNode = document): void {
  if (root instanceof HTMLElement && root.matches(".nitro-context-menu")) {
    processUserContextMenu(root);
  }
  root.querySelectorAll?.<HTMLElement>(".nitro-context-menu.visible, .position-absolute.nitro-context-menu").forEach(processUserContextMenu);
}

/** Nitro sometimes paints "Calar" after our first pass — re-assert while the menu is open. */
function scheduleUserMenuMuteSync(menu: HTMLElement): void {
  const run = () => {
    if (!menu.isConnected) return;
    processUserContextMenu(menu);
  };
  requestAnimationFrame(run);
  window.setTimeout(run, 50);
  window.setTimeout(run, 150);
}

function renderPersonLinkIcon(nameEl: HTMLElement, name: string): void {
  const existing = nameEl.nextElementSibling;
  let icon = existing?.classList.contains("luminus-person-link-icon")
    ? existing as HTMLElement
    : null;
  if (!hasLinks(name)) {
    icon?.remove();
    return;
  }

  const blocked = hasBlockedLink(name);
  const seen = hasOpenedLink(name);
  const state = blocked ? "blocked" : seen ? "seen" : "pending";
  if (icon && icon.dataset.luminusIconState === state) return;

  if (!icon) {
    icon = document.createElement("span");
    icon.className = "luminus-person-link-icon";
    icon.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      if (openMenuFor === name) closeLinkMenu();
      else showLinkMenu(name, nameEl.closest(".nitro-infostand.rounded")
        ?? nameEl.closest(".nitro-infostand-container")
        ?? nameEl.closest(".user-profile")
        ?? nameEl.parentElement
        ?? nameEl);
    });
    nameEl.insertAdjacentElement("afterend", icon);
  }

  icon.dataset.luminusIconState = state;
  icon.classList.toggle("luminus-eye", seen && !blocked);
  icon.classList.toggle("luminus-link-pending", !seen && !blocked);
  icon.title = blocked
    ? "Link bloqueado visualmente — clique para ver ou desbloquear"
    : seen
      ? "Você já clicou em um link dessa pessoa — clique para ver todos"
      : "Essa pessoa tem link na missão — clique para ver todos";
  icon.innerHTML = blocked ? BLOCK_ICON_SVG : seen ? EYE_ICON_SVG : LINK_ICON_SVG;
}

// Shared by the infostand and the full profile window: wraps just the link substring (not
// the whole motto) as a clickable link when it matches a known domain, and keeps the eye
// icon in sync. Returns the name.
function processMotto(nameEl: HTMLElement, mottoEl: HTMLElement): string {
  const name = nameEl.textContent?.trim() ?? "";
  if (!name) return name;
  const unit = findRoomUnitByName(name);
  if (unit && unit.type !== 1) return name;

  if (!mottoEl.querySelector("a[data-luminus-link]")) {
    const motto = mottoEl.textContent ?? "";
    const match = findLinkInMotto(motto);
    if (match) {
      const a = document.createElement("a");
      a.href = toUrl(match.text);
      a.target = "_blank";
      a.rel = "noreferrer";
      a.dataset.luminusLink = "1";
      a.className = "luminus-motto-link";
      a.textContent = match.text;
      a.addEventListener("click", e => {
        e.stopPropagation();
        recordLink(name, match.text, unit?.sex);
        renderPersonLinkIcon(nameEl, name);
      });

      mottoEl.textContent = "";
      mottoEl.append(motto.slice(0, match.start), a, motto.slice(match.end));
      rememberLink(name, match.text, unit?.sex);
    }
  }

  renderPersonLinkIcon(nameEl, name);
  return name;
}

// Inserted as a real sibling of .nitro-infostand.rounded, inside .nitro-infostand-container —
// same spot and layout (d-flex/gap/justify-content-end) Nitro uses for its own furni action
// row (Mover/Girar/...). Being a normal flex child of the bottom-anchored container means the
// infostand card is pushed up automatically to make room — no manual positioning needed.
function renderActionBar(container: Element, name: string): void {
  let bar = document.getElementById("luminus-action-bar");

  if (bar && (bar.dataset.name !== name || bar.parentElement !== container)) {
    bar.remove();
    bar = null;
  }

  if (!bar) {
    bar = document.createElement("div");
    bar.id = "luminus-action-bar";
    bar.className = "d-flex gap-1 justify-content-end mt-2 flex-wrap";
    bar.dataset.name = name;
    bar.dataset.luminusUi = "1";

    for (const { label, cmd } of ACTIONS) {
      const btn = document.createElement("button");
      btn.className = "luminus-action-btn";
      btn.dataset.cmd = cmd;
      btn.textContent = label;
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        const current = document.getElementById("luminus-action-bar")?.dataset.name;
        if (!current) return;
        apiRef?.send(new RoomUnitChatComposer(`:${cmd} ${current}`, 0, 0));
      });
      bar.appendChild(btn);
    }

    const muteBtn = document.createElement("button");
    muteBtn.className = "luminus-action-btn luminus-mute-btn";
    muteBtn.dataset.role = "mute-toggle";
    muteBtn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const current = document.getElementById("luminus-action-bar")?.dataset.name;
      if (!current) return;
      // Suppress observer while we mutate our own button label.
      suppressObserverUntil = performance.now() + 50;
      if (isNameMuted(current)) desmuteUser(current);
      else muteUser(current);
      updateMuteButton(muteBtn, current);
    });
    bar.appendChild(muteBtn);

    suppressObserverUntil = performance.now() + 50;
    container.appendChild(bar);
  }

  const muteBtn = bar.querySelector<HTMLButtonElement>("[data-role='mute-toggle']");
  if (muteBtn) updateMuteButton(muteBtn, name);
}

/** Only write DOM when the label actually changes — otherwise MutationObserver loops forever. */
function updateMuteButton(btn: HTMLButtonElement, name: string): void {
  const muted = isNameMuted(name);
  const next = muted ? "1" : "0";
  if (btn.dataset.muteState === next) return;

  suppressObserverUntil = performance.now() + 50;
  btn.dataset.muteState = next;
  btn.textContent = muted ? "Desmutar" : "Mutar";
  btn.title = muted
    ? "Tira o mute local e, com Mutar geral ligado, coloca na whitelist"
    : "Aplica mute local (bloqueia chat e, se ativo, esconde o avatar)";
  btn.classList.toggle("is-muted", muted);
}

function processInfostand(container: Element): void {
  const nameEl = container.querySelector<HTMLElement>(".goldfish.fw-bold");
  const mottoEl = container.querySelector<HTMLElement>(".motto-content .goldfish");
  const isFurniture = Boolean(container.querySelector(".furni-image"));
  if (!nameEl || !mottoEl) {
    // Not a player infostand (e.g. furniture) — clear any stale player UI.
    if (container.classList.contains("luminus-user-infostand")) {
      container.classList.remove("luminus-user-infostand");
    }
    removeActionBar();
    closeLinkMenu();
    if (isFurniture && nameEl) {
      const title = nameEl.textContent?.trim() || null;
      onFurnitureInfostand(title);
      renderFurniHideEye(nameEl, title);
    } else {
      onFurnitureInfostand(null);
      removeFurniHideEye();
    }
    return;
  }

  // Player card — furniture hide never sticks across people.
  onFurnitureInfostand(null);
  removeFurniHideEye();

  if (!container.classList.contains("luminus-user-infostand")) {
    suppressObserverUntil = performance.now() + 50;
    container.classList.add("luminus-user-infostand");
  }
  const name = processMotto(nameEl, mottoEl);
  renderActionBar(container, name);
}

function removeFurniHideEye(): void {
  document.getElementById("luminus-furni-hide-eye")?.remove();
}

/**
 * Eye toggle on the furniture title row (next to the name), not a bottom button.
 * Open eye = visible class; eye-off = hidden — click flips instantly via Nitro alpha API.
 */
function renderFurniHideEye(nameEl: HTMLElement, title: string | null): void {
  const state = getFurniClassHideState();
  if (!state.enabled || !title) {
    removeFurniHideEye();
    return;
  }

  let eye = document.getElementById("luminus-furni-hide-eye") as HTMLButtonElement | null;
  const header = nameEl.parentElement;
  if (!header) {
    removeFurniHideEye();
    return;
  }

  if (eye && (eye.dataset.title !== title || !header.contains(eye))) {
    eye.remove();
    eye = null;
  }

  if (!eye) {
    eye = document.createElement("button");
    eye.type = "button";
    eye.id = "luminus-furni-hide-eye";
    eye.className = "luminus-furni-hide-eye";
    eye.dataset.luminusUi = "1";
    eye.dataset.title = title;
    eye.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      suppressObserverUntil = performance.now() + 80;
      // Sync focus + hide/show in the same tick (no wait for poll).
      onFurnitureInfostand(title);
      toggleFocusedClass();
      updateFurniHideEye(eye!);
    });
    // Prefer insert right after the title text.
    suppressObserverUntil = performance.now() + 50;
    if (nameEl.nextSibling) header.insertBefore(eye, nameEl.nextSibling);
    else header.appendChild(eye);
  }

  updateFurniHideEye(eye);
}

function updateFurniHideEye(eye: HTMLButtonElement): void {
  const state = getFurniClassHideState();
  const hidden = Boolean(state.focusHidden ?? isFocusHidden());
  const next = hidden ? "1" : "0";
  if (eye.dataset.hideState === next && eye.dataset.focusType === (state.focusType ?? "")) return;

  suppressObserverUntil = performance.now() + 50;
  eye.dataset.hideState = next;
  eye.dataset.focusType = state.focusType ?? "";
  eye.classList.toggle("is-hidden", hidden);
  eye.innerHTML = hidden ? FURNI_EYE_OFF_SVG : FURNI_EYE_OPEN_SVG;
  const count = state.focusCount;
  const countLabel = count > 0 ? ` (${count})` : "";
  eye.title = hidden
    ? `Reaparecer classe${countLabel}`
    : `Ocultar todos desta classe${countLabel}`;
  eye.setAttribute("aria-label", eye.title);
  eye.setAttribute("aria-pressed", hidden ? "true" : "false");
}

// Full "Perfil Habblet" window — same motto-link + eye icon treatment, no action bar
// (there's no specific room unit to target actions at from here).
function processProfile(card: Element): void {
  const nameEl = card.querySelector<HTMLElement>(".profile-bar .username");
  const mottoEl = card.querySelector<HTMLElement>(".profile-bar .text-row.w-50.text-truncate");
  if (!nameEl || !mottoEl) return;
  processMotto(nameEl, mottoEl);
}

// Re-derived fresh every tick (never cached) since Nitro frequently replaces the infostand's
// own DOM nodes on re-render — a cached element reference goes stale almost immediately,
// which previously made the open menu's "is my card still here?" check misfire.
function currentCardName(): string | null {
  const infoName = document.querySelector<HTMLElement>(".nitro-infostand-container .goldfish.fw-bold")?.textContent?.trim();
  if (infoName) return infoName;
  return document.querySelector<HTMLElement>(".user-profile .profile-bar .username")?.textContent?.trim() ?? null;
}

/** Ignore our own DOM writes so the body observer cannot re-enter forever. */
let suppressObserverUntil = 0;
let processScheduled = false;
/** Latest mutations waiting for the coalesced rAF tick. */
let pendingMutations: MutationRecord[] = [];

function isLuminusUiNode(node: Node | null): boolean {
  if (!node) return false;
  if (node instanceof HTMLElement) {
    if (
      node.id === "luminus-action-bar"
      || node.id === "luminus-furni-hide-eye"
      || node.dataset.luminusUi === "1"
    ) return true;
    return Boolean(
      node.closest(
        "#luminus-action-bar, #luminus-furni-hide-eye, #luminus-link-ctxmenu, .luminus-person-link-icon, .luminus-name-only-link-icon, .luminus-gender-icon, .luminus-motto-link",
      ),
    );
  }
  if (node instanceof Element) {
    return Boolean(
      node.closest(
        "#luminus-action-bar, #luminus-furni-hide-eye, #luminus-link-ctxmenu, .luminus-person-link-icon, .luminus-name-only-link-icon, .luminus-gender-icon, .luminus-motto-link",
      ),
    );
  }
  return isLuminusUiNode(node.parentElement);
}

/** True when this batch only touches Luminus-injected UI (safe to ignore). */
function mutationsAreOnlyLuminusUi(mutations: MutationRecord[]): boolean {
  if (!mutations.length) return false;
  for (const mutation of mutations) {
    if (!isLuminusUiNode(mutation.target)) {
      for (const node of mutation.addedNodes) {
        if (!isLuminusUiNode(node)) return false;
      }
      for (const node of mutation.removedNodes) {
        if (!isLuminusUiNode(node)) return false;
      }
      // childList on a Nitro parent adding only our bar: addedNodes checked above.
      // Bare attribute/character changes on Nitro nodes must not be ignored.
      if (mutation.addedNodes.length === 0 && mutation.removedNodes.length === 0) return false;
    }
  }
  return true;
}

function scheduleInfostandProcess(mutations: MutationRecord[]): void {
  if (performance.now() < suppressObserverUntil) return;
  if (mutationsAreOnlyLuminusUi(mutations)) return;

  // Attribute-only noise (class thrash) → only refresh open user context menus.
  const hasChildList = mutations.some(m => m.type === "childList");
  // Nitro sometimes updates the mission by changing the existing text node
  // instead of replacing children. Those updates must trigger link wrapping
  // immediately; otherwise the plain text stays non-clickable until a later
  // infostand rerender happens to produce a childList mutation.
  const hasMottoTextChange = mutations.some(m => m.type === "characterData");
  const menuClassChange = mutations.some(m => {
    if (m.type !== "attributes") return false;
    const el = m.target instanceof HTMLElement ? m.target : null;
    return Boolean(el?.classList.contains("nitro-context-menu") || el?.closest(".nitro-context-menu"));
  });

  if (!hasChildList && menuClassChange) {
    if (processScheduled) return;
    processScheduled = true;
    requestAnimationFrame(() => {
      processScheduled = false;
      if (performance.now() < suppressObserverUntil) return;
      // Name-only menus often only flip `.visible` (attribute) — must re-run icons here.
      processNameOnlyContextMenus(document);
      processUserContextMenus(document);
      document.querySelectorAll<HTMLElement>(".nitro-context-menu.visible").forEach(scheduleUserMenuMuteSync);
    });
    return;
  }

  if (!hasChildList && !hasMottoTextChange) return;

  pendingMutations = mutations;
  if (processScheduled) return;
  processScheduled = true;
  requestAnimationFrame(() => {
    processScheduled = false;
    if (performance.now() < suppressObserverUntil) {
      pendingMutations = [];
      return;
    }
    const batch = pendingMutations;
    pendingMutations = [];

    const infostand = document.querySelector(".nitro-infostand-container");
    if (infostand) processInfostand(infostand);
    else {
      removeActionBar();
      removeFurniHideEye();
      onFurnitureInfostand(null);
    }

    const profileCard = document.querySelector(".user-profile");
    if (profileCard) processProfile(profileCard);

    processNameOnlyContextMenus(document);
    processUserContextMenus(document);

    for (const mutation of batch) {
      const changedElement = mutation.target instanceof HTMLElement
        ? mutation.target
        : mutation.target.parentElement;
      if (isLuminusUiNode(changedElement)) continue;
      const changedMenu = changedElement?.closest<HTMLElement>(".nitro-context-menu");
      if (changedMenu) {
        if (isNameOnlyMenu(changedMenu)) processNameOnlyContextMenu(changedMenu);
        else {
          processUserContextMenu(changedMenu);
          scheduleUserMenuMuteSync(changedMenu);
        }
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement) || isLuminusUiNode(node)) continue;
        processNameOnlyContextMenus(node);
        processUserContextMenus(node);
        if (node.classList?.contains("nitro-context-menu") || node.querySelector?.(".nitro-context-menu")) {
          const menus = node.classList?.contains("nitro-context-menu")
            ? [node as HTMLElement]
            : [...node.querySelectorAll<HTMLElement>(".nitro-context-menu")];
          for (const menu of menus) {
            if (!isNameOnlyMenu(menu)) scheduleUserMenuMuteSync(menu);
          }
        }
      }
    }

    if (openMenuFor && currentCardName() !== openMenuFor) closeLinkMenu();
  });
}

export function initInfostandLinks(api: LuminusApi): void {
  apiRef = api;

  // Room identity packets update the live store without necessarily changing Nitro's DOM.
  // Refresh an already-open context menu on the next frame so gender/link state never lags.
  let contextRefreshScheduled = false;
  const refreshContextMenusFromRoomState = () => {
    if (contextRefreshScheduled) return;
    contextRefreshScheduled = true;
    requestAnimationFrame(() => {
      contextRefreshScheduled = false;
      processNameOnlyContextMenus(document);
      processUserContextMenus(document);
    });
  };
  api.onIncoming(374, refreshContextMenusFromRoomState);
  api.onIncoming(3920, refreshContextMenusFromRoomState);
  api.onIncoming(2429, refreshContextMenusFromRoomState);
  api.onIncoming(2031, refreshContextMenusFromRoomState);
  api.onIncoming(2661, refreshContextMenusFromRoomState);
  subscribeContextGenderIcon(refreshContextMenusFromRoomState);

  // Refresh Mutar/Desmutar + open context-menu Calar/Ouvir when mute state changes.
  subscribeMuteAll(() => {
    const bar = document.getElementById("luminus-action-bar");
    const name = bar?.dataset.name;
    const muteBtn = bar?.querySelector<HTMLButtonElement>("[data-role='mute-toggle']");
    if (name && muteBtn) updateMuteButton(muteBtn, name);
    processUserContextMenus(document);
  });

  // Refresh eye icon when hide state changes (counts / toggle).
  subscribeFurniClassHide(() => {
    const eye = document.getElementById("luminus-furni-hide-eye") as HTMLButtonElement | null;
    if (eye) updateFurniHideEye(eye);
    if (!getFurniClassHideState().enabled) removeFurniHideEye();
  });

  const start = () => {
    const observer = new MutationObserver(mutations => {
      scheduleInfostandProcess(mutations);
    });
    // class changes (menu gets `.visible`) must also be watched.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["class", "style"],
    });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
