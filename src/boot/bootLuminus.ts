/**
 * Boot Luminus: WebSocket bridge, room tools, panel, logs, and chat helpers.
 */
import { createApi, type LuminusApi } from "../ws/api";
import { registerParsers } from "../messages/registerParsers";
import { getTargetWindow, interceptWebSocket } from "../ws/interceptWebSocket";
import { PacketBridge } from "../ws/PacketBridge";
import { initUI } from "../ui/inject";
import type { ChangelogLayer } from "../changelog";
import { initKeyboardLook } from "../ui/keyboardLook";
import { initInfostandLinks } from "../ui/infostandLinks";
import { setupLogHandlers, LOGS_CONFIG_DEFAULT } from "../logs/logHandlers";
import { readPref, writePref } from "../util/prefs";
import { initMcpBridge } from "../bridge/mcpBridge";
import { initNitroRoomEngineProbe, initNitroWorldOverlay } from "../room/nitroWorldOverlay";
import { initIncrementalRoomCanvas } from "../room/incrementalRoomCanvas";
import { initMuteAll } from "../room/muteAll";
import { initFurniClassHide } from "../room/furniClassHide";
import { initAchievements } from "../achievements/achievementStore";
import { initWhisperQueue } from "../chat/whisperQueue";
import { initNativeGroupNoticeHider } from "../chat/nativeGroupMount";
import { initNativeGroupWhisperReset } from "../chat/nativeGroupWhisperReset";
import { initOutgoingClickAlerts } from "../ui/userClickActions";
import { runChatBetaDiag } from "../diag/chatBetaDiag";
import { runNitroWeightProbe } from "../diag/nitroWeightProbe";
import { PacketReader } from "../protocol/wrapper";

declare const GM_registerMenuCommand: undefined | ((name: string, callback: () => void) => void);

/** Same shape as getTargetWindow() — Window with WebSocket + optional Luminus. */
export type LuminusTargetWindow = Window & { WebSocket: typeof WebSocket; Luminus?: unknown };

export type BootLuminusResult = {
  api: LuminusApi;
  bridge: PacketBridge;
  targetWindow: LuminusTargetWindow;
};

export type BootLuminusOptions = {
  /** Register Tampermonkey debug menu (Packets/Debug toggles). Default: __LUMINUS_DEV_TOOLS__ */
  registerDevMenu?: boolean;
  /** Register always-on support diagnostic menu. Default: true */
  registerSupportMenu?: boolean;
  /** Entradas do modal de novidades. Default: changelog do Luminus. */
  changelogLayers?: readonly ChangelogLayer[];
  /** Chave de preferência do “já vi estas versões”. */
  changelogPrefsKey?: string;
};

function readSetting<T>(name: string, defaultValue: T): T {
  return readPref(`luminus.${name}`, defaultValue);
}

function writeSetting(name: string, value: unknown): void {
  writePref(`luminus.${name}`, value);
}

function registerDevMenu(bridge: PacketBridge, api: LuminusApi): void {
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

function registerSupportMenu(): void {
  if (typeof GM_registerMenuCommand !== "function") return;
  GM_registerMenuCommand("Luminus: diagnostico Chat Beta (copiar JSON)", () => {
    void runChatBetaDiag().then(() => {
      console.log("[Luminus] Diagnostico copiado. Cole no Discord/ticket.");
    }).catch(error => {
      console.warn("[Luminus] Falha no diagnostico Chat Beta:", error);
    });
  });
  GM_registerMenuCommand("Luminus: peso Nitro / sessao (copiar JSON)", () => {
    void runNitroWeightProbe().then(() => {
      console.log("[Luminus] Probe Nitro copiado. Compare inicio vs sessao longa.");
    }).catch(error => {
      console.warn("[Luminus] Falha no probe Nitro:", error);
    });
  });
}

/** Remove Habblet ad timers (always on). */
function observeAds(): void {
  let removed = 0;
  const TOTAL = 2;
  const tryRemove = () => {
    document.querySelectorAll(".adTimer").forEach(timer => {
      let el: Element | null = timer.parentElement;
      while (el && el !== document.body) {
        if ((el.classList.contains("top") || el.classList.contains("bottom")) && el.querySelector(".adsbygoogle")) {
          el.remove();
          removed++;
          break;
        }
        el = el.parentElement;
      }
    });
    return removed >= TOTAL;
  };
  const start = () => {
    if (tryRemove()) return;
    const obs = new MutationObserver(() => {
      if (tryRemove()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}

function trackMyselfFigure(api: LuminusApi): void {
  api.onOutgoing(2730, ({ packet, origin }) => {
    if (origin !== "client" && origin !== "script") return;
    try {
      const reader = new PacketReader(packet.header, packet.body);
      const gender = reader.readString();
      const figure = reader.readString();
      if (api.myself && figure) {
        api.myself.gender = gender;
        api.myself.figure = figure;
      }
    } catch {
      // Ignore malformed or incomplete outgoing packets.
    }
  });
}

/** Start Luminus on the Habblet page. */
export function bootLuminus(options: BootLuminusOptions = {}): BootLuminusResult {
  const registerDev = options.registerDevMenu ?? __LUMINUS_DEV_TOOLS__;
  const registerSupport = options.registerSupportMenu ?? true;

  const targetWindow = getTargetWindow();
  initNitroRoomEngineProbe(targetWindow);
  initIncrementalRoomCanvas(targetWindow);
  const bridge = new PacketBridge();
  const api = createApi(bridge);

  bridge.setDebug(readSetting("consoleLog", false));
  bridge.setLogParsedOnly(readSetting("parsedOnly", false));
  registerParsers();
  targetWindow.Luminus = api;
  trackMyselfFigure(api);
  if (registerDev) registerDevMenu(bridge, api);
  if (registerSupport) registerSupportMenu();
  interceptWebSocket(targetWindow, bridge);
  setupLogHandlers(api, () => ({ ...LOGS_CONFIG_DEFAULT, ...readPref("luminus.logs.config", LOGS_CONFIG_DEFAULT) }));
  initWhisperQueue(bridge);
  initNativeGroupWhisperReset(api);
  initNativeGroupNoticeHider();
  initKeyboardLook(api);
  initUI(api, {
    changelogLayers: options.changelogLayers,
    changelogPrefsKey: options.changelogPrefsKey,
  });
  initOutgoingClickAlerts(api);
  initNitroWorldOverlay(api, targetWindow);
  initMuteAll(api);
  initFurniClassHide(api);
  initAchievements(api);
  initInfostandLinks(api);
  if (__LUMINUS_MCP__) initMcpBridge(api);

  if (bridge.getDebug()) console.log("[Luminus] WebSocket interceptado.");

  observeAds();

  return { api, bridge, targetWindow };
}
