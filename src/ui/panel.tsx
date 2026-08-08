import * as React from "react";
import * as Switch from "@radix-ui/react-switch";

import { ArrowLeft, Bug, ChevronDown, EyeOff, Gamepad2, PanelsTopLeft, RadioTower, ScrollText } from "lucide-react";

import type { LuminusApi } from "../ws/api";
import type { UnitIdle } from "../messages/incoming/UnitIdleParser";
import type { PacketHandlerContext } from "../protocol/types";
import { gmFetch, gmPost } from "../util/gmFetch";
import { setLookEnabled, sendLookAt } from "./keyboardLook";
import { readPref, writePref } from "../util/prefs";
import { type LogsConfig, LOGS_CONFIG_DEFAULT, setupLogHandlers, teardownLogHandlers } from "../logs/logHandlers";
import { LUMINUS_BUILD_NAME, LUMINUS_VERSION } from "../version";
import {
  getToolbarGlass, getWardrobeStacked, setToolbarGlass, setWardrobeStacked,
  getRadioVisible, setRadioVisible, getUiGlassSettings, setUiGlassCategory,
  getUiGlassCategoryLabel, UI_GLASS_CATEGORIES, type UiGlassCategory
} from "./toolbarGlass";
import { getMcpBridgeEnabled, setMcpBridgeEnabled, getMcpBridgeStatus } from "../bridge/mcpBridge";

import {
  addMuteAllWhitelist,
  getMuteAllState,
  removeMuteAllWhitelist,
  setMuteAllEnabled,
  setMuteAllHideAvatars,
  setMuteAllShowIcons,
  subscribeMuteAll,
  type MuteAllState,
} from "../room/muteAll";
import { getOutgoingClickAlertEnabled, setOutgoingClickAlertEnabled } from "./userClickActions";
import { RoomUserClickComposer } from "../messages/outgoing/RoomUserClickComposer";
import {
  getIncrementalRoomCanvasEnabled,
  setIncrementalRoomCanvasEnabled,
} from "../room/incrementalRoomCanvas";
import {
  getState as getFurniClassHideState,
  setFurniClassHideEnabled,
  subscribeFurniClassHide,
  type FurniClassHideState,
} from "../room/furniClassHide";
import {
  applyClampedSize,
  beginClampedWindowDrag,
  fitElementInSafeBounds,
} from "./windowBounds";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
  onOpenLogs: () => void;
  onOpenLinks: () => void;
}


type PanelView = "launcher" | "player" | "logs" | "visual" | "render" | "packets" | "debug";

function viewLabel(view: Exclude<PanelView, "launcher">): string {
  if (view === "player") return "Player";
  if (view === "logs") return "Logs";
  if (view === "visual") return "Visual";
  if (view === "render") return "Renderização";
  if (__LUMINUS_DEV_TOOLS__ && view === "packets") return "Packets";
  return "Debug";
}

function ViewIcon({ view, size = 20 }: { view: Exclude<PanelView, "launcher">; size?: number }) {
  const props = { size, strokeWidth: 1.8, "aria-hidden": true } as const;
  if (view === "player") return <Gamepad2 {...props} />;
  if (view === "logs") return <ScrollText {...props} />;
  if (view === "visual") return <PanelsTopLeft {...props} />;
  if (view === "render") return <EyeOff {...props} />;
  if (__LUMINUS_DEV_TOOLS__ && view === "packets") return <RadioTower {...props} />;
  return <Bug {...props} />;
}



interface ExpandableOptionProps {
  label: string;
  sub: string;
  detailLabel: string;
  control: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExpandableOption({ label, sub, detailLabel, control, children, defaultOpen = false }: ExpandableOptionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <div className={`lm-option-group${open ? " is-open" : ""}`}>
      <div className="lm-row lm-option-parent">
        <button
          type="button"
          className="lm-option-expander"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(current => !current)}
        >
          <span className="lm-label">
            <span className="lm-option-heading">
              {label}
              <span className="lm-option-more">{detailLabel} <ChevronDown aria-hidden="true" /></span>
            </span>
            <span className="lm-sub">{sub}</span>
          </span>
        </button>
        {control}
      </div>
      {open && <div className="lm-option-children" id={contentId}>{children}</div>}
    </div>
  );
}


const BLOCK_HEADERS = [
  { header: 2725, label: "UserObject",     sub: "#2725" },
  { header: 374,  label: "Users",          sub: "#374"  },
  { header: 1640, label: "UserUpdate",     sub: "#1640" },
  { header: 2661, label: "UserRemove",     sub: "#2661" },
  { header: 1778, label: "FurnitureFloor", sub: "#1778" },
];



type PlayerKey = "antiIdle" | "antiWalk" | "antiLook" | "antiTyping" | "blockClick" | "ctrlLook";

const PLAYER_TOGGLES: { key: PlayerKey; label: string; sub: string }[] = [
  { key: "antiIdle",   label: "Anti-Idle",             sub: "Não deixa seu avatar ficar ausente." },
  { key: "antiWalk",   label: "Anti-Caminhar",         sub: "Trava seus passos mesmo clicando pelo quarto." },
  { key: "antiLook",   label: "Anti-Girar",            sub: "Mantém seu avatar olhando na mesma direção." },
  { key: "antiTyping", label: "Anti-Digitando",        sub: "Esconde o aviso de que você está digitando." },
  { key: "blockClick", label: "Bloquear Clique",       sub: "Evita clicar em outros jogadores sem querer." },
  { key: "ctrlLook",   label: "Ctrl + Setas para Girar", sub: "Escolha a direção com Ctrl e as setas." },
];

const PLAYER_OUTGOING: Record<Exclude<PlayerKey, "antiIdle" | "ctrlLook">, number> = {
  antiWalk:   3320,
  antiLook:   3301,
  antiTyping: 1597,
  blockClick: 431,
};


export function LuminusPanel({ api, open, onClose, onOpenLogs, onOpenLinks }: Props) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  /** True after the user resizes via the side handles — keep that size across tabs. */
  const userResizedRef = React.useRef(false);
  const [view, setView] = React.useState<PanelView>("launcher");

  React.useEffect(() => {
    if (!open) setView("launcher");
  }, [open]);

  // Keep header inside the Nitro-safe band (never above the top / over the toolbar).
  // Without a user resize, reflow height with content so small tabs don't shrink the shell.
  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    fitElementInSafeBounds(panelRef.current, {
      minWidth: 280,
      minHeight: 200,
      autoSize: !userResizedRef.current,
    });
  }, [open, view]);

  // drag
  function onHeaderMouseDown(e: React.MouseEvent) {
    if (!panelRef.current) return;
    beginClampedWindowDrag(panelRef.current, e);
  }

  // resize
  function onResizeMouseDown(e: React.MouseEvent, side: "left" | "right") {
    e.preventDefault();
    e.stopPropagation();
    const p = panelRef.current!;
    const rect = p.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = p.offsetWidth;
    const startH = p.offsetHeight;
    // Match CSS --lm-panel-min-h intent: never shorter than header+footer+body band.
    const minH = 200;
    let moved = false;

    const move = (ev: MouseEvent) => {
      moved = true;
      const width = Math.max(280, startW + (side === "left" ? startX - ev.clientX : ev.clientX - startX));
      const height = Math.max(minH, startH + (ev.clientY - startY));
      if (side === "left") {
        // Anchor right edge, then clamp whole rect into safe band.
        p.style.left = `${rect.right - width}px`;
        p.style.right = "auto";
        p.style.width = `${width}px`;
        applyClampedSize(p, width, height, { minWidth: 280, minHeight: minH, anchorLeft: true });
        // re-apply left-anchor after clamp by preserving right edge intent
        const after = p.getBoundingClientRect();
        if (after.right < rect.right - 1 || after.right > rect.right + 1) {
          p.style.left = `${Math.max(8, rect.right - after.width)}px`;
        }
      } else {
        applyClampedSize(p, width, height, { minWidth: 280, minHeight: minH });
      }
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (moved) userResizedRef.current = true;
      fitElementInSafeBounds(p, {
        minWidth: 280,
        minHeight: minH,
        forceHeight: userResizedRef.current,
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // --- Girar ---
  function sendLook(dx: number, dy: number) { sendLookAt(api, dx, dy); }

  // --- Copiar Visual ---
  const [copiedFigure, setCopiedFigure] = React.useState("");
  const [copiedGender, setCopiedGender] = React.useState("M");
  const [copiedName,   setCopiedName]   = React.useState("");
  const [lookupName,   setLookupName]   = React.useState("");
  const [lookupLoading, setLookupLoading] = React.useState(false);

  React.useEffect(() => {
    // Click on avatar in room → always use live room figure (never Habblet API).
    return api.onOutgoing(2091, ({ packet }) => {
      const userId = new DataView(packet.body).getInt32(0, false);
      for (const unit of api.room.units.values()) {
        if (unit.type !== 1) continue;
        if (unit.id !== userId || !unit.figure) continue;
        setCopiedFigure(unit.figure);
        setCopiedGender((unit.sex ?? "M").toUpperCase().startsWith("F") ? "F" : "M");
        setCopiedName(unit.name);
        break;
      }
    });
  }, []);

  async function handleLookup() {
    const name = lookupName.trim();
    if (!name) return;

    // Prefer current room figure when the person is in the room.
    const wanted = name.toLocaleLowerCase().normalize("NFC");
    for (const unit of api.room.units.values()) {
      if (unit.type !== 1 || !unit.figure) continue;
      if (unit.name.toLocaleLowerCase().normalize("NFC") !== wanted) continue;
      setCopiedFigure(unit.figure);
      setCopiedGender((unit.sex ?? "M").toUpperCase().startsWith("F") ? "F" : "M");
      setCopiedName(unit.name);
      return;
    }

    // API only for search when the user is not in the current room.
    setLookupLoading(true);
    try {
      const data = await gmFetch<{ figure?: string; gender?: string; username?: string }>(
        `https://api.habblet.city/player/${encodeURIComponent(name)}`
      );
      setCopiedFigure(data.figure ?? "");
      setCopiedGender((data.gender ?? "M").toUpperCase().startsWith("F") ? "F" : "M");
      setCopiedName(data.username ?? name);
    } catch {
      // request falhou — mantém estado atual
    } finally {
      setLookupLoading(false);
    }
  }

  // --- Player tab ---
  const playerUnsubs = React.useRef(new Map<PlayerKey, () => void>());

  const PLAYER_DEFAULT: Record<PlayerKey, boolean> = {
    antiIdle: false, antiWalk: false, antiLook: false, antiTyping: false, blockClick: false, ctrlLook: false,
  };

  const [player, setPlayer] = React.useState<Record<PlayerKey, boolean>>(() =>
    readPref("luminus.player", PLAYER_DEFAULT)
  );

  const [blockClickCtrlBypass, setBlockClickCtrlBypassState] = React.useState(() =>
    readPref("luminus.player.blockClickCtrlBypass", false)
  );
  /** With Ctrl+click bypass: also allow UNIT_LOOK (anti-girar) during the same window. */
  const [blockClickCtrlBypassAntiLook, setBlockClickCtrlBypassAntiLookState] = React.useState(() =>
    readPref("luminus.player.blockClickCtrlBypassAntiLook", false)
  );
  const [outgoingClickAlert, setOutgoingClickAlertState] = React.useState(() => getOutgoingClickAlertEnabled());
  const blockClickCtrlBypassRef = React.useRef(blockClickCtrlBypass);
  blockClickCtrlBypassRef.current = blockClickCtrlBypass;
  const blockClickCtrlBypassAntiLookRef = React.useRef(blockClickCtrlBypassAntiLook);
  blockClickCtrlBypassAntiLookRef.current = blockClickCtrlBypassAntiLook;
  const ctrlClickBypassUntil = React.useRef(0);

  function toggleBlockClickCtrlBypass(v: boolean) {
    writePref("luminus.player.blockClickCtrlBypass", v);
    setBlockClickCtrlBypassState(v);
    // Nested option only makes sense with parent on.
    if (!v) {
      writePref("luminus.player.blockClickCtrlBypassAntiLook", false);
      setBlockClickCtrlBypassAntiLookState(false);
    }
  }

  function toggleBlockClickCtrlBypassAntiLook(v: boolean) {
    writePref("luminus.player.blockClickCtrlBypassAntiLook", v);
    setBlockClickCtrlBypassAntiLookState(v);
  }

  function toggleOutgoingClickAlert(v: boolean) {
    setOutgoingClickAlertEnabled(v);
    setOutgoingClickAlertState(v);
  }

  function activatePlayer(key: PlayerKey): (() => void) | null {
    if (key === "antiIdle") {
      return api.onIncoming(1797, ({ packet }: PacketHandlerContext) => {
        const data = packet.parsed as UnitIdle | undefined;
        if (data?.isIdle && data.unitId === api.myself?.index) {
          api.send("UNIT_ACTION", [0]);
        }
      });
    }
    if (key === "ctrlLook") {
      setLookEnabled(true);
      return () => setLookEnabled(false);
    }
    if (key === "blockClick") {
      const markCtrlClick = (e: PointerEvent) => {
        if (blockClickCtrlBypassRef.current && e.button === 0 && e.ctrlKey) {
          // Keep a short open window so both ROOM_USER_CLICK (431) and UNIT_LOOK (3301) can pass.
          ctrlClickBypassUntil.current = Date.now() + 750;
        }
      };
      window.addEventListener("pointerdown", markCtrlClick, true);
      const unblock = api.blockOutgoing(431, () => {
        // Allow for the whole window (do not clear on first packet — look may follow click).
        return Date.now() > ctrlClickBypassUntil.current;
      });
      return () => {
        window.removeEventListener("pointerdown", markCtrlClick, true);
        unblock();
      };
    }
    // Anti-girar: hard-block UNIT_LOOK, except during Ctrl+click bypass when the sub-option is on.
    if (key === "antiLook") {
      return api.blockOutgoing(3301, () => {
        if (
          blockClickCtrlBypassRef.current
          && blockClickCtrlBypassAntiLookRef.current
          && Date.now() <= ctrlClickBypassUntil.current
        ) {
          return false;
        }
        return true;
      });
    }
    if (key in PLAYER_OUTGOING) {
      return api.blockOutgoing(PLAYER_OUTGOING[key as keyof typeof PLAYER_OUTGOING]);
    }
    return null;
  }

  // Restore saved active toggles on mount
  React.useEffect(() => {
    const saved = readPref<Record<PlayerKey, boolean>>("luminus.player", PLAYER_DEFAULT);
    for (const [key, on] of Object.entries(saved) as [PlayerKey, boolean][]) {
      if (on && !playerUnsubs.current.has(key)) {
        const unsub = activatePlayer(key);
        if (unsub) playerUnsubs.current.set(key, unsub);
      }
    }
  }, []);

  function togglePlayer(key: PlayerKey, on: boolean) {
    if (on) {
      const unsub = activatePlayer(key);
      if (unsub) playerUnsubs.current.set(key, unsub);
    } else {
      playerUnsubs.current.get(key)?.();
      playerUnsubs.current.delete(key);
    }
    setPlayer(prev => {
      const next = { ...prev, [key]: on };
      writePref("luminus.player", next);
      return next;
    });
  }

  // --- Packets tab ---
  const unsubs = React.useRef(new Map<number, () => void>());
  const [blocked, setBlocked] = React.useState<Set<number>>(new Set());

  function toggleBlock(header: number, checked: boolean) {
    if (checked) {
      const unsub = api.blockIncoming(header);
      unsubs.current.set(header, unsub);
      setBlocked(prev => new Set([...prev, header]));
    } else {
      unsubs.current.get(header)?.();
      unsubs.current.delete(header);
      setBlocked(prev => { const s = new Set(prev); s.delete(header); return s; });
    }
  }

  // send packet
  const [sendHeader, setSendHeader] = React.useState("");
  const [sendValues, setSendValues] = React.useState("");

  function handleSend() {
    const h = parseInt(sendHeader.trim(), 10);
    if (isNaN(h)) return;
    let vals: unknown[] = [];
    if (sendValues.trim()) {
      try { vals = JSON.parse(sendValues.trim()); }
      catch { return; }
    }
    api.send(h, vals);
  }

  // --- Mutar geral ---
  const [muteAll, setMuteAll] = React.useState<MuteAllState>(() => getMuteAllState());
  const [furniClassHide, setFurniClassHide] = React.useState<FurniClassHideState>(() => getFurniClassHideState());
  const [muteWhitelistInput, setMuteWhitelistInput] = React.useState("");

  React.useEffect(() => subscribeMuteAll(setMuteAll), []);
  React.useEffect(() => subscribeFurniClassHide(setFurniClassHide), []);

  function addWhitelistName() {
    const name = muteWhitelistInput.trim();
    if (!name) return;
    addMuteAllWhitelist(name);
    setMuteWhitelistInput("");
  }

  // --- Spam Click ---
  // Target fill mirrors Copiar Visual (room click), but while spam is ON the name is locked
  // unless "Mudar alvo ao clicar" is enabled — otherwise our own 431 spam would fight the input.
  const [spamTarget, setSpamTarget] = React.useState("");
  const [spamActive, setSpamActive] = React.useState(false);
  const [spamRetarget, setSpamRetargetState] = React.useState(() =>
    readPref("luminus.player.spamRetarget", false)
  );
  const spamTargetRef = React.useRef(spamTarget);
  spamTargetRef.current = spamTarget;
  const spamActiveRef = React.useRef(spamActive);
  spamActiveRef.current = spamActive;
  const spamRetargetRef = React.useRef(spamRetarget);
  spamRetargetRef.current = spamRetarget;
  const spamIntervalId = React.useRef<ReturnType<typeof window.setInterval> | null>(null);
  /** Outgoing 431 we emit ourselves — never use them to retarget. */
  const spamSelfSendUntil = React.useRef(0);

  function setSpamTargetIfChanged(name: string): void {
    if (!name || name === spamTargetRef.current) return;
    spamTargetRef.current = name;
    setSpamTarget(name);
  }

  function toggleSpamRetarget(v: boolean): void {
    writePref("luminus.player.spamRetarget", v);
    setSpamRetargetState(v);
  }

  // Fill target from a real user click. Habblet sends USER_BADGES_CURRENT (2091) with
  // userId — same packet Copiar Visual uses. Packet 431 is what *we* spam; the client
  // click path is 2091, which is why the field never filled before.
  // - Spam off: always update nick on click (even if already filled).
  // - Spam on + "Mudar alvo ao clicar": allow swapping target.
  // - Spam on without that option: locked at activation.
  React.useEffect(() => {
    const fromUserId = (packet: { body: ArrayBuffer }) => {
      if (spamActiveRef.current && !spamRetargetRef.current) return;
      if (packet.body.byteLength < 4) return;
      const userId = new DataView(packet.body).getInt32(0, false);
      for (const unit of api.room.units.values()) {
        if (unit.id === userId && unit.name) {
          setSpamTargetIfChanged(unit.name);
          return;
        }
      }
    };
    const fromRoomIndex = (packet: { body: ArrayBuffer }) => {
      // Only client clicks — ignore our own spam 431s.
      if (Date.now() <= spamSelfSendUntil.current) return;
      if (spamActiveRef.current && !spamRetargetRef.current) return;
      if (packet.body.byteLength < 4) return;
      const roomIdx = new DataView(packet.body).getInt32(0, false);
      const unit = api.room.units.get(roomIdx);
      if (unit?.name) setSpamTargetIfChanged(unit.name);
    };
    const unsubBadges = api.onOutgoing(2091, ({ packet }) => fromUserId(packet));
    const unsubClick = api.onOutgoing(431, ({ packet, origin }) => {
      if (origin !== "client") return;
      fromRoomIndex(packet);
    });
    return () => {
      unsubBadges();
      unsubClick();
    };
  }, [api]);

  React.useEffect(() => () => {
    if (spamIntervalId.current !== null) window.clearInterval(spamIntervalId.current);
  }, []);

  function toggleSpam(on: boolean) {
    setSpamActive(on);
    spamActiveRef.current = on;
    if (on) {
      // Lock current field value as the spam target at activation time.
      const locked = spamTargetRef.current.trim();
      if (locked) setSpamTargetIfChanged(locked);
      if (spamIntervalId.current !== null) window.clearInterval(spamIntervalId.current);
        spamIntervalId.current = window.setInterval(() => {
          const name = spamTargetRef.current.trim();
          if (!name) return;
          const unit = [...api.room.units.values()].find(u => u.name === name);
          if (!unit) return;
          spamSelfSendUntil.current = Date.now() + 40;
          api.send(new RoomUserClickComposer(unit.index));
        }, 50);
    } else if (spamIntervalId.current !== null) {
      window.clearInterval(spamIntervalId.current);
      spamIntervalId.current = null;
      spamSelfSendUntil.current = 0;
    }
  }

  // --- Logs tab ---
  const [logConfig, setLogConfig] = React.useState<LogsConfig>(() => ({
    ...LOGS_CONFIG_DEFAULT,
    ...readPref("luminus.logs.config", LOGS_CONFIG_DEFAULT),
  }));
  const logConfigRef = React.useRef(logConfig);
  logConfigRef.current = logConfig;

  const [newFriendName, setNewFriendName] = React.useState("");
  const [newRoomName,   setNewRoomName]   = React.useState("");
  React.useEffect(() => {
    setupLogHandlers(api, () => logConfigRef.current);
    return teardownLogHandlers;
  }, []);

  function updateLogConfig(patch: Partial<LogsConfig>): void {
    setLogConfig(prev => {
      const next = { ...prev, ...patch };
      writePref("luminus.logs.config", next);
      logConfigRef.current = next;
      return next;
    });
  }

  function addFriendName(): void {
    const name = newFriendName.trim();
    if (!name || logConfig.friendNames.includes(name)) return;
    updateLogConfig({ friendNames: [...logConfig.friendNames, name] });
    setNewFriendName("");
  }

  function removeFriendName(name: string): void {
    updateLogConfig({ friendNames: logConfig.friendNames.filter(n => n !== name) });
  }

  function addRoomName(): void {
    const name = newRoomName.trim();
    if (!name || logConfig.roomNames.includes(name)) return;
    updateLogConfig({ roomNames: [...logConfig.roomNames, name] });
    setNewRoomName("");
  }

  function removeRoomName(name: string): void {
    updateLogConfig({ roomNames: logConfig.roomNames.filter(n => n !== name) });
  }

  function testWebhook(url: string): void {
    if (!url) return;
    gmPost(url, { content: "✅ **Webhook funcionando!**", username: "[Luminus] Teste" });
  }

  // --- Debug tab ---
  // Packets/Debug tabs are dev-only: unlock via console with GM_setValue('luminus.devMode', true) + reload.
  // Read once at mount — reload picks up the change, no reactive watcher needed.
  const devMode = __LUMINUS_DEV_TOOLS__;
  const [debugOn, setDebugOn]      = React.useState(() => api.debug.isEnabled());
  const [parsedOnly, setParsedOnly] = React.useState(() => api.debug.isParsedOnly());
  const [mcpBridgeOn, setMcpBridgeOn] = React.useState(() => __LUMINUS_MCP__ && getMcpBridgeEnabled());
  const [mcpBridgeStatus, setMcpBridgeStatus] = React.useState(() => __LUMINUS_MCP__ ? getMcpBridgeStatus() : "disconnected");

  React.useEffect(() => {
    if (!__LUMINUS_MCP__) return;
    const id = setInterval(() => setMcpBridgeStatus(getMcpBridgeStatus()), 2000);
    return () => clearInterval(id);
  }, [devMode]);

  // --- UI tab ---
  const [toolbarGlass, setToolbarGlassState] = React.useState(() => getToolbarGlass());
  function toggleToolbarGlass(v: boolean) {
    setToolbarGlass(v);
    setToolbarGlassState(v);
  }
  const [uiGlassSettings, setUiGlassSettings] = React.useState(() => getUiGlassSettings());
  function toggleUiGlassCategory(category: UiGlassCategory, enabled: boolean) {
    setUiGlassCategory(category, enabled);
    setUiGlassSettings(current => ({ ...current, [category]: enabled }));
  }
  const [radioVisible, setRadioVisibleState] = React.useState(() => getRadioVisible());
  function toggleRadioVisible(enabled: boolean) {
    setRadioVisible(enabled);
    setRadioVisibleState(enabled);
  }
  const [wardrobeStacked, setWardrobeStackedState] = React.useState(() => getWardrobeStacked());
  function toggleWardrobeStacked(v: boolean) {
    setWardrobeStacked(v);
    setWardrobeStackedState(v);
  }
  const [incrementalRoomCanvas, setIncrementalRoomCanvasState] = React.useState(
    () => getIncrementalRoomCanvasEnabled(),
  );
  function toggleIncrementalRoomCanvas(enabled: boolean) {
    setIncrementalRoomCanvasEnabled(enabled);
    setIncrementalRoomCanvasState(enabled);
  }
  
    const backTarget = (): PanelView => "launcher";



  const gridShell = view === "launcher";

  return (
    <div id="luminus-panel" ref={panelRef} className={`${open ? "is-open" : ""} is-${view}${gridShell ? " is-grid-shell" : ""}`} style={{ top: 80, right: 20 }}>
      <div className="lm-header" onMouseDown={onHeaderMouseDown}>
        {view === "launcher" ? <span className="lm-title">
          <svg className="lm-mark" viewBox="0 0 500 500" fill="none" aria-hidden="true">
            <path fill="url(#lm-panel-mark-grad)" opacity="0.95" d="M 243.5 147 L 249 165.5 L 257 182.5 L 271 202 L 273 202 Q 271.9 204.7 274.5 204 Q 286.3 217.7 303.5 226 L 314.5 231 L 333 236.5 Q 313.9 239.9 299.5 248 Q 280.6 258.1 267 273.5 L 264.5 277 L 263 259.5 L 258 243.5 Q 249.4 223.1 233.5 210 L 221 202 L 221 199.5 L 228 190.5 L 238 170.5 Q 242.3 160.3 243.5 147 Z" />
            <path fill="url(#lm-panel-mark-grad)" opacity="0.95" d="M 231.5 223 Q 231.4 242.6 238 255.5 Q 247.1 275.9 263.5 289 L 277 298.5 Q 258.8 319.8 253.5 354 Q 244.6 311.9 217.5 288 L 196.5 273 L 181.5 266 L 168.5 263 L 167 261.5 Q 185 258 198.5 250 L 225 231 L 231.5 223 Z" />
            <defs>
              <linearGradient id="lm-panel-mark-grad" x1="167" y1="147" x2="333" y2="354" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e4e8ff"/>
                <stop offset="1" stopColor="#8ea2ff"/>
              </linearGradient>
            </defs>
          </svg>
          {LUMINUS_BUILD_NAME}
        </span> : <div className="lm-view-heading">
          <button className="lm-back" onClick={() => setView(backTarget())} onMouseDown={e => e.stopPropagation()} title="Voltar">
            <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="lm-view-icon"><ViewIcon view={view} size={18} /></span>
          <span className="lm-view-title">{viewLabel(view)}</span>
        </div>}
        <div className="lm-header-actions">
          <a
            className="lm-discord"
            href="https://discord.gg/HmVkadXGVz"
            target="_blank"
            rel="noreferrer"
            title="Entrar no Discord"
            onMouseDown={e => e.stopPropagation()}
          >
            <svg width="18" height="13.64" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,50.9,6.83,72.37,72.37,0,0,0,47.5,0,105.89,105.89,0,0,0,20.79,8.09C2.79,34.4-1.71,60.13.54,85.09h0A105.73,105.73,0,0,0,32.71,101.36,77.7,77.7,0,0,0,39.6,89.71a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.64A105.25,105.25,0,0,0,126.6,85.1h0C129.24,56.55,121.9,31,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
          </a>
          <button className="lm-close" onClick={onClose} title="Fechar" onMouseDown={e => e.stopPropagation()}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {view === "launcher" && <div className="lm-launcher">
        
        <button className="lm-launcher-item is-player" onClick={() => setView("player")}>
          <span className="lm-launcher-icon"><Gamepad2 aria-hidden="true" /></span>
          <span>Player</span>
        </button>
        <button className="lm-launcher-item is-logs" onClick={() => setView("logs")}>
          <span className="lm-launcher-icon"><ScrollText aria-hidden="true" /></span>
          <span>Logs</span>
        </button>
        <button className="lm-launcher-item is-visual" onClick={() => setView("visual")}>
          <span className="lm-launcher-icon"><PanelsTopLeft aria-hidden="true" /></span>
          <span>Visual</span>
        </button>
        <button className="lm-launcher-item is-render" onClick={() => setView("render")}>
          <span className="lm-launcher-icon"><EyeOff aria-hidden="true" /></span>
          <span>Renderização</span>
        </button>
        
        {devMode && <button className="lm-launcher-item is-dev" onClick={() => setView("packets")}>
          <span className="lm-launcher-icon"><RadioTower aria-hidden="true" /></span>
          <span>Packets</span>
        </button>}
        {devMode && <button className="lm-launcher-item is-dev" onClick={() => setView("debug")}>
          <span className="lm-launcher-icon"><Bug aria-hidden="true" /></span>
          <span>Debug</span>
        </button>}
      </div>}

      

        {view === "player" && <div className="lm-tab-content">
          <div className="lm-section">
            <div className="lm-section-title">Avatar</div>
            {PLAYER_TOGGLES.map(({ key, label, sub }) => {
              const control = (
                <Switch.Root
                  className="lm-switch-root"
                  checked={player[key]}
                  onCheckedChange={v => togglePlayer(key, v)}
                >
                  <Switch.Thumb className="lm-switch-thumb" />
                </Switch.Root>
              );

              if (key === "blockClick") return (
                <ExpandableOption key={key} label={label} sub={sub} detailLabel="Configurar" control={control}>
                  <div className="lm-row lm-row-sub">
                    <span className="lm-label">
                      Ctrl + clique libera
                      <span className="lm-sub">Segure Ctrl quando quiser clicar mesmo com o bloqueio.</span>
                    </span>
                    <Switch.Root
                      className="lm-switch-root"
                      checked={blockClickCtrlBypass}
                      onCheckedChange={toggleBlockClickCtrlBypass}
                    >
                      <Switch.Thumb className="lm-switch-thumb" />
                    </Switch.Root>
                  </div>
                  <div className="lm-row lm-row-sub lm-row-sub2">
                    <span className="lm-label">
                      Ctrl + clique libera anti-girar
                      <span className="lm-sub">
                        No mesmo Ctrl+clique, também deixa passar o olhar/giro (desbloqueia o Anti-Girar por um instante).
                      </span>
                    </span>
                    <Switch.Root
                      className="lm-switch-root"
                      checked={blockClickCtrlBypassAntiLook}
                      disabled={!blockClickCtrlBypass}
                      onCheckedChange={toggleBlockClickCtrlBypassAntiLook}
                    >
                      <Switch.Thumb className="lm-switch-thumb" />
                    </Switch.Root>
                  </div>
                  <div className="lm-row lm-row-sub">
                    <span className="lm-label">
                      Avisar quando eu clicar
                      <span className="lm-sub">Mostra “Você clicou em Fulano” quando um clique passa.</span>
                    </span>
                    <Switch.Root
                      className="lm-switch-root"
                      checked={outgoingClickAlert}
                      onCheckedChange={toggleOutgoingClickAlert}
                    >
                      <Switch.Thumb className="lm-switch-thumb" />
                    </Switch.Root>
                  </div>
                </ExpandableOption>
              );

              if (key === "ctrlLook") return (
                <ExpandableOption key={key} label={label} sub={sub} detailLabel="Direções" control={control}>
                  <div className="lm-dpad lm-dpad-sm">
                    <button className="lm-dpad-btn" aria-label="Virar para cima e esquerda" onClick={() => sendLook(-1, -1)}>↖</button>
                    <button className="lm-dpad-btn" aria-label="Virar para cima" onClick={() => sendLook( 0, -1)}>↑</button>
                    <button className="lm-dpad-btn" aria-label="Virar para cima e direita" onClick={() => sendLook( 1, -1)}>↗</button>
                    <button className="lm-dpad-btn" aria-label="Virar para esquerda" onClick={() => sendLook(-1,  0)}>←</button>
                    <div aria-hidden="true" />
                    <button className="lm-dpad-btn" aria-label="Virar para direita" onClick={() => sendLook( 1,  0)}>→</button>
                    <button className="lm-dpad-btn" aria-label="Virar para baixo e esquerda" onClick={() => sendLook(-1,  1)}>↙</button>
                    <button className="lm-dpad-btn" aria-label="Virar para baixo" onClick={() => sendLook( 0,  1)}>↓</button>
                    <button className="lm-dpad-btn" aria-label="Virar para baixo e direita" onClick={() => sendLook( 1,  1)}>↘</button>
                  </div>
                </ExpandableOption>
              );

              return (
                <div className="lm-row" key={key}>
                  <span className="lm-label">
                    {label}
                    <span className="lm-sub">{sub}</span>
                  </span>
                  {control}
                </div>
              );
            })}
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Mutar geral</div>
            <ExpandableOption
              label="Mutar geral"
              sub={
                muteAll.enabled
                  ? "Ativo — chat de todos bloqueado no cliente (exceto whitelist). Você nunca é mutado."
                  : "Bloqueia o chat de todo mundo no cliente, na hora. Você nunca é mutado."
              }
              detailLabel="Opções"
              control={
                <Switch.Root
                  className="lm-switch-root"
                  checked={muteAll.enabled}
                  onCheckedChange={setMuteAllEnabled}
                  aria-label="Mutar geral"
                >
                  <Switch.Thumb className="lm-switch-thumb" />
                </Switch.Root>
              }
            >
              <div className="lm-row lm-row-sub">
                <span className="lm-label">
                  Esconder personagens
                  <span className="lm-sub">Some avatares mutados no canvas (sem remover do motor — evita bug de cabeça/corpo).</span>
                </span>
                <Switch.Root
                  className="lm-switch-root"
                  checked={muteAll.hideAvatars}
                  onCheckedChange={setMuteAllHideAvatars}
                  aria-label="Esconder personagens no mute geral"
                >
                  <Switch.Thumb className="lm-switch-thumb" />
                </Switch.Root>
              </div>
              <div className="lm-row lm-row-sub">
                <span className="lm-label">
                  Mostrar balões de mute
                  <span className="lm-sub">Ícone de “calado” em cima dos mutados. Desligado: continuam mutados, sem balão.</span>
                </span>
                <Switch.Root
                  className="lm-switch-root"
                  checked={muteAll.showMuteIcons}
                  onCheckedChange={setMuteAllShowIcons}
                  aria-label="Mostrar balões de mute"
                >
                  <Switch.Thumb className="lm-switch-thumb" />
                </Switch.Root>
              </div>
              <div className="lm-row lm-row-sub" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <span className="lm-label">
                  Whitelist
                  <span className="lm-sub">Nicks aqui não são mutados. Desmutar no infostand também adiciona aqui.</span>
                </span>
                <div className="lm-input-row">
                  <input
                    className="lm-input"
                    placeholder="Nick na whitelist"
                    value={muteWhitelistInput}
                    onChange={e => setMuteWhitelistInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addWhitelistName()}
                  />
                  <button className="lm-btn lm-btn-icon" onClick={addWhitelistName} title="Adicionar">+</button>
                </div>
                {muteAll.whitelist.length > 0 && (
                  <div className="lm-tag-list">
                    {muteAll.whitelist.map(name => (
                      <div key={name} className="lm-tag">
                        <span>{name}</span>
                        <button
                          className="lm-tag-remove"
                          onClick={() => removeMuteAllWhitelist(name)}
                          title="Remover da whitelist"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ExpandableOption>
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Copiar Visual</div>
            <div className="lm-avatar-row">
              <div className="lm-avatar-box">
                {copiedFigure
                  ? <img
                      src={`https://imaging.habblet.city/avatarimage?figure=${copiedFigure}&direction=3&head_direction=3&size=l`}
                      alt={copiedName}
                    />
                  : <span className="lm-avatar-empty">?</span>
                }
              </div>
              <div className="lm-avatar-info">
                {copiedName && <span className="lm-avatar-name">{copiedName}</span>}
                <span className="lm-sub">Clique em alguém no quarto ou procure pelo nick.</span>
              </div>
            </div>
            <div className="lm-input-row">
              <input
                className="lm-input"
                placeholder="Nick do jogador"
                value={lookupName}
                onChange={e => setLookupName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
              />
              <button className="lm-btn lm-lookup-btn" onClick={handleLookup} disabled={lookupLoading}>
                {lookupLoading ? "…" : "Buscar"}
              </button>
            </div>
            <button className="lm-btn lm-btn-full" disabled={!copiedFigure} onClick={() => api.setFigure(copiedGender, copiedFigure)}>
              Usar Visual
            </button>
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Spam Click</div>
            <div className="lm-inline-option">
              <input
                className="lm-input"
                aria-label="Nick do alvo"
                placeholder="Nick do alvo"
                value={spamTarget}
                onChange={e => setSpamTarget(e.target.value)}
                readOnly={spamActive && !spamRetarget}
                title={spamActive && !spamRetarget ? "Alvo travado enquanto o spam está ativo" : undefined}
              />
              <Switch.Root
                className="lm-switch-root"
                checked={spamActive}
                onCheckedChange={toggleSpam}
                aria-label="Ativar Spam Click"
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
            <div className="lm-row">
              <span className="lm-label">
                Mudar alvo ao clicar
                <span className="lm-sub">
                  {spamActive && !spamRetarget
                    ? "Spam ativo: alvo travado no nick de quando você ligou."
                    : "Com o spam ligado, clicar em outro jogador troca o alvo. Com spam desligado, o clique sempre preenche/troca o nick."}
                </span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={spamRetarget}
                onCheckedChange={toggleSpamRetarget}
                aria-label="Mudar alvo ao clicar com spam ativo"
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
          </div>
        </div>}

        {view === "logs" && <div className="lm-tab-content">
          <div className="lm-log-shortcuts">
            <button className="lm-btn lm-btn-logs" onClick={onOpenLogs}>Ver Logs</button>
            <button className="lm-btn lm-btn-logs" onClick={onOpenLinks}>Abrir Links Salvos</button>
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Chat Log</div>
            <div className="lm-row">
              <span className="lm-label">Ativar Chat Log<span className="lm-sub">Manda cliques e sussurros para o Discord.</span></span>
              <Switch.Root
                className="lm-switch-root"
                checked={logConfig.chatEnabled}
                onCheckedChange={v => updateLogConfig({ chatEnabled: v })}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
            <div className="lm-input-row">
              <input className="lm-input" placeholder="Webhook do Discord" value={logConfig.chatWebhook} onChange={e => updateLogConfig({ chatWebhook: e.target.value })} />
              <button className="lm-btn lm-compact-btn" onClick={() => testWebhook(logConfig.chatWebhook)}>Testar Webhook</button>
            </div>
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Friend Log</div>
            <div className="lm-row">
              <span className="lm-label">Ativar Friend Log<span className="lm-sub">Avisa quando seus amigos entram ou saem.</span></span>
              <Switch.Root
                className="lm-switch-root"
                checked={logConfig.friendEnabled}
                onCheckedChange={v => updateLogConfig({ friendEnabled: v })}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
            <div className="lm-input-row">
              <input className="lm-input" placeholder="Webhook do Discord" value={logConfig.friendWebhook} onChange={e => updateLogConfig({ friendWebhook: e.target.value })} />
              <button className="lm-btn lm-compact-btn" onClick={() => testWebhook(logConfig.friendWebhook)}>Testar Webhook</button>
            </div>
            <div className="lm-input-row">
              <input className="lm-input" placeholder="Nome do amigo" value={newFriendName} onChange={e => setNewFriendName(e.target.value)} onKeyDown={e => e.key === "Enter" && addFriendName()} />
              <button className="lm-btn lm-btn-icon" onClick={addFriendName} title="Adicionar">+</button>
            </div>
            {logConfig.friendNames.length > 0 && <div className="lm-tag-list">
              {logConfig.friendNames.map(name => <div key={name} className="lm-tag"><span>{name}</span><button className="lm-tag-remove" onClick={() => removeFriendName(name)}>×</button></div>)}
            </div>}
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Room Monitor</div>
            <div className="lm-row">
              <span className="lm-label">Ativar Room Monitor<span className="lm-sub">Mostra quem entrou, saiu e quanto tempo ficou.</span></span>
              <Switch.Root
                className="lm-switch-root"
                checked={logConfig.roomEnabled}
                onCheckedChange={v => updateLogConfig({ roomEnabled: v })}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
            <div className="lm-input-row">
              <input className="lm-input" placeholder="Webhook do Discord" value={logConfig.roomWebhook} onChange={e => updateLogConfig({ roomWebhook: e.target.value })} />
              <button className="lm-btn lm-compact-btn" onClick={() => testWebhook(logConfig.roomWebhook)}>Testar Webhook</button>
            </div>
            <div className="lm-input-row">
              <input className="lm-input" placeholder="Nome do jogador" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} onKeyDown={e => e.key === "Enter" && addRoomName()} />
              <button className="lm-btn lm-btn-icon" onClick={addRoomName} title="Adicionar">+</button>
            </div>
            {logConfig.roomNames.length > 0 && <div className="lm-tag-list">
              {logConfig.roomNames.map(name => <div key={name} className="lm-tag"><span>{name}</span><button className="lm-tag-remove" onClick={() => removeRoomName(name)}>×</button></div>)}
            </div>}
          </div>

        </div>}

        {view === "visual" && <div className="lm-tab-content">
          <div className="lm-section">
            <div className="lm-section-title">Tema</div>
            <ExpandableOption
              label="Usar UI do Luminus"
              sub="Aplica a interface visual do Luminus nas áreas do Habblet."
              detailLabel="Personalizar áreas"
              defaultOpen
              control={<Switch.Root
                className="lm-switch-root"
                checked={toolbarGlass}
                onCheckedChange={toggleToolbarGlass}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>}
            >
              {UI_GLASS_CATEGORIES.map(category => (
                <div className="lm-row lm-row-sub" key={category}>
                  <span className="lm-label">
                    {getUiGlassCategoryLabel(category)}
                    <span className="lm-sub">Ativa ou desativa esta área sem alterar as outras.</span>
                  </span>
                  <Switch.Root
                    className="lm-switch-root"
                    checked={toolbarGlass && uiGlassSettings[category]}
                    disabled={!toolbarGlass}
                    onCheckedChange={enabled => toggleUiGlassCategory(category, enabled)}
                  >
                    <Switch.Thumb className="lm-switch-thumb" />
                  </Switch.Root>
                </div>
              ))}
            </ExpandableOption>
            <div className="lm-row">
              <span className="lm-label">
                Mostrar rádio
                <span className="lm-sub">Exibe ou esconde o rádio no canto da tela.</span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={radioVisible}
                onCheckedChange={toggleRadioVisible}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
          </div>
          <div className="lm-section">
            <div className="lm-section-title">Desempenho</div>
            <div className="lm-row">
              <span className="lm-label">
                Carregamento suave de quartos
                <span className="lm-sub">Distribui personagens e mobis ao entrar. Reentre no quarto para comparar.</span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={incrementalRoomCanvas}
                onCheckedChange={toggleIncrementalRoomCanvas}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
          </div>
          <div className="lm-section">
            <div className="lm-section-title">Guarda-Roupa</div>
            <div className="lm-row">
              <span className="lm-label">
                Guarda-Roupa Horizontal
                <span className="lm-sub">Deixa os visuais em cima e as cores embaixo.</span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={wardrobeStacked}
                onCheckedChange={toggleWardrobeStacked}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
          </div>
        </div>}

        {view === "render" && <div className="lm-tab-content">
          <div className="lm-section">
            <div className="lm-section-title">Mobis</div>
            <div className="lm-row">
              <span className="lm-label">
                Ocultar classe (infostand + Mobis)
                <span className="lm-sub">
                  Olho no infostand do mobi e em cada linha da janela Mobis (:furnis).
                  Só o olho devolve a visibilidade — fechar o infostand não restaura.
                </span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={furniClassHide.enabled}
                onCheckedChange={setFurniClassHideEnabled}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
            {furniClassHide.enabled && (
              <div className="lm-status-grid">
                <span>
                  <b>Foco</b>
                  {furniClassHide.focusLabel
                    ? `${furniClassHide.focusLabel}${furniClassHide.focusHidden ? " · oculto" : ""}${furniClassHide.focusCount ? ` · ${furniClassHide.focusCount}×` : ""}`
                    : "nenhum mobi aberto"}
                </span>
                <span>
                  <b>Classes ocultas</b>
                  {furniClassHide.hiddenTypes?.length
                    ? `${furniClassHide.hiddenTypes.length} · ${furniClassHide.hiddenCount} mobis`
                    : "—"}
                </span>
              </div>
            )}
          </div>
        </div>}

        

        {devMode && view === "packets" && <div className="lm-tab-content">
          <div className="lm-section">
            <div className="lm-section-title">Enviar Packet</div>
            <div className="lm-input-block">
              <div className="lm-input-label">Header + Valores</div>
              <div className="lm-input-row">
                <input
                  className="lm-input lm-input-short"
                  placeholder="Header"
                  value={sendHeader}
                  onChange={e => setSendHeader(e.target.value)}
                />
                <input
                  className="lm-input"
                  placeholder='["val1", 2]'
                  value={sendValues}
                  onChange={e => setSendValues(e.target.value)}
                />
                <button className="lm-btn" onClick={handleSend}>Enviar</button>
              </div>
            </div>
          </div>

          <div className="lm-section">
            <div className="lm-section-title">Bloquear Incoming</div>
            {BLOCK_HEADERS.map(({ header, label, sub }) => (
              <div key={header} className="lm-row">
                <span className="lm-label">
                  {label}
                  <span className="lm-sub">{sub}</span>
                </span>
                <Switch.Root
                  className="lm-switch-root"
                  checked={blocked.has(header)}
                  onCheckedChange={v => toggleBlock(header, v)}
                >
                  <Switch.Thumb className="lm-switch-thumb" />
                </Switch.Root>
              </div>
            ))}
          </div>
        </div>}

        {devMode && view === "debug" && <div className="lm-tab-content">
          <div className="lm-section">
            <div className="lm-section-title">Logs</div>
            <div className="lm-row">
              <span className="lm-label">
                Debug
                <span className="lm-sub">Log todos os packets</span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={debugOn}
                onCheckedChange={v => { api.debug.setEnabled(v); writePref("luminus.consoleLog", v); setDebugOn(v); }}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
            <div className="lm-row">
              <span className="lm-label">
                Apenas parseados
                <span className="lm-sub">Ocultar packets sem parser</span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={parsedOnly}
                onCheckedChange={v => { api.debug.setParsedOnly(v); writePref("luminus.parsedOnly", v); setParsedOnly(v); }}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
          </div>
          {__LUMINUS_MCP__ && <div className="lm-section">
            <div className="lm-section-title">Bridge MCP</div>
            <div className="lm-row">
              <span className="lm-label">
                Bridge MCP (dev)
                <span className="lm-sub">
                  Conecta em 127.0.0.1:8934 pro servidor MCP ler DOM/console/packets — {" "}
                  {mcpBridgeStatus === "connected" ? "conectado" : mcpBridgeStatus === "connecting" ? "conectando…" : "desconectado"}
                </span>
              </span>
              <Switch.Root
                className="lm-switch-root"
                checked={mcpBridgeOn}
                onCheckedChange={v => { setMcpBridgeEnabled(v); setMcpBridgeOn(v); setMcpBridgeStatus(getMcpBridgeStatus()); }}
              >
                <Switch.Thumb className="lm-switch-thumb" />
              </Switch.Root>
            </div>
          </div>}
        </div>}
      <div className="lm-footer">
        <span className="lm-footer-version">v{LUMINUS_VERSION}</span>
        <span className="lm-footer-credit">Developed by: Lx</span>
      </div>
      <div className="lm-resize-corner is-left" onMouseDown={e => onResizeMouseDown(e, "left")} />
      <div className="lm-resize-corner is-right" onMouseDown={e => onResizeMouseDown(e, "right")} />
    </div>
  );
}
