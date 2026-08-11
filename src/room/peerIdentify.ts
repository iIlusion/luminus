import type { LuminusApi } from "../ws/api";
import type { UnitExpression } from "../messages/incoming/UnitExpressionParser";
import { RoomUnitActionComposer } from "../messages/outgoing/RoomUnitActionComposer";
import { ensureRoomEngine } from "./nitroWorldOverlay";
import { getTargetWindow } from "../ws/interceptWebSocket";
import {
  getPeerAnnounceEnabled,
  getPeerIconsEnabled,
  subscribePeerIdentifySettings,
} from "./peerIdentifySettings";
import { PRESENCE_ICON_101, PRESENCE_ICON_102 } from "./presenceIcons";

export const LUMINUS_PEER_CODE = 1337;
const PROBE = -LUMINUS_PEER_CODE;
const ACK = LUMINUS_PEER_CODE;
const UNIT_CATEGORY = 100;
const OVERLAY_ID = "luminus-world-overlay";
const PEER_MARKER_CLASS = "luminus-peer-marker";
const PROBE_DELAY_MS = 900;
const PROBE_COOLDOWN_MS = 2500;

type PageWin = Window & { __luminusPeerIdentify?: boolean };

export type DetectedExtension = "luminus" | "presence-102" | "presence-101";

const EXTENSION_LABEL: Record<DetectedExtension, string> = {
  luminus: "Luminus",
  "presence-102": "Extensão detectada",
  "presence-101": "Extensão detectada",
};

const peers = new Set<number>();
const extensions = new Map<number, Set<DetectedExtension>>();
const acked = new Set<number>();
const markers = new Map<number, HTMLElement>();

let lastProbeAt = 0;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let raf = 0;
let unsubs: Array<() => void> = [];

export function getPeerExtensions(unitId: number): DetectedExtension[] {
  return [...(extensions.get(unitId) ?? [])];
}

export function getLuminusPeers(): ReadonlySet<number> {
  return peers;
}

function isSelf(api: LuminusApi, unitId: number): boolean {
  return api.myself?.index === unitId;
}

function sendExpression(api: LuminusApi, expression: number): void {
  if (!getPeerIconsEnabled() || !getPeerAnnounceEnabled()) return;
  api.send(new RoomUnitActionComposer(expression));
}

function markPeer(unitId: number, extension: DetectedExtension): void {
  if (!Number.isFinite(unitId)) return;
  const detected = extensions.get(unitId) ?? new Set<DetectedExtension>();
  detected.add(extension);
  extensions.set(unitId, detected);
  peers.add(unitId);
  if (getPeerIconsEnabled()) updateMarker(unitId);
}

function unmarkPeer(unitId: number): void {
  peers.delete(unitId);
  extensions.delete(unitId);
  acked.delete(unitId);
  const marker = markers.get(unitId);
  if (marker) {
    marker.remove();
    markers.delete(unitId);
  }
}

function clearRoomPeers(): void {
  if (probeTimer != null) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  peers.clear();
  extensions.clear();
  acked.clear();
  for (const marker of markers.values()) marker.remove();
  markers.clear();
}

function hidePeerMarkers(): void {
  if (probeTimer != null) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  for (const marker of markers.values()) marker.remove();
  markers.clear();
}

function ensureOverlay(): HTMLElement | null {
  const doc = getTargetWindow().document;
  if (!doc?.body) return null;
  let overlay = doc.getElementById(OVERLAY_ID);
  if (!overlay) {
    const canvas = doc.querySelector<HTMLCanvasElement>("canvas");
    const parent = canvas?.parentElement ?? doc.body;
    if (parent !== doc.body && getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    overlay = doc.createElement("div");
    overlay.id = OVERLAY_ID;
    parent.appendChild(overlay);
  }
  return overlay;
}

function appendIcon(wrapper: HTMLElement, extension: DetectedExtension): void {
  if (extension === "luminus") {
    const source = wrapper.ownerDocument.querySelector<SVGElement>(
      "#luminus-icon svg, #luminus-panel .lm-mark",
    );
    const clone = source?.cloneNode(true) as SVGElement | undefined;
    if (clone) {
      clone.removeAttribute("id");
      clone.setAttribute("viewBox", "130 110 240 280");
      clone.classList.add("luminus-peer-marker-svg");
      wrapper.appendChild(clone);
      return;
    }
  } else {
    const image = wrapper.ownerDocument.createElement("img");
    image.src = extension === "presence-102" ? PRESENCE_ICON_102 : PRESENCE_ICON_101;
    image.alt = "";
    image.width = 28;
    image.height = 28;
    image.decoding = "async";
    image.draggable = false;
    wrapper.appendChild(image);
  }
}

function updateMarker(unitId: number): void {
  const marker = markers.get(unitId);
  if (!marker) return;
  const detected = [...(extensions.get(unitId) ?? [])];
  const markerKey = detected.join("|");
  if (marker.dataset.extensions === markerKey) return;
  marker.dataset.extensions = markerKey;
  const labels = detected.map(extension => EXTENSION_LABEL[extension]);
  marker.setAttribute(
    "aria-label",
    labels.length ? `Extensões detectadas: ${labels.join(", ")}` : "Extensão detectada",
  );
  marker.replaceChildren(...detected.map(extension => {
    const wrapper = marker.ownerDocument.createElement("span");
    wrapper.className = "luminus-peer-marker-icon";
    wrapper.dataset.extension = extension;
    wrapper.title = EXTENSION_LABEL[extension];
    appendIcon(wrapper, extension);
    return wrapper;
  }));
}

function ensureMarker(unitId: number): HTMLElement | null {
  if (!getPeerIconsEnabled()) return null;
  let marker = markers.get(unitId);
  if (marker?.isConnected) {
    updateMarker(unitId);
    return marker;
  }
  const overlay = ensureOverlay();
  if (!overlay) return null;
  marker = overlay.ownerDocument.createElement("div");
  marker.className = PEER_MARKER_CLASS;
  marker.dataset.unitId = String(unitId);
  marker.setAttribute("role", "tooltip");
  overlay.appendChild(marker);
  markers.set(unitId, marker);
  updateMarker(unitId);
  return marker;
}

function markSelf(api: LuminusApi): void {
  const me = api.myself?.index;
  if (me != null) markPeer(me, "luminus");
}

function scheduleProbe(api: LuminusApi): void {
  if (!getPeerIconsEnabled() || !getPeerAnnounceEnabled()) return;
  markSelf(api);
  if (probeTimer != null) clearTimeout(probeTimer);
  probeTimer = setTimeout(() => {
    probeTimer = null;
    const now = Date.now();
    if (now - lastProbeAt < PROBE_COOLDOWN_MS) return;
    lastProbeAt = now;
    markSelf(api);
    sendExpression(api, PROBE);
  }, PROBE_DELAY_MS);
}

function extensionFor(expression: number): DetectedExtension | null {
  if (expression === -101 || expression === 101) return "presence-101";
  if (expression === -102 || expression === 102) return "presence-102";
  if (expression === PROBE || expression === ACK) return "luminus";
  if (Math.abs(expression) > 10_000_000) return "presence-102";
  return null;
}

function onExpression(api: LuminusApi, data: UnitExpression): void {
  const { unitId, expression } = data;
  const extension = extensionFor(expression);
  if (!extension) return;
  markPeer(unitId, extension);

  if (
    expression === PROBE
    && !isSelf(api, unitId)
    && !acked.has(unitId)
    && getPeerAnnounceEnabled()
  ) {
    acked.add(unitId);
    sendExpression(api, ACK);
  }
}

type UnitVis = {
  _posture?: string;
  _isLaying?: boolean;
  _postureOffset?: number;
  _verticalOffset?: number;
  _scale?: number;
  getBoundingRectangle?: () => { x: number; y: number; width: number; height: number } | null;
};

function headAnchor(
  engine: NonNullable<ReturnType<typeof ensureRoomEngine>>,
  roomId: number,
  unitId: number,
): { x: number; y: number } | null {
  const canvasId = engine._activeRoomActiveCanvas ?? 1;
  const location = engine.getRoomObjectScreenLocation(roomId, unitId, UNIT_CATEGORY);
  if (!location) return null;

  let bounds: { x: number; y: number; width: number; height: number } | null = null;
  try {
    bounds = engine.getRoomObjectBoundingRectangle?.(
      roomId,
      unitId,
      UNIT_CATEGORY,
      canvasId,
    ) ?? null;
  } catch {
    bounds = null;
  }

  let visualization: UnitVis | null = null;
  try {
    const object = engine.getRoomObject?.(roomId, unitId, UNIT_CATEGORY) as {
      _visualization?: UnitVis;
    } | null;
    visualization = object?._visualization ?? null;
  } catch {
    visualization = null;
  }

  if ((!bounds || !(bounds.height > 0)) && visualization?.getBoundingRectangle) {
    try {
      const local = visualization.getBoundingRectangle();
      if (local && local.height > 0) {
        bounds = {
          x: location.x + local.x,
          y: location.y + local.y,
          width: local.width,
          height: local.height,
        };
      }
    } catch { /* ignore */ }
  }

  if (bounds && Number.isFinite(bounds.y) && bounds.height > 0 && bounds.width > 0) {
    const headInset = Math.max(8, Math.min(21, bounds.height * 0.16));
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + headInset,
    };
  }

  return { x: location.x, y: location.y - 72 };
}

function paintMarkers(api: LuminusApi, page: Window): void {
  if (!getPeerIconsEnabled()) {
    for (const marker of markers.values()) marker.style.display = "none";
    return;
  }
  const roomId = api.room.id;
  const engine = ensureRoomEngine(page);
  const canvas = page.document.querySelector<HTMLCanvasElement>(".nitro-room canvas")
    ?? page.document.querySelector<HTMLCanvasElement>("canvas");

  if (roomId == null || !engine || !canvas) {
    for (const marker of markers.values()) marker.style.display = "none";
    return;
  }

  const cssRect = canvas.getBoundingClientRect();
  const scaleX = cssRect.width / Math.max(1, canvas.width);
  const scaleY = cssRect.height / Math.max(1, canvas.height);

  for (const unitId of [...peers]) {
    if (!api.room.units.has(unitId) && api.myself?.index !== unitId) unmarkPeer(unitId);
  }

  for (const unitId of peers) {
    const marker = ensureMarker(unitId);
    if (!marker) continue;
    const point = headAnchor(engine, roomId, unitId);
    if (!point) {
      marker.style.display = "none";
      continue;
    }
    marker.style.display = "flex";
    marker.style.left = `${point.x * scaleX}px`;
    marker.style.top = `${point.y * scaleY}px`;
  }

  for (const [unitId, marker] of markers) {
    if (peers.has(unitId)) continue;
    marker.remove();
    markers.delete(unitId);
  }
}

function startPaintLoop(api: LuminusApi, page: Window): void {
  if (raf) return;
  const tick = () => {
    raf = page.requestAnimationFrame(tick);
    if (typeof document !== "undefined" && document.hidden) return;
    if (!getPeerIconsEnabled() || peers.size === 0) {
      for (const marker of markers.values()) marker.style.display = "none";
      return;
    }
    paintMarkers(api, page);
  };
  raf = page.requestAnimationFrame(tick);
}

export function initPeerIdentify(api: LuminusApi, targetWindow?: Window): void {
  const page = (targetWindow ?? getTargetWindow()) as PageWin;
  if (page.__luminusPeerIdentify) return;
  page.__luminusPeerIdentify = true;

  for (const unsubscribe of unsubs) unsubscribe();
  unsubs = [];

  unsubs.push(api.onIncoming(2031, () => {
    clearRoomPeers();
    markSelf(api);
    if (getPeerIconsEnabled()) scheduleProbe(api);
  }));

  unsubs.push(api.onIncoming(1631, ({ packet }) => {
    const data = packet.parsed as UnitExpression | undefined;
    if (data) onExpression(api, data);
  }));

  unsubs.push(api.onIncoming(2661, ({ packet }) => {
    const id = typeof packet.parsed === "number" ? packet.parsed : Number.NaN;
    if (Number.isFinite(id)) unmarkPeer(id);
  }));

  unsubs.push(api.onIncoming(374, () => {
    markSelf(api);
  }));

  unsubs.push(subscribePeerIdentifySettings(() => {
    if (!getPeerIconsEnabled()) {
      hidePeerMarkers();
      return;
    }
    markSelf(api);
    if (getPeerAnnounceEnabled() && api.room.id != null) scheduleProbe(api);
  }));

  try {
    page.document?.querySelectorAll(".luminus-world-marker").forEach(element => element.remove());
  } catch { /* ignore */ }

  markSelf(api);
  startPaintLoop(api, page);
  ensureOverlay();
}
