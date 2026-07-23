export const PANEL_STYLES = `
#luminus-world-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
}

/* Public Luminus does not show a head logo here.
   JS sets left/top to the crown of the head (posture-aware). Icon sits just above that point. */
#luminus-world-overlay .luminus-peer-marker {
  position: absolute;
  display: none;
  width: 40px;
  height: 40px;
  /* bottom of icon on crown; 2px air above hair */
  transform: translate(-50%, calc(-100% - 2px));
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 10px rgba(142, 162, 255, 0.75));
  z-index: 5;
  will-change: left, top;
}

#luminus-world-overlay .luminus-peer-marker-icon {
  display: block;
  width: 100%;
  height: 100%;
}

#luminus-world-overlay .luminus-peer-marker-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(145deg, #8ea2ff, #5b6fd6);
  color: #fff;
  font: 700 16px/1 system-ui, sans-serif;
}

#luminus-arena-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: none;
  overflow: visible;
  pointer-events: none;
}

#luminus-panel {
  /* smoked glass over the live game Ã¢â‚¬â€ mid-tone: darker than a mirror, lighter than the old log window */
  --lm-glass: rgba(15, 17, 26, 0.82);
  --lm-plate: rgba(255, 255, 255, 0.045);
  --lm-plate-hover: rgba(255, 255, 255, 0.085);
  --lm-plate-active: rgba(142, 162, 255, 0.12);
  --lm-hairline: rgba(255, 255, 255, 0.11);
  --lm-hairline-soft: rgba(255, 255, 255, 0.055);
  --lm-text: rgba(238, 241, 255, 0.94);
  --lm-text-dim: rgba(210, 216, 242, 0.78);
  --lm-muted: rgba(168, 175, 208, 0.58);
  --lm-lumen: #8ea2ff;
  --lm-lumen-bright: #c4cdff;
  --lm-glow: rgba(142, 162, 255, 0.40);
  --lm-ink: #0b0e1c;

  --lm-mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
  --lm-sans: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  --lm-radius: 18px;

  position: fixed;
  z-index: 2147483647;
  width: min(344px, calc(100vw - 24px));
  max-height: min(620px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;

  /* layered glass: soft top-accent bloom + cool base over the smoked plate */
  background:
    radial-gradient(135% 90% at 50% -12%, rgba(142, 162, 255, 0.11), transparent 58%),
    radial-gradient(100% 60% at 100% 0%, rgba(196, 205, 255, 0.05), transparent 60%),
    var(--lm-glass);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-radius: var(--lm-radius);
  box-shadow:
    0 32px 72px -18px rgba(0, 0, 0, 0.74),
    0 10px 28px -6px rgba(0, 0, 0, 0.46),
    0 0 0 0.5px rgba(0, 0, 0, 0.6),
    inset 0 0 40px -18px rgba(142, 162, 255, 0.35);

  color: var(--lm-text);
  font-family: var(--lm-sans);
  font-size: 13px;
  overflow: hidden;
  isolation: isolate;

  transform-origin: top right;
  transition:
    opacity 0.24s ease,
    transform 0.28s cubic-bezier(0.2, 0.9, 0.28, 1),
    visibility 0.24s;
}

/* closed: hidden but still mounted (keeps automations running) */
#luminus-panel:not(.is-open) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-8px) scale(0.965);
}

#luminus-panel * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

#luminus-panel :focus-visible {
  outline: 2px solid var(--lm-lumen);
  outline-offset: 2px;
  border-radius: 6px;
}

/* header / drag handle */
#luminus-panel .lm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 13px 12px 16px;
  cursor: grab;
  user-select: none;
  border-bottom: 1px solid var(--lm-hairline-soft);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01) 60%, transparent);
  flex-shrink: 0;
}

#luminus-panel .lm-header:active { cursor: grabbing; }

#luminus-panel .lm-view-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

#luminus-panel .lm-back {
  all: unset;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: -5px;
  border-radius: 7px;
  color: var(--lm-muted);
  cursor: pointer;
  transition: color 0.15s, background 0.15s, transform 0.1s;
}

#luminus-panel .lm-back:hover {
  color: var(--lm-text);
  background: var(--lm-plate-hover);
}

#luminus-panel .lm-back:active { transform: translateX(-2px); }

#luminus-panel .lm-view-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--lm-lumen-bright);
  background: var(--lm-plate-active);
  border: 1px solid rgba(142, 162, 255, 0.2);
}

#luminus-panel .lm-view-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--lm-text);
}

#luminus-panel .lm-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--lm-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--lm-text);
  text-shadow: 0 0 12px rgba(142, 162, 255, 0.25);
}



#luminus-panel .lm-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Discord shortcut */
#luminus-panel .lm-discord {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 8px;
  color: var(--lm-muted);
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: color 0.16s, background 0.16s, border-color 0.16s, box-shadow 0.16s, transform 0.16s;
}

#luminus-panel .lm-discord:hover {
  color: #fff;
  background: rgba(88, 101, 242, 0.9);
  border-color: rgba(88, 101, 242, 0.5);
  box-shadow: 0 4px 14px -2px rgba(88, 101, 242, 0.6);
  transform: translateY(-1px);
}

#luminus-panel .lm-discord:active { transform: translateY(0); }
#luminus-panel .lm-discord svg { display: block; }

#luminus-panel .lm-mark {
  width: 22px;
  height: 22px;
  margin: -4px -2px -4px -5px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(142, 162, 255, 0.42));
}

#luminus-panel .lm-close {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  color: var(--lm-muted);
  cursor: pointer;
  border-radius: 8px;
  line-height: 1;
  border: 1px solid transparent;
  transition: color 0.16s, background 0.16s, border-color 0.16s;
}

#luminus-panel .lm-close:hover {
  color: #ff8ba0;
  background: rgba(196, 69, 105, 0.16);
  border-color: rgba(196, 69, 105, 0.32);
}

#luminus-panel .lm-close svg { display: block; }

#luminus-panel .lm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  padding: 6px 12px 7px;
  border-top: 1px solid var(--lm-hairline-soft);
  color: rgba(168, 175, 208, 0.62);
  font-family: var(--lm-mono);
  font-size: 9px;
  letter-spacing: 0.02em;
}

#luminus-panel .lm-footer-version {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--lm-muted);
  letter-spacing: 0.01em;
}

#luminus-panel .lm-footer-credit {
  flex-shrink: 0;
  color: rgba(168, 175, 208, 0.62);
}

#luminus-panel.is-launcher,
#luminus-panel.is-games,
#luminus-panel.is-grid-shell {
  width: min(320px, calc(100vw - 24px));
}

#luminus-panel .lm-launcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 14px;
  animation: lm-view-in 0.18s ease-out;
}

/* license UI (unused in public builds) */
#luminus-panel .lm-license-card {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 11px;
  border-radius: 8px;
  border: 1px solid var(--lm-hairline-soft);
  background: rgba(255, 255, 255, 0.035);
}

#luminus-panel .lm-license-card.is-ok {
  border-color: rgba(98, 223, 198, 0.22);
  background:
    linear-gradient(135deg, rgba(98, 223, 198, 0.08), transparent 55%),
    rgba(255, 255, 255, 0.03);
}

#luminus-panel .lm-license-card.is-pending {
  border-color: rgba(142, 162, 255, 0.22);
  background:
    linear-gradient(135deg, rgba(142, 162, 255, 0.08), transparent 55%),
    rgba(255, 255, 255, 0.03);
}

#luminus-panel .lm-license-card.is-bad {
  border-color: rgba(255, 122, 145, 0.28);
  background:
    linear-gradient(135deg, rgba(255, 90, 120, 0.10), transparent 55%),
    rgba(255, 255, 255, 0.03);
}

#luminus-panel .lm-license-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

#luminus-panel .lm-license-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lm-muted);
  flex-shrink: 0;
}

#luminus-panel .lm-license-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  min-width: 0;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#luminus-panel .lm-license-pill::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

#luminus-panel .lm-license-card.is-ok .lm-license-pill {
  color: #9cf0dd;
  background: rgba(98, 223, 198, 0.12);
  border-color: rgba(98, 223, 198, 0.22);
}

#luminus-panel .lm-license-card.is-pending .lm-license-pill {
  color: #c4cdff;
  background: rgba(142, 162, 255, 0.12);
  border-color: rgba(142, 162, 255, 0.24);
}

#luminus-panel .lm-license-card.is-pending .lm-license-pill::before {
  animation: lm-license-pulse 1.1s ease-in-out infinite;
}

#luminus-panel .lm-license-card.is-bad .lm-license-pill {
  color: #ffb0bd;
  background: rgba(255, 90, 120, 0.12);
  border-color: rgba(255, 122, 145, 0.28);
}

@keyframes lm-license-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
}

#luminus-panel .lm-license-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

#luminus-panel .lm-license-user {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

#luminus-panel .lm-license-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 650;
  color: var(--lm-text);
}

#luminus-panel .lm-license-id {
  flex-shrink: 0;
  font-family: var(--lm-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--lm-muted);
  letter-spacing: 0.02em;
}

#luminus-panel .lm-license-msg {
  font-size: 11px;
  line-height: 1.4;
  color: var(--lm-text-dim);
}

#luminus-panel .lm-license-card.is-bad .lm-license-msg {
  color: #ffb4c0;
}

#luminus-panel .lm-license-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

#luminus-panel .lm-license-retry {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 650;
  color: var(--lm-text-dim);
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid var(--lm-hairline-soft);
  cursor: pointer;
  transition: color 0.14s, background 0.14s, border-color 0.14s;
}

#luminus-panel .lm-license-retry:hover {
  color: #fff;
  background: var(--lm-plate-hover);
  border-color: rgba(142, 162, 255, 0.35);
}

#luminus-panel .lm-license-retry:active {
  transform: translateY(1px);
}

#luminus-panel .lm-license-retry:disabled {
  opacity: 0.55;
  cursor: default;
}

#luminus-panel .lm-license-retry svg {
  width: 13px;
  height: 13px;
  stroke-width: 2;
}

#luminus-panel .lm-launcher-item {
  all: unset;
  display: flex;
  min-width: 0;
  min-height: 94px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 8px;
  color: var(--lm-text-dim);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--lm-hairline-soft);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  transition: transform 0.14s, color 0.14s, background 0.14s, border-color 0.14s, box-shadow 0.14s;
}

#luminus-panel .lm-launcher-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.055);
}

#luminus-panel .lm-launcher-icon svg {
  width: 23px;
  height: 23px;
  stroke-width: 1.7;
}

#luminus-panel .lm-launcher-item:hover {
  transform: translateY(-2px);
  color: #fff;
  background: var(--lm-plate-hover);
}

#luminus-panel .lm-launcher-item:active { transform: translateY(0) scale(0.97); }

#luminus-panel .lm-launcher-item.is-player:hover {
  border-color: rgba(142, 162, 255, 0.42);
  box-shadow: 0 8px 20px -12px rgba(142, 162, 255, 0.9);
}

#luminus-panel .lm-launcher-item.is-player .lm-launcher-icon { color: #aebaff; }
#luminus-panel .lm-launcher-item.is-logs .lm-launcher-icon { color: #62dfc6; }
#luminus-panel .lm-launcher-item.is-visual .lm-launcher-icon { color: #ff9fc8; }
#luminus-panel .lm-launcher-item.is-games .lm-launcher-icon { color: #ffd166; }
#luminus-panel .lm-launcher-item.is-accent .lm-launcher-icon { color: #ffd166; }
#luminus-panel .lm-launcher-item.is-ball-sort .lm-launcher-icon { color: #82d8ff; }

#luminus-panel .lm-launcher-item.is-dev .lm-launcher-icon { color: #f4c76d; }

#luminus-panel .lm-launcher-item.is-logs:hover { border-color: rgba(98, 223, 198, 0.38); }
#luminus-panel .lm-launcher-item.is-visual:hover { border-color: rgba(255, 159, 200, 0.38); }
#luminus-panel .lm-launcher-item.is-games:hover { border-color: rgba(255, 209, 102, 0.42); }
#luminus-panel .lm-launcher-item.is-accent:hover { border-color: rgba(255, 209, 102, 0.42); }
#luminus-panel .lm-launcher-item.is-ball-sort:hover { border-color: rgba(130, 216, 255, 0.42); }
#luminus-panel .lm-launcher-item.is-dev:hover { border-color: rgba(244, 199, 109, 0.38); }

#luminus-panel .lm-status-status {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 9px;
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.035);
  font-size: 10px;
  color: var(--lm-text-dim);
}

#luminus-panel .lm-status-status span { display: flex; justify-content: space-between; gap: 6px; }
#luminus-panel .lm-status-status b { color: var(--lm-muted); font-weight: 600; }
#luminus-panel .lm-status-error { grid-column: 1 / -1; color: #ff9aab; }

/* Ball Sort Ã¢â‚¬â€ soft status card (not a key/value grid dump) */
#luminus-panel .lm-status-extra-status {
  grid-template-columns: 1fr;
  gap: 5px;
  padding: 11px 12px;
}
#luminus-panel .lm-status-extra-status span {
  display: block;
  justify-content: unset;
}
#luminus-panel .lm-status-extra-headline {
  color: var(--lm-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}
#luminus-panel .lm-status-extra-progress {
  color: #9ad4ff;
  font-size: 11px;
  font-weight: 500;
}
#luminus-panel .lm-status-extra-detail {
  color: var(--lm-muted);
  font-size: 10.5px;
  line-height: 1.4;
}
#luminus-panel .lm-status-extra-meta {
  display: flex !important;
  justify-content: space-between !important;
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px solid var(--lm-hairline-soft);
  font-size: 10px;
  color: var(--lm-text-dim);
}

@keyframes lm-view-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* category content */
#luminus-panel .lm-tab-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(196, 205, 255, 0.42) transparent;
  flex: 1;
  min-height: 0;
  animation: lm-view-in 0.18s ease-out;
}

#luminus-panel .lm-tab-content::-webkit-scrollbar { width: 6px; }
#luminus-panel .lm-tab-content::-webkit-scrollbar-track { background: transparent; }
#luminus-panel .lm-tab-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(196, 205, 255, 0.48), rgba(142, 162, 255, 0.28));
  border-radius: 999px;
}

/* section */
#luminus-panel .lm-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

#luminus-panel .lm-section-title {
  font-family: var(--lm-sans);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.045em;
  text-transform: uppercase;
  color: var(--lm-text-dim);
  padding: 0 3px 2px;
}

/* row: label + control (glass plate) */
#luminus-panel .lm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 7px 9px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-radius: 7px;
  transition: background 0.16s, border-color 0.16s;
}

/* nested sub-option under a toggle row Ã¢â‚¬â€ indented, quieter plate, no card chrome */
#luminus-panel .lm-row-sub {
  margin-left: 0;
  min-height: 36px;
  padding: 5px 10px;
  background: rgba(142, 162, 255, 0.045);
  border: 1px solid rgba(142, 162, 255, 0.1);
}

#luminus-panel .lm-row-sub .lm-label { font-size: 11px; }

#luminus-panel .lm-option-group {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-radius: 7px;
  transition: background 0.16s, border-color 0.16s;
}

#luminus-panel .lm-option-group:hover {
  border-color: var(--lm-hairline);
}

#luminus-panel .lm-option-group > .lm-row {
  background: transparent;
  border: 0;
  border-radius: 0;
}

#luminus-panel .lm-option-expander {
  all: unset;
  display: flex;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: 4px;
}

#luminus-panel .lm-option-expander:focus-visible {
  outline: 1px solid rgba(142, 162, 255, 0.65);
  outline-offset: 2px;
}

#luminus-panel .lm-option-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

#luminus-panel .lm-option-more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--lm-muted);
  font-size: 9.5px;
  font-weight: 650;
  transition: color 0.14s;
}

#luminus-panel .lm-option-expander:hover .lm-option-more { color: var(--lm-text-dim); }

#luminus-panel .lm-option-more svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  transition: transform 0.16s;
}

#luminus-panel .lm-option-group.is-open .lm-option-more svg { transform: rotate(180deg); }

#luminus-panel .lm-option-children {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 7px 7px;
  padding: 7px 0 0 9px;
  border-top: 1px solid rgba(255, 255, 255, 0.055);
  border-left: 1px solid rgba(142, 162, 255, 0.16);
}

#luminus-panel .lm-inline-option {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 5px 7px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-radius: 7px;
}

#luminus-panel .lm-inline-option .lm-input {
  min-width: 0;
  height: 30px;
}

#luminus-panel .lm-row:hover {
  background: var(--lm-plate-hover);
  border-color: var(--lm-hairline);
}

#luminus-panel .lm-label {
  font-size: 12px;
  color: var(--lm-text);
  flex: 1;
  min-width: 0;
  line-height: 1.3;
}

/* packet identifiers, headers, coords Ã¢â€ â€™ mono (the tool's native type) */
#luminus-panel .lm-sub {
  font-family: var(--lm-sans);
  font-size: 10px;
  color: var(--lm-muted);
  display: block;
  margin-top: 2px;
  line-height: 1.3;
  letter-spacing: 0;
}

/* Radix Switch */
#luminus-panel .lm-switch-root {
  all: unset;
  width: 34px;
  height: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 0.22s, border-color 0.22s, box-shadow 0.22s;
}

#luminus-panel .lm-switch-root[data-state="checked"] {
  background: linear-gradient(180deg, #9aabff, #7d8cf5);
  border-color: transparent;
  box-shadow: 0 0 12px var(--lm-glow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

#luminus-panel .lm-switch-thumb {
  display: block;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.22s cubic-bezier(0.3, 0.9, 0.3, 1);
  pointer-events: none;
}

#luminus-panel .lm-switch-root[data-state="checked"] .lm-switch-thumb {
  transform: translateX(14px);
}

/* Radix Slider */
#luminus-panel .lm-slider-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px;
  background: var(--lm-plate);
  border-radius: 11px;
  border: 1px solid var(--lm-hairline-soft);
}

#luminus-panel .lm-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#luminus-panel .lm-slider-value {
  font-family: var(--lm-mono);
  font-size: 11px;
  color: var(--lm-lumen-bright);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

#luminus-panel .lm-slider-root {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 20px;
  cursor: pointer;
}

#luminus-panel .lm-slider-track {
  background: rgba(255, 255, 255, 0.10);
  position: relative;
  flex-grow: 1;
  border-radius: 9999px;
  height: 4px;
}

#luminus-panel .lm-slider-range {
  position: absolute;
  background: linear-gradient(90deg, var(--lm-lumen), var(--lm-lumen-bright));
  border-radius: 9999px;
  height: 100%;
}

#luminus-panel .lm-slider-thumb {
  all: unset;
  display: block;
  width: 15px;
  height: 15px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

#luminus-panel .lm-slider-thumb:hover,
#luminus-panel .lm-slider-thumb:focus {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4), 0 0 0 5px var(--lm-glow);
}

/* input fields (glass) */
#luminus-panel .lm-input-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px;
  background: var(--lm-plate);
  border-radius: 11px;
  border: 1px solid var(--lm-hairline-soft);
}

#luminus-panel .lm-input-label {
  font-family: var(--lm-mono);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lm-muted);
}

#luminus-panel .lm-input-row {
  display: flex;
  gap: 7px;
  align-items: center;
}

#luminus-panel .lm-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 8px;
  color: var(--lm-text);
  font-size: 12px;
  font-family: var(--lm-mono);
  padding: 7px 9px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  min-width: 0;
}

#luminus-panel .lm-input::placeholder { color: var(--lm-muted); }
#luminus-panel .lm-input:focus {
  border-color: var(--lm-lumen);
  background: rgba(0, 0, 0, 0.30);
}

#luminus-panel .lm-input.lm-input-short {
  width: 74px;
  flex: none;
}

/* primary action button (luminous fill, dark label Ã¢â‚¬â€ Apple-style vibrancy) */
#luminus-panel .lm-btn {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #a3b2ff, #7f8ef4);
  color: var(--lm-ink);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 15px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 10px var(--lm-glow), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: filter 0.15s, transform 0.08s, box-shadow 0.15s;
  flex-shrink: 0;
}

#luminus-panel .lm-btn:hover { filter: brightness(1.08); }
#luminus-panel .lm-btn:active { transform: translateY(1px); }
#luminus-panel .lm-btn:disabled {
  background: rgba(255, 255, 255, 0.06);
  color: var(--lm-muted);
  box-shadow: none;
  cursor: default;
}

#luminus-panel .lm-btn-icon {
  padding: 7px 11px;
  font-size: 14px;
}

#luminus-panel .lm-btn-full {
  display: flex;
  width: 100%;
  margin-top: 4px;
  box-sizing: border-box;
}

/* resize handle Ã¢â‚¬â€ bottom-right corner */
#luminus-panel .lm-resize-corner {
  position: absolute;
  bottom: 0;
  width: 20px;
  height: 20px;
  z-index: 10;
}

#luminus-panel .lm-resize-corner.is-left {
  left: 0;
  cursor: sw-resize;
}

#luminus-panel .lm-resize-corner.is-right {
  right: 0;
  cursor: se-resize;
}

/* directional pad (glass tiles) */
#luminus-panel .lm-dpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin: 2px 0;
}

/* compact variant Ã¢â‚¬â€ inline next to ctrl+arrows toggle */
#luminus-panel .lm-dpad.lm-dpad-sm {
  grid-template-rows: repeat(3, 30px);
  width: 100%;
  gap: 4px;
  margin: 0;
  padding: 8px;
  box-sizing: border-box;
  background: var(--lm-plate);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 9px;
}

#luminus-panel .lm-dpad-btn {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 7px;
  color: var(--lm-muted);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s, transform 0.08s, color 0.14s;
}

#luminus-panel .lm-dpad.lm-dpad-sm .lm-dpad-btn {
  border-radius: 6px;
  color: var(--lm-text-dim);
  font-size: 14px;
}

#luminus-panel .lm-dpad-btn:hover {
  background: var(--lm-plate-active);
  border-color: var(--lm-lumen);
  color: var(--lm-lumen-bright);
}

#luminus-panel .lm-dpad-btn:active {
  transform: scale(0.88);
  background: rgba(142, 162, 255, 0.22);
}

/* avatar preview */
#luminus-panel .lm-avatar-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  min-height: 80px;
  padding: 8px;
  margin-bottom: 2px;
  box-sizing: border-box;
  background: var(--lm-plate);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 9px;
}

#luminus-panel .lm-avatar-box {
  flex-shrink: 0;
  width: 68px;
  min-height: 64px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 7px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

#luminus-panel .lm-avatar-box img {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: -webkit-optimize-contrast;
}

#luminus-panel .lm-avatar-empty {
  font-family: var(--lm-mono);
  font-size: 28px;
  color: var(--lm-muted);
  align-self: center;
}

#luminus-panel .lm-avatar-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-width: 0;
}

#luminus-panel .lm-avatar-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--lm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#luminus-panel .lm-lookup-btn {
  flex: 0 0 auto;
  padding-inline: 12px;
}

#luminus-panel .lm-compact-btn {
  flex: 0 0 auto;
  padding-inline: 10px;
}

/* Nitro's own toolbar bar, dressed in our panel's glass language Ã¢â‚¬â€ opt-out via UI tab */
body.luminus-ui-toolbar .nitro-toolbar {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 0 !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

/* Friend-bar + home-bar toolbar buttons Ã¢â‚¬â€ lighter than the toolbar's own glass since these
   sit ON TOP of the already-glassed .nitro-toolbar (full-strength blur/tint stacked on
   existing blur/tint just doubles up, it doesn't add anything new). overflow: hidden clips
   Nitro's native gray chrome to our rounded corners; that also clips Nitro's native arrow
   icon into invisibility, so we draw our own chevron below instead of relying on it. */
body.luminus-ui-toolbar .toolbar-friend-bar-button,
body.luminus-ui-toolbar .toolbar-home-bar-button {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.08), transparent 60%),
    rgba(16, 18, 28, 0.32) !important;
  -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
  backdrop-filter: blur(12px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

body.luminus-ui-toolbar .toolbar-friend-bar-button .cursor-pointer.left,
body.luminus-ui-toolbar .toolbar-friend-bar-button .cursor-pointer.right,
body.luminus-ui-toolbar .toolbar-home-bar-button .cursor-pointer.left,
body.luminus-ui-toolbar .toolbar-home-bar-button .cursor-pointer.right {
  background: transparent !important;
  position: relative !important;
}

body.luminus-ui-toolbar .toolbar-friend-bar-button .cursor-pointer.left::before,
body.luminus-ui-toolbar .toolbar-home-bar-button .cursor-pointer.left::before {
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 55% !important;
  width: 7px !important;
  height: 7px !important;
  border-top: 2px solid rgba(255, 255, 255, 0.85) !important;
  border-right: 2px solid rgba(255, 255, 255, 0.85) !important;
  transform: translate(-50%, -50%) rotate(-135deg) !important;
}

body.luminus-ui-toolbar .toolbar-friend-bar-button .cursor-pointer.right::before,
body.luminus-ui-toolbar .toolbar-home-bar-button .cursor-pointer.right::before {
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 45% !important;
  width: 7px !important;
  height: 7px !important;
  border-top: 2px solid rgba(255, 255, 255, 0.85) !important;
  border-right: 2px solid rgba(255, 255, 255, 0.85) !important;
  transform: translate(-50%, -50%) rotate(45deg) !important;
}

/* Avatar/object right-click context menu Ã¢â‚¬â€ freely floating, so full corner rounding like the
   notification bubble. Nitro sizes this menu's height once (not via inline style or any
   height/max-height/contain we could find Ã¢â‚¬â€ height: auto here doesn't change it), so the
   .menu-item padding/margin below is kept small enough to fit inside that fixed size instead
   of fighting it. overflow: hidden clips item corners to the rounded card shape. The height
   chase turned out to be a red herring Ã¢â‚¬â€ a native ::after decorative pseudo-element (not real
   menu content) was inflating scrollHeight; the actual menu-item rows were sized correctly the
   whole time. The real bug was .menu-item using native width:100% (w-100) PLUS our own
   horizontal margin, which overflows the container by the margin amount Ã¢â‚¬â€ fixed below by
   padding the container instead of margining the items. */
body.luminus-ui-menus .nitro-context-menu {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  padding: 0 6px !important;
  overflow: hidden !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only {
  align-items: center !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
    rgba(31, 34, 46, 0.78) !important;
  border-color: rgba(255, 255, 255, 0.16) !important;
  border-radius: 7px !important;
  color: rgba(255, 255, 255, 0.95) !important;
  font-weight: 600 !important;
  gap: 4px !important;
  line-height: 1.1 !important;
  padding: 2px 6px 3px !important;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.55) !important;
  box-shadow:
    0 5px 12px -8px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-name-only-link-icon,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-name-only-link-icon,
body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-name-only-link-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  margin-left: 1px !important;
  pointer-events: auto !important;
  flex-shrink: 0 !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-name-only-link-icon svg,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-name-only-link-icon svg,
body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-name-only-link-icon svg {
  width: 11px !important;
  height: 11px !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-link-pending svg,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-link-pending svg,
body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-link-pending svg {
  filter: drop-shadow(0 0 3px rgba(142, 162, 255, 0.55)) !important;
}

body.luminus-ui-menus .nitro-context-menu .luminus-link-blocked svg {
  filter: drop-shadow(0 0 3px rgba(255, 138, 138, 0.55)) !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only.is-friend {
  background:
    linear-gradient(180deg, rgba(95, 231, 149, 0.32), rgba(32, 143, 85, 0.24)),
    rgba(18, 52, 37, 0.84) !important;
  border-color: rgba(117, 255, 172, 0.46) !important;
  color: #ecfff2 !important;
  box-shadow:
    0 5px 14px -9px rgba(28, 216, 112, 0.75),
    0 0 0 1px rgba(45, 220, 124, 0.16),
    inset 0 1px 0 rgba(230, 255, 238, 0.22) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog.nitro-context-menu {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(24, 20, 24, 0.88) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  border-radius: 8px !important;
  min-width: 182px !important;
  max-width: 220px !important;
  padding: 7px !important;
  box-shadow:
    0 9px 22px -12px rgba(0, 0, 0, 0.82),
    inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .flex-column.gap-2 {
  gap: 7px !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .align-items-center.justify-content-between {
  align-items: flex-start !important;
  gap: 6px !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .fs-6 {
  color: rgba(255, 255, 255, 0.94) !important;
  flex: 1 1 auto !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .fa-icon {
  color: rgba(255, 255, 255, 0.70) !important;
  flex: 0 0 auto !important;
  margin-top: 1px !important;
  transition: color 0.12s, transform 0.12s !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .fa-icon:hover {
  color: #ffffff !important;
  transform: scale(1.08) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn {
  border: 1px solid transparent !important;
  border-radius: 5px !important;
  color: #ffffff !important;
  flex: 1 1 0 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  min-height: 26px !important;
  min-width: 0 !important;
  padding: 6px 9px !important;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45) !important;
  transition: background 0.12s, border-color 0.12s, transform 0.12s !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn:hover {
  transform: translateY(-1px) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-danger {
  background: rgba(255, 104, 104, 0.16) !important;
  border-color: rgba(255, 126, 126, 0.30) !important;
  color: #ffd7d7 !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-danger:hover {
  background: rgba(255, 104, 104, 0.26) !important;
  border-color: rgba(255, 155, 155, 0.46) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-success {
  background: linear-gradient(180deg, rgba(82, 218, 136, 0.92), rgba(24, 135, 77, 0.92)) !important;
  border-color: rgba(145, 255, 188, 0.48) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-success:hover {
  background: linear-gradient(180deg, rgba(104, 237, 154, 0.96), rgba(31, 154, 88, 0.96)) !important;
  border-color: rgba(166, 255, 204, 0.66) !important;
}

/* Context menu children Ã¢â‚¬â€ this lives outside #luminus-panel so our --lm-* custom properties
   aren't inherited; colors are spelled out literally to match the same palette. */
body.luminus-ui-menus .nitro-context-menu .menu-header {
  background: rgba(142, 162, 255, 0.16) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  margin: 0 -6px !important;
  padding: 9px 10px !important;
}

/* Each item its own pill Ã¢â‚¬â€ lighter than the container glass (it sits on top of already-blurred
   glass, so no extra background-filter here, just a tint with enough contrast to read as a
   distinct block instead of blending into the container). */
body.luminus-ui-menus .nitro-context-menu .menu-item {
  margin: 3px 0 !important;
  padding: 8px 12px !important;
  background: rgba(255, 255, 255, 0.07) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.92) !important;
  transition: background 0.12s, border-color 0.12s !important;
}

body.luminus-ui-menus .nitro-context-menu .menu-item:hover {
  background: rgba(142, 162, 255, 0.2) !important;
  border-color: rgba(142, 162, 255, 0.4) !important;
}

body.luminus-ui-menus .nitro-context-menu .menu-footer {
  padding: 4px !important;
}

/* Room tools rail (camera/settings/chat-history/etc, left edge of the room) Ã¢â‚¬â€ flush against
   the left edge, so only the right corners round, mirroring .nitro-purse's flush-top logic */
body.luminus-ui-room-tools .nitro-room-tools {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 0 12px 12px 0 !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

/* Right-side sidebar (currency/purse bar, flush against the top edge Ã¢â‚¬â€ only the bottom
   corners round Ã¢â‚¬â€ and the floating room-ranking notification bubble) */
body.luminus-ui-purse .nitro-purse {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 0 0 12px 12px !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

/* Seasonal-currency rows (Rubis/Asinhas) Ã¢â‚¬â€ standalone boxes below the purse bar, not flush
   against anything, so unlike .nitro-purse they round on all corners */
body.luminus-ui-purse .nitro-purse-seasonal-currency {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 10px !important;
  box-shadow:
    0 8px 22px -10px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

body.luminus-ui-notifications .nitro-notification-bubble {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10) !important;
}

/* toolbar icons (main Luminus icon + Logs/Links) Ã¢â‚¬â€ one shared pattern, same box, same margin */
/* Small native-feeling controls added around Nitro's right rail. */
.nitro-purse {
  position: relative !important;
  overflow: hidden !important;
}

.nitro-purse.luminus-purse-collapsed {
  height: 24px !important;
  min-height: 24px !important;
  max-height: 24px !important;
  padding: 0 !important;
}

.nitro-purse.luminus-purse-collapsed > .w-100 {
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}

.nitro-purse.luminus-purse-collapsed ~ .nitro-purse-seasonal-currency {
  display: none !important;
}

.luminus-purse-toggle {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  padding: 0;
  opacity: 0;
  transform: translate(-50%, -100%);
  border: 0;
  background: transparent;
  color: rgba(220, 226, 255, 0.82);
  cursor: pointer;
  transition: color 0.14s, filter 0.14s, opacity 0.14s, transform 0.14s;
}

.luminus-purse-toggle svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nitro-purse:hover > .luminus-purse-toggle,
.nitro-purse.luminus-purse-collapsed > .luminus-purse-toggle,
.luminus-purse-toggle:focus-visible {
  opacity: 1;
  transform: translateX(-50%);
}

.luminus-purse-toggle:hover,
.luminus-purse-toggle:focus-visible {
  color: #ffffff;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .luminus-purse-toggle {
    transition: none;
  }
}

body.luminus-radio-hidden .nitro-notification-bubble.luminus-radio-bubble {
  display: none !important;
}

.luminus-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin: 0 2px;
  cursor: pointer;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(199, 201, 217, 0.7);
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
  user-select: none;
}

.luminus-toolbar-btn svg { width: 19px; height: 19px; display: block; }

/* main Luminus mark reads small at 19px Ã¢â‚¬â€ fill the icon square more, like a real toolbar logo */
#luminus-icon svg { width: 36px; height: 36px; }

.luminus-toolbar-btn:hover {
  background: rgba(142, 162, 255, 0.14);
  border-color: rgba(142, 162, 255, 0.4);
  color: #c4cdff;
  transform: translateY(-1px);
}

.luminus-toolbar-btn:active { transform: translateY(0) scale(0.95); }

/* narrow screens */
@media (max-width: 480px) {
  #luminus-panel {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 72px);
    right: 8px !important;
    left: auto !important;
    --lm-radius: 16px;
  }
  #luminus-panel .lm-tab-content { padding: 12px; gap: 13px; }
  #luminus-panel .lm-header { padding: 12px 11px 11px 14px; }
}

/* short viewports Ã¢â‚¬â€ keep it usable when the window is not tall */
@media (max-height: 560px) {
  #luminus-panel { max-height: calc(100dvh - 60px); }
}

/* respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  #luminus-panel,
  #luminus-panel * {
    transition: none !important;
    animation: none !important;
  }
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Log toast (top-center ambient notification) Ã¢â€â‚¬Ã¢â€â‚¬ */

#luminus-toast-stack {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

#luminus-toast-stack .lm-toast {
  --lm-toast-accent: #8ea2ff;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(16, 18, 28, 0.80);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-left: 3px solid var(--lm-toast-accent);
  box-shadow:
    0 14px 34px -10px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  color: rgba(238, 241, 255, 0.94);
  font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  font-size: 12.5px;
  pointer-events: auto;
  box-sizing: border-box;
  animation: lm-toast-in 0.28s cubic-bezier(0.2, 0.9, 0.28, 1), lm-toast-out 0.28s ease forwards 4.2s;
}

#luminus-toast-stack .lm-toast-badge {
  flex-shrink: 0;
  font-family: ui-monospace, "SF Mono", "JetBrains Mono", monospace;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 5px;
  color: var(--lm-toast-accent);
  border: 1px solid var(--lm-toast-accent);
  opacity: 0.92;
  background: rgba(255, 255, 255, 0.05);
}

#luminus-toast-stack .lm-toast-actor {
  flex-shrink: 0;
  font-weight: 600;
  color: #fff;
}

#luminus-toast-stack .lm-toast-msg {
  color: rgba(168, 175, 208, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes lm-toast-in {
  from { opacity: 0; transform: translateY(-10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes lm-toast-out {
  to { opacity: 0; transform: translateY(-8px) scale(0.97); }
}

@media (prefers-reduced-motion: reduce) {
  #luminus-toast-stack .lm-toast { animation: none !important; }
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Logs tab Ã¢â€â‚¬Ã¢â€â‚¬ */

#luminus-panel .lm-section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

#luminus-panel .lm-section-title--flush {
  margin-bottom: 0;
}

#luminus-panel .lm-btn-link {
  all: unset;
  font-size: 11px;
  color: var(--lm-muted);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.14s;
}

#luminus-panel .lm-btn-link:hover { color: var(--lm-text); }

/* friend name tags */
#luminus-panel .lm-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

#luminus-panel .lm-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 10px;
  background: var(--lm-plate);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 100px;
  font-size: 11px;
  color: var(--lm-text);
}

#luminus-panel .lm-tag-remove {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--lm-muted);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  transition: color 0.12s;
}

#luminus-panel .lm-tag-remove:hover { color: #ff6b6b; }

/* history list */
#luminus-panel .lm-log-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 150px;
  overflow-y: auto;
}

#luminus-panel .lm-log-empty {
  text-align: center;
  color: var(--lm-muted);
  font-size: 11px;
  padding: 10px 0;
}

#luminus-panel .lm-log-entry {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 4px 7px;
  background: var(--lm-plate);
  border-radius: 6px;
  border-left: 2px solid transparent;
  font-size: 11px;
  line-height: 15px;
}

#luminus-panel .lm-log-click   { border-left-color: #ff9f43; }
#luminus-panel .lm-log-whisper { border-left-color: var(--lm-lumen); }
#luminus-panel .lm-log-friend  { border-left-color: #26de81; }

#luminus-panel .lm-log-time {
  flex-shrink: 0;
  color: var(--lm-muted);
  font-family: var(--lm-mono);
  font-size: 10px;
}

#luminus-panel .lm-log-badge {
  flex-shrink: 0;
  font-family: var(--lm-mono);
  font-size: 10px;
  color: var(--lm-muted);
  min-width: 34px;
}

#luminus-panel .lm-log-text {
  color: var(--lm-text);
  word-break: break-word;
  flex: 1;
}

#luminus-panel .lm-log-text b {
  font-weight: 600;
  color: var(--lm-lumen-bright);
}

#luminus-panel .lm-btn-logs {
  margin-top: 4px;
  background: rgba(142, 162, 255, 0.10);
  border-color: rgba(142, 162, 255, 0.25);
  color: #c4cdff;
}

#luminus-panel .lm-btn-logs:hover {
  background: rgba(142, 162, 255, 0.18);
  border-color: rgba(142, 162, 255, 0.5);
}

#luminus-panel .lm-log-shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

#luminus-panel .lm-log-shortcuts .lm-btn {
  width: 100%;
  min-width: 0;
  white-space: nowrap;
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Log Window Ã¢â€â‚¬Ã¢â€â‚¬ */

.lm-float-window {
  --lw-bg:      rgba(15, 17, 26, 0.82);
  --lw-plate:   rgba(255, 255, 255, 0.042);
  --lw-border:  rgba(255, 255, 255, 0.09);
  --lw-text:    rgba(238, 241, 255, 0.92);
  --lw-muted:   rgba(140, 145, 172, 0.7);
  --lw-radius:  14px;
  --lw-sans:    -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --lw-mono:    "SF Mono", "JetBrains Mono", ui-monospace, monospace;

  position: fixed;
  z-index: 999999;
  top: 60px;
  left: 380px;
  width: 580px;
  height: 620px;
  min-width: 420px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  font-family: var(--lw-sans);
  color: var(--lw-text);
  font-size: 13px;

  /* same layered glass recipe as #luminus-panel so all menus read as one material */
  background:
    radial-gradient(135% 90% at 50% -12%, rgba(142, 162, 255, 0.11), transparent 58%),
    radial-gradient(100% 60% at 100% 0%, rgba(196, 205, 255, 0.05), transparent 60%),
    var(--lw-bg);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid var(--lw-border);
  border-radius: var(--lw-radius);
  box-shadow:
    0 0 0 0.5px rgba(255,255,255,0.05) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 32px 100px rgba(0,0,0,0.65),
    0 8px 32px rgba(0,0,0,0.4);
  overflow: hidden;
}

/* header */
.lm-float-window .lw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 11px;
  border-bottom: 1px solid var(--lw-border);
  cursor: grab;
  flex-shrink: 0;
  user-select: none;
}

.lm-float-window .lw-header:active { cursor: grabbing; }

.lm-float-window .lw-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--lw-text);
}

.lm-float-window .lw-title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8ea2ff;
  box-shadow: 0 0 8px #8ea2ff88;
}

.lm-float-window .lw-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lm-float-window .lw-count {
  font-size: 11px;
  color: var(--lw-muted);
  font-family: var(--lw-mono);
}

.lm-float-window .lw-close {
  all: unset;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--lw-muted);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.lm-float-window .lw-close:hover { background: rgba(255,255,255,0.08); color: var(--lw-text); }

/* filter bar */
.lm-float-window .lw-filterbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--lw-border);
  flex-shrink: 0;
  overflow-x: auto;
}

.lm-float-window .lw-filterbar-secondary {
  padding-top: 4px;
  padding-bottom: 6px;
  gap: 4px;
  flex-wrap: wrap;
  overflow-x: visible;
}

.lm-float-window .lw-filterbar-gap { flex: 1; }

.lm-float-window .lw-filter-btn {
  all: unset;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  color: var(--lw-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}

.lm-float-window .lw-filter-btn:hover { background: var(--lw-plate); color: var(--lw-text); }
.lm-float-window .lw-filter-btn.active { background: rgba(142,162,255,0.12); color: #c4cdff; }

.lm-float-window .lw-filter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.lm-float-window .lw-clear-btn {
  all: unset;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--lw-muted);
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}

.lm-float-window .lw-clear-btn:hover { color: #ff6b6b; background: rgba(255,107,107,0.08); }

/* active sessions bar */
.lm-float-window .lw-active-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(38, 222, 129, 0.06);
  border-bottom: 1px solid rgba(38, 222, 129, 0.12);
  flex-shrink: 0;
  overflow-x: auto;
  flex-wrap: wrap;
}

.lm-float-window .lw-active-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #26de81;
  opacity: 0.7;
  flex-shrink: 0;
}

.lm-float-window .lw-active-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 4px;
  background: rgba(38, 222, 129, 0.08);
  border: 1px solid rgba(38, 222, 129, 0.2);
  border-radius: 100px;
}

.lm-float-window .lw-active-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.lm-float-window .lw-active-name {
  font-size: 11px;
  font-weight: 600;
  color: #26de81;
}

.lm-float-window .lw-active-dur {
  font-size: 10px;
  font-family: var(--lw-mono);
  color: rgba(38, 222, 129, 0.65);
}

.lm-float-window .lw-friend-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 4px;
  background: rgba(38, 222, 129, 0.08);
  border: 1px solid rgba(38, 222, 129, 0.2);
  border-radius: 12px;
}

.lm-float-window .lw-friend-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.lm-float-window .lw-friend-sub {
  font-size: 9px;
  font-family: var(--lw-mono);
  color: rgba(38, 222, 129, 0.6);
  line-height: 1.3;
}

.lm-float-window .lw-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #26de81;
  box-shadow: 0 0 6px #26de8199;
  animation: lw-pulse 2s ease-in-out infinite;
}

@keyframes lw-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* log list */
.lm-float-window .lw-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.lm-float-window .lw-empty {
  text-align: center;
  color: var(--lw-muted);
  font-size: 12px;
  padding: 32px 0;
}

.lm-float-window .lw-entry {
  display: flex;
  gap: 10px;
  padding: 8px 14px;
  border-left: 3px solid var(--lw-accent, transparent);
  transition: background 0.1s;
  cursor: default;
}

.lm-float-window .lw-entry:hover { background: var(--lw-plate); }

.lm-float-window .lw-entry-avatar {
  flex-shrink: 0;
  width: 40px;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.lm-float-window .lw-entry-avatar img {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--lw-border);
}

.lm-float-window .lw-avatar-blank {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--lw-plate);
  border: 1px solid var(--lw-border);
}

.lm-float-window .lw-entry-content {
  flex: 1;
  min-width: 0;
}

.lm-float-window .lw-entry-top {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.lm-float-window .lw-entry-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--lw-text);
}

.lm-float-window .lw-entry-badge {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--lw-mono);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid;
  letter-spacing: 0.04em;
}

.lm-float-window .lw-entry-time {
  font-size: 10px;
  font-family: var(--lw-mono);
  color: var(--lw-muted);
  margin-left: auto;
}

.lm-float-window .lw-entry-msg {
  font-size: 12px;
  color: rgba(200, 204, 230, 0.8);
  word-break: break-word;
  line-height: 1.5;
}

.lm-float-window .lw-entry-dur {
  margin-top: 3px;
  font-size: 11px;
  font-family: var(--lw-mono);
  color: var(--lw-muted);
}

/* resize handle */
.lm-float-window .lw-resize {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: se-resize;
  z-index: 10;
  opacity: 0.3;
  background:
    linear-gradient(315deg, rgba(255,255,255,0.3) 30%, transparent 30%),
    linear-gradient(315deg, transparent 55%, rgba(255,255,255,0.3) 55%, rgba(255,255,255,0.3) 65%, transparent 65%),
    linear-gradient(315deg, transparent 75%, rgba(255,255,255,0.3) 75%);
  border-radius: 0 0 var(--lw-radius) 0;
  transition: opacity 0.15s;
}

.lm-float-window:hover .lw-resize { opacity: 0.7; }

@media (prefers-reduced-motion: reduce) {
  .lm-float-window .lw-pulse { animation: none !important; }
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Link Window Ã¢â€â‚¬Ã¢â€â‚¬ */

/* search bar (reuses .lw-filterbar as the row) */
.lm-float-window .lk-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding: 5px 10px;
  border-radius: 100px;
  background: var(--lw-plate);
  border: 1px solid var(--lw-border);
}

.lm-float-window .lk-search-icon { display: flex; color: var(--lw-muted); flex-shrink: 0; }

.lm-float-window .lk-search-input {
  all: unset;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--lw-text);
}

.lm-float-window .lk-search-input::placeholder { color: var(--lw-muted); }

.lm-float-window select.lk-gender-filter { display: none; }

.lm-float-window .lk-gender-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.lm-float-window .lk-gender-toggle {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--lw-muted);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  line-height: 26px;
  padding: 0 9px;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.lm-float-window .lk-gender-toggle:hover,
.lm-float-window .lk-gender-toggle.active {
  background: rgba(142, 162, 255, 0.16);
  border-color: rgba(142, 162, 255, 0.42);
  color: #dce3ff;
}

.lm-float-window .lk-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--lw-border);
  transition: background 0.12s;
}

.lm-float-window .lk-entry:hover { background: var(--lw-plate); }

.lm-float-window .lk-entry-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lm-float-window .lk-name {
  font-weight: 600;
  color: var(--lw-text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.lm-float-window .lk-name:hover,
.luminus-chat-profile-link:hover,
.luminus-profile-link:hover {
  text-decoration: underline;
}

.luminus-chat-profile-link,
.luminus-profile-link {
  cursor: pointer;
}

.lm-float-window .lk-gender-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: -3px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.lm-float-window .lk-gender-symbol.gender-f {
  color: #ff8fc7;
  background: rgba(255, 143, 199, 0.1);
}

.lm-float-window .lk-gender-symbol.gender-m {
  color: #8ea2ff;
  background: rgba(142, 162, 255, 0.1);
}

.lm-float-window .lk-badge {
  font-size: 10px;
  font-family: var(--lw-mono);
  color: var(--lw-muted);
  background: var(--lw-plate);
  border: 1px solid var(--lw-border);
  border-radius: 100px;
  padding: 1px 7px;
}

.lm-float-window .lk-badge-dup {
  color: #ffb4a8;
  background: rgba(255, 107, 107, 0.14);
  border-color: rgba(255, 107, 107, 0.22);
}

.lm-float-window .lk-badge-multi {
  color: #c4cdff;
  background: rgba(142, 162, 255, 0.14);
  border-color: rgba(142, 162, 255, 0.22);
}

.lm-float-window .lk-link-chip.is-shared {
  outline: 1px solid rgba(255, 180, 120, 0.28);
  border-radius: 8px;
}

.lm-float-window .lk-meta-shared {
  color: #ffd0a8 !important;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lm-float-window .lk-star,
.lm-float-window .lk-remove {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 6px;
  color: var(--lw-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, transform 0.12s;
}

.lm-float-window .lk-star:hover { background: rgba(255, 201, 77, 0.14); color: #ffc94d; }
.lm-float-window .lk-star.active { color: #ffc94d; }
.lm-float-window .lk-star:active, .lm-float-window .lk-remove:active { transform: scale(0.9); }

.lm-float-window .lk-remove { margin-left: auto; }
.lm-float-window .lk-remove:hover { background: rgba(255, 107, 107, 0.14); color: #ff6b6b; }

.lm-float-window .lk-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 30px;
}

.lm-float-window .lk-link-chip {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lm-float-window .lk-link-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
  font-family: var(--lw-mono);
  text-decoration: none;
  padding: 4px 4px 4px 10px;
  border-radius: 6px;
  background: rgba(142, 162, 255, 0.10);
  border: 1px solid rgba(142, 162, 255, 0.28);
  transition: background 0.15s, border-color 0.15s;
}

.lm-float-window .lk-link-main:hover {
  background: rgba(142, 162, 255, 0.2);
  border-color: rgba(142, 162, 255, 0.5);
}

.lm-float-window .lk-link-url {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: #8ea2ff;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* trailing group inside the link pill: click count / last-click blocks + remove X */
.lm-float-window .lk-link-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* compact icon badges Ã¢â‚¬â€ click count / last-click time, each its own block */
.lm-float-window .lk-meta-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 10px;
  font-family: var(--lw-mono);
  color: var(--lw-muted);
  padding: 3px 6px;
  border-radius: 100px;
  background: var(--lw-plate);
}

.lm-float-window .lk-link-remove {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 6px;
  color: var(--lw-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.lm-float-window .lk-link-remove:hover { background: rgba(255, 107, 107, 0.14); color: #ff6b6b; }

/* Ã¢â€â‚¬Ã¢â€â‚¬ Infostand injections (live inside Nitro's own DOM, outside #luminus-panel) Ã¢â€â‚¬Ã¢â€â‚¬ */

.luminus-motto-link {
  color: #8ea2ff;
  text-decoration: underline;
  cursor: pointer;
  pointer-events: auto !important;
}

.luminus-motto-link:hover { color: #c4cdff; }

.luminus-eye,
.luminus-person-link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 4px;
  flex-shrink: 0;
  pointer-events: auto !important;
}

.luminus-eye svg { display: block; filter: drop-shadow(0 0 3px rgba(38, 222, 129, 0.5)); }
.luminus-person-link-icon svg { display: block; }
.luminus-link-block-btn,
.lk-link-block {
  border: 0;
  background: transparent;
  color: rgba(255, 138, 138, 0.9);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  padding: 1px 4px;
}
.luminus-link-block-btn:hover,
.lk-link-block:hover { color: #ffb0b0; }

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand {
  gap: 7px !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .nitro-infostand.rounded {
  background:
    radial-gradient(150% 120% at 15% -25%, rgba(142, 162, 255, 0.22), transparent 58%),
    rgba(15, 17, 27, 0.68) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.04) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.11) !important;
  border-radius: 12px !important;
  box-shadow:
    0 14px 34px -14px rgba(0, 0, 0, 0.72),
    inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
  color: rgba(255, 255, 255, 0.94) !important;
  overflow: visible !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .content-area {
  padding: 9px !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .hr {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 0 !important;
  height: 1px !important;
  margin: 2px 0 4px !important;
  opacity: 1 !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .motto-container {
  background: rgba(255, 255, 255, 0.07) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.9) !important;
  line-height: 1.15 !important;
  padding: 4px 7px !important;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.42) !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .body-image {
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(142, 162, 255, 0.12), transparent 62%),
    rgba(255, 255, 255, 0.045) !important;
  border: 1px solid rgba(255, 255, 255, 0.075) !important;
  border-radius: 10px !important;
  padding: 6px !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .badge-information {
  background: rgba(255, 255, 255, 0.07) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.9) !important;
  padding: 6px 8px !important;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.42) !important;
  z-index: 1000 !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .badge-information .fw-bold {
  color: #ffffff !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .badge-image {
  border-radius: 8px !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .fa-icon {
  color: rgba(255, 255, 255, 0.64) !important;
}

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand .fa-icon:hover {
  color: #ffffff !important;
}

body.luminus-ui-menus .nitro-context-menu,
body.luminus-ui-menus .nitro-context-menu *,
body.luminus-ui-menus .nitro-friend-request-dialog,
body.luminus-ui-menus .nitro-friend-request-dialog *,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand * {
  scrollbar-width: thin !important;
  scrollbar-color: rgba(196, 205, 255, 0.42) rgba(255, 255, 255, 0.05) !important;
}

body.luminus-ui-menus .nitro-context-menu::-webkit-scrollbar,
body.luminus-ui-menus .nitro-context-menu *::-webkit-scrollbar,
body.luminus-ui-menus .nitro-friend-request-dialog::-webkit-scrollbar,
body.luminus-ui-menus .nitro-friend-request-dialog *::-webkit-scrollbar,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand::-webkit-scrollbar,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand *::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
}

body.luminus-ui-menus .nitro-context-menu::-webkit-scrollbar-track,
body.luminus-ui-menus .nitro-context-menu *::-webkit-scrollbar-track,
body.luminus-ui-menus .nitro-friend-request-dialog::-webkit-scrollbar-track,
body.luminus-ui-menus .nitro-friend-request-dialog *::-webkit-scrollbar-track,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand::-webkit-scrollbar-track,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand *::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04) !important;
  border-radius: 999px !important;
}

body.luminus-ui-menus .nitro-context-menu::-webkit-scrollbar-thumb,
body.luminus-ui-menus .nitro-context-menu *::-webkit-scrollbar-thumb,
body.luminus-ui-menus .nitro-friend-request-dialog::-webkit-scrollbar-thumb,
body.luminus-ui-menus .nitro-friend-request-dialog *::-webkit-scrollbar-thumb,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand::-webkit-scrollbar-thumb,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand *::-webkit-scrollbar-thumb {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(142, 162, 255, 0.34)),
    rgba(142, 162, 255, 0.24) !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 999px !important;
}

body.luminus-ui-menus .nitro-context-menu::-webkit-scrollbar-thumb:hover,
body.luminus-ui-menus .nitro-context-menu *::-webkit-scrollbar-thumb:hover,
body.luminus-ui-menus .nitro-friend-request-dialog::-webkit-scrollbar-thumb:hover,
body.luminus-ui-menus .nitro-friend-request-dialog *::-webkit-scrollbar-thumb:hover,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand::-webkit-scrollbar-thumb:hover,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand *::-webkit-scrollbar-thumb:hover {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(196, 205, 255, 0.48)),
    rgba(142, 162, 255, 0.34) !important;
}

/* normal-flow sibling of .nitro-infostand.rounded Ã¢â‚¬â€ no fixed positioning needed,
   the bottom-anchored flex container pushes the card up on its own */
#luminus-action-bar {
  display: flex;
  gap: 5px;
  margin-top: 8px;
  justify-content: flex-end;
  font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  pointer-events: auto !important;
}

.luminus-action-btn {
  all: unset;
  position: relative;
  pointer-events: auto !important;
  flex: 0 0 auto;
  text-align: center;
  padding: 7px 13px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(238, 241, 255, 0.92);
  background:
    radial-gradient(120% 130% at 50% -20%, rgba(142, 162, 255, 0.22), transparent 60%),
    rgba(16, 18, 28, 0.78);
  -webkit-backdrop-filter: blur(22px) saturate(200%) brightness(1.04);
  backdrop-filter: blur(22px) saturate(200%) brightness(1.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 12px 28px -10px rgba(0, 0, 0, 0.6),
    0 0 0 0.5px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  isolation: isolate;
  transition: background 0.16s, border-color 0.16s, box-shadow 0.16s, transform 0.08s, color 0.16s;
}

/* specular rim, same technique as the main panel */
.luminus-action-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(196, 205, 255, 0.2) 30%,
    transparent 60%
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.luminus-action-btn:hover {
  background:
    radial-gradient(120% 130% at 50% -20%, rgba(142, 162, 255, 0.34), transparent 60%),
    rgba(20, 22, 34, 0.85);
  border-color: rgba(142, 162, 255, 0.45);
  box-shadow:
    0 14px 32px -10px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 0 16px rgba(142, 162, 255, 0.28);
  color: #fff;
}

.luminus-action-btn:active { transform: scale(0.94); }

#luminus-link-ctxmenu {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  max-width: 300px;
  padding: 6px;
  gap: 2px;
  background: rgba(13, 15, 24, 0.94);
  -webkit-backdrop-filter: blur(30px) saturate(185%);
  backdrop-filter: blur(30px) saturate(185%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
}

#luminus-link-ctxmenu .luminus-ctxmenu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 4px 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 2px;
}

#luminus-link-ctxmenu .luminus-ctxmenu-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(140, 145, 172, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#luminus-link-ctxmenu .luminus-ctxmenu-close {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 1;
  color: rgba(140, 145, 172, 0.7);
  cursor: pointer;
  border-radius: 5px;
  transition: color 0.14s, background 0.14s;
}

#luminus-link-ctxmenu .luminus-ctxmenu-close:hover {
  color: #ff8ba0;
  background: rgba(196, 69, 105, 0.16);
}

#luminus-link-ctxmenu a {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 8px;
  border-radius: 6px;
  text-decoration: none;
}

#luminus-link-ctxmenu .luminus-ctxmenu-link-url {
  font-size: 12px;
  color: #c4cdff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#luminus-link-ctxmenu .luminus-ctxmenu-link-meta {
  font-size: 10px;
  color: rgba(196, 205, 255, 0.55);
}

#luminus-link-ctxmenu a:hover { background: rgba(142, 162, 255, 0.14); }

body.luminus-wardrobe-stacked .nitro-avatar-editor:not(:has(.menu > :nth-child(5).active)) .content-area > .grid > .g-col-9 > .grid {
  grid-template-columns: 68px minmax(0, 1fr);
  grid-template-rows: minmax(0, 5fr) minmax(0, 3fr);
}

body.luminus-wardrobe-stacked .nitro-avatar-editor:not(:has(.menu > :nth-child(5).active)) .content-area > .grid > .g-col-9 > .grid > :first-child {
  grid-column: 1;
  grid-row: 1 / 3;
}

body.luminus-wardrobe-stacked .nitro-avatar-editor:not(:has(.menu > :nth-child(5).active)) .content-area > .grid > .g-col-9 > .grid > :nth-child(2) {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
}

body.luminus-wardrobe-stacked .nitro-avatar-editor:not(:has(.menu > :nth-child(5).active)) .content-area > .grid > .g-col-9 > .grid > :nth-child(2) > .grid {
  gap: 4px !important;
}

body.luminus-wardrobe-stacked .nitro-avatar-editor:not(:has(.menu > :nth-child(5).active)) .content-area > .grid > .g-col-9 > .grid > :nth-child(3) {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  min-height: 0;
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Changelog Ã¢â€â‚¬Ã¢â€â‚¬ */

#luminus-changelog {
  --cl-bg: rgba(15, 17, 26, 0.95);
  --cl-plate: rgba(255, 255, 255, 0.045);
  --cl-border: rgba(255, 255, 255, 0.11);
  --cl-text: rgba(238, 241, 255, 0.95);
  --cl-dim: rgba(205, 211, 238, 0.76);
  --cl-muted: rgba(160, 167, 201, 0.62);
  --cl-lumen: #8ea2ff;
  --cl-lumen-bright: #c4cdff;
  width: min(560px, calc(100vw - 24px));
  max-height: min(680px, calc(100dvh - 32px));
  padding: 0;
  color: var(--cl-text);
  font: 13px/1.5 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
  background:
    radial-gradient(100% 70% at 12% -5%, rgba(142, 162, 255, 0.20), transparent 58%),
    radial-gradient(80% 65% at 100% 0%, rgba(196, 205, 255, 0.08), transparent 62%),
    var(--cl-bg);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid var(--cl-border);
  border-radius: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.13),
    inset 0 0 48px -26px rgba(142, 162, 255, 0.42),
    0 36px 120px rgba(0, 0, 0, 0.72);
  overflow: hidden;
}

#luminus-changelog[open] {
  display: flex;
  flex-direction: column;
  animation: lm-changelog-enter 0.28s cubic-bezier(0.2, 0.9, 0.28, 1);
}

#luminus-changelog::backdrop {
  background: rgba(4, 6, 14, 0.68);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  backdrop-filter: blur(8px) saturate(120%);
  animation: lm-changelog-backdrop 0.22s ease-out;
}

#luminus-changelog,
#luminus-changelog * {
  box-sizing: border-box;
}

#luminus-changelog .lm-changelog-header {
  position: relative;
  flex: 0 0 auto;
  padding: 27px 30px 23px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

#luminus-changelog .lm-changelog-eyebrow {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 12px;
  color: var(--cl-lumen-bright);
  font: 600 10px/1 ui-monospace, "SF Mono", "Cascadia Code", monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

#luminus-changelog .lm-changelog-eyebrow svg {
  width: 14px;
  height: 14px;
  filter: drop-shadow(0 0 7px rgba(142, 162, 255, 0.72));
}

#luminus-changelog .lm-changelog-close {
  all: unset;
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: var(--cl-muted);
  background: var(--cl-plate);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 9px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, transform 0.1s;
}

#luminus-changelog .lm-changelog-close:hover {
  color: var(--cl-text);
  background: rgba(255, 255, 255, 0.09);
}

#luminus-changelog .lm-changelog-close:active { transform: scale(0.94); }
#luminus-changelog .lm-changelog-close svg { width: 16px; height: 16px; }

#luminus-changelog h2 {
  max-width: 440px;
  margin: 0;
  color: #f4f5ff;
  font-size: clamp(23px, 4vw, 29px);
  font-weight: 740;
  line-height: 1.08;
  letter-spacing: -0.045em;
}

#luminus-changelog #luminus-changelog-summary {
  max-width: 460px;
  margin: 11px 0 0;
  color: var(--cl-dim);
  font-size: 13px;
  line-height: 1.55;
}

#luminus-changelog .lm-changelog-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 17px;
  color: var(--cl-muted);
  font: 500 10px/1 ui-monospace, "SF Mono", "Cascadia Code", monospace;
}

#luminus-changelog .lm-changelog-meta span {
  padding: 5px 7px;
  background: var(--cl-plate);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

#luminus-changelog .lm-changelog-body {
  min-height: 0;
  padding: 23px 30px 25px;
  overflow-y: auto;
}

#luminus-changelog .lm-changelog-body section + section { margin-top: 25px; }

#luminus-changelog .lm-changelog-body h3 {
  margin: 0 0 14px;
  color: var(--cl-muted);
  font: 600 10px/1 ui-monospace, "SF Mono", "Cascadia Code", monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

#luminus-changelog .lm-changelog-list {
  position: relative;
  display: grid;
  gap: 15px;
}

#luminus-changelog .lm-changelog-list::before {
  content: "";
  position: absolute;
  top: 13px;
  bottom: 13px;
  left: 12px;
  width: 1px;
  background: linear-gradient(180deg, rgba(196, 205, 255, 0.55), rgba(142, 162, 255, 0.08));
  box-shadow: 0 0 10px rgba(142, 162, 255, 0.28);
}

#luminus-changelog .lm-changelog-item {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 12px;
}

#luminus-changelog .lm-changelog-marker {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  color: #eef0ff;
  background: linear-gradient(145deg, rgba(196, 205, 255, 0.30), rgba(142, 162, 255, 0.13)), #171a2a;
  border: 1px solid rgba(196, 205, 255, 0.36);
  border-radius: 8px;
  box-shadow: 0 0 16px rgba(142, 162, 255, 0.20);
}

#luminus-changelog .lm-changelog-marker svg { width: 13px; height: 13px; stroke-width: 2.5; }

#luminus-changelog .lm-changelog-item h4 {
  margin: 1px 0 4px;
  color: var(--cl-text);
  font-size: 13px;
  font-weight: 650;
}

#luminus-changelog .lm-changelog-item p {
  margin: 0;
  color: var(--cl-dim);
  font-size: 12px;
  line-height: 1.55;
}

#luminus-changelog .lm-changelog-footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 18px 14px 30px;
  color: var(--cl-muted);
  background: rgba(255, 255, 255, 0.025);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 11px;
}

#luminus-changelog .lm-changelog-footer button {
  all: unset;
  flex: 0 0 auto;
  min-width: 86px;
  padding: 9px 15px;
  color: #111426;
  background: linear-gradient(135deg, #dce1ff, #8ea2ff);
  border-radius: 9px;
  box-shadow: 0 8px 22px rgba(90, 110, 210, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.65);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  transition: filter 0.15s, transform 0.1s;
}

#luminus-changelog .lm-changelog-footer button:hover { filter: brightness(1.08); }
#luminus-changelog .lm-changelog-footer button:active { transform: scale(0.97); }

#luminus-changelog :focus-visible {
  outline: 2px solid var(--cl-lumen-bright);
  outline-offset: 3px;
}

#luminus-changelog .lm-changelog-body {
  scrollbar-width: thin;
  scrollbar-color: rgba(142, 162, 255, 0.38) transparent;
}

@keyframes lm-changelog-enter {
  from { opacity: 0; transform: translateY(14px) scale(0.975); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes lm-changelog-backdrop {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 520px) {
  #luminus-changelog .lm-changelog-header { padding: 24px 22px 20px; }
  #luminus-changelog .lm-changelog-body { padding: 20px 22px 22px; }
  #luminus-changelog .lm-changelog-footer {
    align-items: stretch;
    flex-direction: column;
    padding: 14px 22px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  #luminus-changelog[open],
  #luminus-changelog::backdrop { animation: none; }
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Whisper chat window Ã¢â€â‚¬Ã¢â€â‚¬ */

#luminus-whisper-window {
  top: 84px;
  left: auto;
  right: 84px;
  width: 620px;
  height: 590px;
  min-width: 440px;
  min-height: 360px;
}

#luminus-whisper-window .cw-new-row,
#luminus-whisper-window .cw-thread-head,
#luminus-whisper-window .cw-composer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

#luminus-whisper-window .cw-new-row {
  padding: 9px 13px;
  border-bottom: 1px solid var(--lw-border);
  background: rgba(9, 11, 18, 0.24);
}

#luminus-whisper-window .cw-channel-label {
  color: #aebaff;
  font-family: var(--lw-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  white-space: nowrap;
}

#luminus-whisper-window .cw-new-form {
  display: flex;
  gap: 6px;
  flex: 1;
}

#luminus-whisper-window input {
  min-width: 0;
  border: 1px solid var(--lw-border);
  border-radius: 8px;
  outline: 0;
  background: rgba(255, 255, 255, 0.045);
  color: var(--lw-text);
  font: 12px var(--lw-sans);
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
}

#luminus-whisper-window input:focus {
  border-color: rgba(142, 162, 255, 0.62);
  background: rgba(142, 162, 255, 0.07);
  box-shadow: 0 0 0 3px rgba(142, 162, 255, 0.09);
}

#luminus-whisper-window input::placeholder { color: var(--lw-muted); }

#luminus-whisper-window .cw-new-form input {
  flex: 1;
  padding: 6px 9px;
}

#luminus-whisper-window button {
  font-family: var(--lw-sans);
}

#luminus-whisper-window .cw-new-form button,
#luminus-whisper-window .cw-thread-head button,
#luminus-whisper-window .cw-composer button {
  border: 1px solid rgba(142, 162, 255, 0.28);
  border-radius: 7px;
  background: rgba(142, 162, 255, 0.11);
  color: #cbd3ff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

#luminus-whisper-window .cw-new-form button { padding: 5px 10px; }

#luminus-whisper-window .cw-tabs {
  position: relative;
  display: flex;
  gap: 3px;
  padding: 8px 12px 9px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid var(--lw-border);
}

#luminus-whisper-window .cw-tabs::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(142, 162, 255, 0.72), transparent);
  content: "";
  pointer-events: none;
}

#luminus-whisper-window .cw-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--lw-muted);
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

#luminus-whisper-window .cw-tabs button:hover {
  background: var(--lw-plate);
  color: var(--lw-text);
}

#luminus-whisper-window .cw-tabs button.active {
  border-color: rgba(142, 162, 255, 0.24);
  background: rgba(142, 162, 255, 0.12);
  color: #dce1ff;
  box-shadow: inset 0 -2px 0 #8ea2ff;
}

#luminus-whisper-window .cw-status {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(140, 145, 172, 0.5);
}

#luminus-whisper-window .cw-status.online {
  background: #8ea2ff;
  box-shadow: 0 0 6px rgba(142, 162, 255, 0.75);
}

#luminus-whisper-window .cw-thread-head {
  justify-content: space-between;
  padding: 11px 15px;
  background: rgba(255, 255, 255, 0.018);
}

#luminus-whisper-window .cw-thread-head div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

#luminus-whisper-window .cw-thread-head strong {
  color: var(--lw-text);
  font-size: 12px;
}

#luminus-whisper-window .cw-thread-head span {
  color: var(--lw-muted);
  font: 9px var(--lw-mono);
}

#luminus-whisper-window .cw-thread-head button { padding: 4px 8px; }

#luminus-whisper-window .cw-messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding: 12px 14px;
  background:
    linear-gradient(rgba(142, 162, 255, 0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(142, 162, 255, 0.018) 1px, transparent 1px);
  background-size: 28px 28px;
}

#luminus-whisper-window .cw-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  color: var(--lw-muted);
}

#luminus-whisper-window .cw-empty span { font-size: 12px; }
#luminus-whisper-window .cw-empty small { font: 10px var(--lw-mono); }

#luminus-whisper-window .cw-day,
.lm-float-window .lw-day {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 14px;
  color: var(--lw-muted);
  font: 9px var(--lw-mono);
  text-transform: capitalize;
}

#luminus-whisper-window .cw-day { margin: 7px 0; }

#luminus-whisper-window .cw-day::before,
#luminus-whisper-window .cw-day::after,
.lm-float-window .lw-day::before,
.lm-float-window .lw-day::after {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, transparent, rgba(142, 162, 255, 0.24));
  content: "";
}

#luminus-whisper-window .cw-day::after,
.lm-float-window .lw-day::after { transform: scaleX(-1); }

#luminus-whisper-window .cw-message {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  max-width: 82%;
}

#luminus-whisper-window .cw-message.mine {
  align-self: flex-end;
  justify-content: flex-end;
}

#luminus-whisper-window .cw-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--lw-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--lw-muted);
  font-size: 11px;
  font-weight: 700;
}

#luminus-whisper-window .cw-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

#luminus-whisper-window .cw-bubble {
  min-width: 90px;
  padding: 7px 9px;
  border: 1px solid var(--lw-border);
  border-radius: 5px 12px 12px 12px;
  background: rgba(255, 255, 255, 0.052);
}

#luminus-whisper-window .mine .cw-bubble {
  border-color: rgba(142, 162, 255, 0.22);
  border-radius: 12px 5px 12px 12px;
  background: linear-gradient(135deg, rgba(106, 124, 220, 0.26), rgba(142, 162, 255, 0.11));
}

#luminus-whisper-window .cw-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
  color: var(--lw-muted);
  font: 9px var(--lw-mono);
}

#luminus-whisper-window .cw-meta button {
  all: unset;
  color: #b7c2ff;
  font-weight: 700;
  cursor: pointer;
}

#luminus-whisper-window .cw-meta button:hover { color: #fff; }
#luminus-whisper-window .cw-meta time { margin-left: auto; }

#luminus-whisper-window .cw-bubble p {
  margin: 0;
  color: rgba(232, 235, 252, 0.9);
  font-size: 12px;
  line-height: 1.42;
  overflow-wrap: anywhere;
}

#luminus-whisper-window .cw-composer {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--lw-border);
  background: rgba(9, 11, 18, 0.28);
}

#luminus-whisper-window .cw-composer input {
  flex: 1;
  padding: 9px 11px;
}

#luminus-whisper-window .cw-composer button {
  padding: 8px 13px;
  background: linear-gradient(135deg, rgba(142, 162, 255, 0.34), rgba(91, 111, 214, 0.24));
}

#luminus-whisper-window button:hover:not(:disabled) { filter: brightness(1.16); }
#luminus-whisper-window button:disabled,
#luminus-whisper-window input:disabled { opacity: 0.42; cursor: not-allowed; }

#luminus-whisper-window .cw-error {
  padding: 0 14px 10px;
  background: rgba(9, 11, 18, 0.28);
  color: #ff9f9f;
  font-size: 10px;
}

#luminus-whisper-window :focus-visible {
  outline: 2px solid rgba(174, 186, 255, 0.85);
  outline-offset: 2px;
}

@media (max-width: 700px) {
  #luminus-whisper-window {
    inset: 52px 10px 10px;
    width: auto;
    height: auto;
    min-width: 0;
    min-height: 0;
  }
  #luminus-whisper-window .cw-channel-label { display: none; }
  #luminus-whisper-window .cw-message { max-width: 94%; }
}
`;
