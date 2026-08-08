import * as React from "react";
import * as ReactDOM from "react-dom/client";
import type { LuminusApi } from "../ws/api";
import { LuminusPanel } from "./panel";
import { LogWindow } from "./logWindow";
import { LinkWindow } from "./linkWindow";
import { EnablesHanditemsWindow } from "./enablesHanditemsWindow";
import { WhisperBetaWindow } from "./whisperBetaWindow";
import { LogToast } from "./logToast";
import { ChangelogModal } from "./changelogModal";
import { PANEL_STYLES } from "./styles";
import { WHISPER_BETA_STYLES } from "./whisperBetaStyles";
import { ENABLES_HANDITEMS_STYLES } from "./enablesHanditemsStyles";
import { getWardrobeStacked, initUiAppearance } from "./toolbarGlass";
import { initRespectMessageGrouping } from "./respectMessages";
import { initHighScoreProfileLinks } from "./profileLinks";
import { LUMINUS_BUILD_NAME } from "../version";
import {
  claimChangelogLayers,
  LUMINUS_CHANGELOG_LAYER,
  type ChangelogLayer,
} from "../changelog";
import {
  getTotalChatUnread,
  startChatWorkspace,
  subscribeChatList,
} from "../chat/chatWorkspaceStore";
import { startRoomChatSessions } from "../chat/roomChatSessionStore";
import { startUiSafeBoundsWatch } from "./windowBounds";

// Keep the experimental chat isolated so a beta render failure cannot unmount the stable UI.
let root: ReturnType<typeof ReactDOM.createRoot> | null = null;
let betaRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;
let open     = false;
let logOpen  = false;
let linkOpen = false;
let enablesOpen = false;
let whisperBetaOpen = false;
let changelogLayers: ChangelogLayer[] | null = null;
let uiChangelogLayers: readonly ChangelogLayer[] = [LUMINUS_CHANGELOG_LAYER];
let uiChangelogPrefsKey = "luminus.changelog.seenVersions";

function render(api: LuminusApi) {
  if (!root) return;
  root.render(
    React.createElement(React.Fragment, null,
      React.createElement(LuminusPanel, {
        api,
        open,
        onClose:     () => { open = false;     render(api); },
        onOpenLogs:  () => { logOpen = true;    render(api); },
        onOpenLinks: () => { linkOpen = true;   render(api); },
      }),
      React.createElement(LogWindow, {
        api,
        open: logOpen,
        onClose: () => { logOpen = false; render(api); },
      }),
      React.createElement(LinkWindow, {
        api,
        open: linkOpen,
        onClose: () => { linkOpen = false; render(api); },
      }),
      React.createElement(EnablesHanditemsWindow, {
        api,
        open: enablesOpen,
        onClose: () => { enablesOpen = false; render(api); },
      }),
      changelogLayers && changelogLayers.length > 0 && React.createElement(ChangelogModal, {
        layers: changelogLayers,
        onClose: () => { changelogLayers = null; render(api); },
      }),
      React.createElement(LogToast, { api }),
    )
  );
}

function renderBeta(api: LuminusApi): void {
  betaRoot?.render(
    React.createElement(WhisperBetaWindow, {
      api,
      open: whisperBetaOpen,
      onClose: () => { whisperBetaOpen = false; renderBeta(api); },
    }),
  );
}

function mountIcon(toolbar: Element, api: LuminusApi) {
  const icon = document.createElement("div");
  icon.id = "luminus-icon";
  icon.className = "luminus-toolbar-btn";
  icon.title = LUMINUS_BUILD_NAME;
  // Official Luminus mark (traced from luminus-logo.svg), recolored via accent gradient
  icon.innerHTML = `<svg viewBox="0 0 500 500" fill="none">
    <path fill="url(#lm-mark-grad)" opacity="0.95" d="M 243.5 147 L 249 165.5 L 257 182.5 L 271 202 L 273 202 Q 271.9 204.7 274.5 204 Q 286.3 217.7 303.5 226 L 314.5 231 L 333 236.5 Q 313.9 239.9 299.5 248 Q 280.6 258.1 267 273.5 L 264.5 277 L 263 259.5 L 258 243.5 Q 249.4 223.1 233.5 210 L 221 202 L 221 199.5 L 228 190.5 L 238 170.5 Q 242.3 160.3 243.5 147 Z" />
    <path fill="url(#lm-mark-grad)" opacity="0.95" d="M 231.5 223 Q 231.4 242.6 238 255.5 Q 247.1 275.9 263.5 289 L 277 298.5 Q 258.8 319.8 253.5 354 Q 244.6 311.9 217.5 288 L 196.5 273 L 181.5 266 L 168.5 263 L 167 261.5 Q 185 258 198.5 250 L 225 231 L 231.5 223 Z" />
    <defs>
      <linearGradient id="lm-mark-grad" x1="167" y1="147" x2="333" y2="354" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#e4e8ff"/>
        <stop offset="1" stop-color="#8ea2ff"/>
      </linearGradient>
    </defs>
  </svg>`;
  icon.addEventListener("click", () => { open = !open; render(api); });
  toolbar.appendChild(icon);
}

const LOGS_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>
  <path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
</svg>`;

const LINKS_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
</svg>`;

const CHAT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
  <path d="M8 9h8M8 13h5"/>
</svg>`;

const ENABLES_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="8" r="3.5"/>
  <path d="M6 20c.6-3.2 3-5 6-5s5.4 1.8 6 5"/>
  <path d="M17.5 4.5l1.2-1.2M19.5 7h1.7M17.5 9.5l1.2 1.2"/>
</svg>`;

function mountUtilityIcon(toolbar: Element, title: string, svg: string, onClick: () => void): HTMLDivElement {
  const btn = document.createElement("div");
  btn.className = "luminus-toolbar-btn";
  btn.title = title;
  btn.innerHTML = svg;
  btn.addEventListener("click", onClick);
  toolbar.appendChild(btn);
  return btn;
}

export type InitUIOptions = {
  /** Entradas do modal de novidades. Default: changelog do Luminus. */
  changelogLayers?: readonly ChangelogLayer[];
  /** Chave de preferência do “já vi estas versões”. */
  changelogPrefsKey?: string;
};

export function initUI(api: LuminusApi, options: InitUIOptions = {}): void {
  uiChangelogLayers = options.changelogLayers?.length
    ? options.changelogLayers
    : [LUMINUS_CHANGELOG_LAYER];
  uiChangelogPrefsKey = options.changelogPrefsKey ?? "luminus.changelog.seenVersions";

  // inject styles
  const style = document.createElement("style");
  style.id = "luminus-ui-styles";
  style.textContent = PANEL_STYLES;
  (document.head ?? document.documentElement).appendChild(style);

  const betaStyle = document.createElement("style");
  betaStyle.id = "luminus-chat-beta-styles";
  betaStyle.textContent = WHISPER_BETA_STYLES;
  (document.head ?? document.documentElement).appendChild(betaStyle);

  // Keep this feature stylesheet independent from the main panel stylesheet.
  const enablesStyle = document.createElement("style");
  enablesStyle.id = "luminus-enables-handitems-styles";
  enablesStyle.textContent = ENABLES_HANDITEMS_STYLES;
  (document.head ?? document.documentElement).appendChild(enablesStyle);

  const mount = () => {
    startChatWorkspace(api);
    startRoomChatSessions(api);
    startUiSafeBoundsWatch();
    initUiAppearance();
    initRespectMessageGrouping(api);
    initHighScoreProfileLinks(api);
    document.body.classList.toggle("luminus-wardrobe-stacked", getWardrobeStacked());

    // panel root
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    render(api); // mount immediately so useEffect runs at startup

    const betaContainer = document.createElement("div");
    document.body.appendChild(betaContainer);
    betaRoot = ReactDOM.createRoot(betaContainer);
    renderBeta(api);

    // wait for nitro toolbar
    const observer = new MutationObserver(() => {
      const target = document.querySelector(".nitro-toolbar .d-flex.gap-2.align-items-center:not(.justify-content-between)");
      if (target) {
        observer.disconnect();
        changelogLayers = claimChangelogLayers(uiChangelogLayers, uiChangelogPrefsKey);
        render(api);
        mountIcon(target, api);
        // Chat (formerly Beta) replaces legacy "Histórico de chat".
        const chatButton = mountUtilityIcon(target, "Luminus: Chat", CHAT_ICON_SVG, () => {
          whisperBetaOpen = !whisperBetaOpen;
          renderBeta(api);
        });
        chatButton.classList.add("luminus-chat-beta-trigger");
        const badge = document.createElement("span");
        badge.className = "luminus-chat-beta-badge";
        chatButton.appendChild(badge);
        const updateChatBadge = () => {
          const unread = getTotalChatUnread();
          badge.textContent = unread > 99 ? "99+" : String(unread);
          badge.hidden = unread === 0;
        };
        updateChatBadge();
        subscribeChatList(updateChatBadge);
        mountUtilityIcon(target, "Luminus: Logs", LOGS_ICON_SVG, () => { logOpen = !logOpen; render(api); });
        mountUtilityIcon(target, "Luminus: Links", LINKS_ICON_SVG, () => { linkOpen = !linkOpen; render(api); });
        mountUtilityIcon(target, "Luminus: Efeitos e Handitems", ENABLES_ICON_SVG, () => {
          enablesOpen = !enablesOpen;
          render(api);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }
}
