import { createApi } from "./ws/api";
import { registerParsers } from "./messages/registerParsers";
import { getTargetWindow, interceptWebSocket } from "./ws/interceptWebSocket";
import { PacketBridge } from "./ws/PacketBridge";
import { initUI } from "./ui/inject";
import { initKeyboardLook } from "./ui/keyboardLook";
import { initInfostandLinks } from "./ui/infostandLinks";
import { setupLogHandlers, LOGS_CONFIG_DEFAULT } from "./logs/logHandlers";
import { readPref, writePref } from "./util/prefs";
import { initMcpBridge } from "./bridge/mcpBridge";
import { initNitroRoomEngineProbe, initNitroWorldOverlay } from "./room/nitroWorldOverlay";
import { initMuteAll } from "./room/muteAll";

declare const GM_registerMenuCommand: undefined | ((name: string, callback: () => void) => void);

const targetWindow = getTargetWindow();
initNitroRoomEngineProbe(targetWindow);
const bridge = new PacketBridge();
const api = createApi(bridge);

// "luminus.devMode" unlocks Packets/Debug tabs — console logging is "consoleLog".
bridge.setDebug(readSetting("consoleLog", false));
bridge.setLogParsedOnly(readSetting("parsedOnly", false));
registerParsers();
targetWindow.Luminus = api;
if (__LUMINUS_DEV_TOOLS__) registerMenu();
interceptWebSocket(targetWindow, bridge);
// Register early so MESSENGER_UPDATE at session start isn't missed before React mounts.
setupLogHandlers(api, () => ({ ...LOGS_CONFIG_DEFAULT, ...readPref("luminus.logs.config", LOGS_CONFIG_DEFAULT) }));
initKeyboardLook(api);
initUI(api);
initNitroWorldOverlay(api, targetWindow);
initMuteAll(api);
initInfostandLinks(api);
if (__LUMINUS_MCP__) initMcpBridge(api);

if (bridge.getDebug()) console.log("[Luminus] WebSocket interceptado.");

// Ad removal — always active, no toggle
(function observeAds() {
  let removed = 0;
  const TOTAL = 2;
  const tryRemove = () => {
    document.querySelectorAll(".adTimer").forEach(timer => {
      let el: Element | null = timer.parentElement;
      while (el && el !== document.body) {
        if ((el.classList.contains("top") || el.classList.contains("bottom")) && el.querySelector(".adsbygoogle")) {
          el.remove(); removed++; break;
        }
        el = el.parentElement;
      }
    });
    return removed >= TOTAL;
  };
  const start = () => {
    if (tryRemove()) return;
    const obs = new MutationObserver(() => { if (tryRemove()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();

function registerMenu(): void {
  if (typeof GM_registerMenuCommand !== "function") return;

  GM_registerMenuCommand("Luminus: ligar/desligar debug", () => {
    const enabled = !bridge.getDebug();
    bridge.setDebug(enabled);
    writeSetting("consoleLog", enabled);
    console.log(`[Luminus] debug ${enabled ? "ligado" : "desligado"}.`);
  });

  GM_registerMenuCommand("Luminus: mostrar apenas packets parseados", () => {
    bridge.setLogParsedOnly(true);
    writeSetting("parsedOnly", true);
    console.log("[Luminus] log: apenas packets parseados.");
  });

  GM_registerMenuCommand("Luminus: mostrar todos packets", () => {
    bridge.setLogParsedOnly(false);
    writeSetting("parsedOnly", false);
    console.log("[Luminus] log: todos packets.");
  });

  GM_registerMenuCommand("Luminus: ativar/desativar modo dev (Packets/Debug)", () => {
    api.toggleDevMode();
  });
}

function readSetting<T>(name: string, defaultValue: T): T {
  return readPref(`luminus.${name}`, defaultValue);
}

function writeSetting(name: string, value: unknown): void {
  writePref(`luminus.${name}`, value);
}
