export const PANEL_STYLES = `
/* Shared visual contract. Every Luminus surface — panel, floating windows, chat,
   catalog tools and Nitro augmentations — inherits this material system. */
body {
  --luminus-ui-surface: rgba(15, 17, 26, 0.82);
  --luminus-ui-surface-raised: rgba(255, 255, 255, 0.045);
  --luminus-ui-surface-hover: rgba(255, 255, 255, 0.085);
  --luminus-ui-surface-active: rgba(142, 162, 255, 0.12);
  --luminus-ui-border: rgba(255, 255, 255, 0.11);
  --luminus-ui-border-soft: rgba(255, 255, 255, 0.055);
  --luminus-ui-text: rgba(238, 241, 255, 0.94);
  --luminus-ui-text-dim: rgba(210, 216, 242, 0.78);
  --luminus-ui-muted: rgba(168, 175, 208, 0.58);
  --luminus-ui-accent: #8ea2ff;
  --luminus-ui-accent-strong: #c4cdff;
  --luminus-ui-success: #7dffb3;
  --luminus-ui-warning: #ffd166;
  --luminus-ui-danger: #ff9aab;
  --luminus-ui-info: #9ad4ff;
  --luminus-ui-success-soft: rgba(125, 255, 179, 0.28);
  --luminus-ui-warning-soft: rgba(255, 209, 102, 0.28);
  --luminus-ui-danger-soft: rgba(255, 154, 171, 0.30);
  --luminus-ui-info-soft: rgba(154, 212, 255, 0.28);
  --luminus-ui-shadow: 0 20px 48px -18px rgba(0, 0, 0, 0.72);
  --luminus-ui-radius: 14px;
  --luminus-ui-radius-sm: 8px;
  --luminus-ui-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --luminus-ui-mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;

  /* Compatibility aliases keep independent UI modules on the same contract. */
  --lm-glass: var(--luminus-ui-surface);
  --lm-plate: var(--luminus-ui-surface-raised);
  --lm-plate-hover: var(--luminus-ui-surface-hover);
  --lm-plate-active: var(--luminus-ui-surface-active);
  --lm-hairline: var(--luminus-ui-border);
  --lm-hairline-soft: var(--luminus-ui-border-soft);
  --lm-text: var(--luminus-ui-text);
  --lm-text-dim: var(--luminus-ui-text-dim);
  --lm-muted: var(--luminus-ui-muted);
  --lm-lumen: var(--luminus-ui-accent);
  --lm-lumen-bright: var(--luminus-ui-accent-strong);
  --lm-success: var(--luminus-ui-success);
  --lm-warning: var(--luminus-ui-warning);
  --lm-danger: var(--luminus-ui-danger);
  --lm-info: var(--luminus-ui-info);
  --lm-success-soft: var(--luminus-ui-success-soft);
  --lm-warning-soft: var(--luminus-ui-warning-soft);
  --lm-danger-soft: var(--luminus-ui-danger-soft);
  --lm-info-soft: var(--luminus-ui-info-soft);
  --lm-sans: var(--luminus-ui-sans);
  --lm-mono: var(--luminus-ui-mono);
  --lw-bg: var(--luminus-ui-surface);
  --lw-plate: var(--luminus-ui-surface-raised);
  --lw-border: var(--luminus-ui-border);
  --lw-text: var(--luminus-ui-text);
  --lw-muted: var(--luminus-ui-muted);
  --lw-radius: var(--luminus-ui-radius);
  --lw-sans: var(--luminus-ui-sans);
  --lw-mono: var(--luminus-ui-mono);
}

#luminus-world-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: visible;
}

#luminus-world-overlay .luminus-peer-marker {
  position: absolute;
  display: none;
  width: 40px !important;
  height: 40px !important;
  overflow: visible !important;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transform: translate(-50%, calc(-100% + 21px)) !important;
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 10px rgba(142, 162, 255, 0.75));
  z-index: 5;
}

#luminus-world-overlay .luminus-peer-marker-icon {
  display: grid;
  place-items: center;
  width: 20px !important;
  height: 20px !important;
  flex-basis: 20px !important;
}

#luminus-world-overlay .luminus-peer-marker-icon[data-extension="luminus"] {
  width: 23px !important;
  height: 23px !important;
  flex-basis: 23px !important;
}

#luminus-world-overlay .luminus-peer-marker-icon svg,
#luminus-world-overlay .luminus-peer-marker-icon img {
  display: block;
  width: 20px !important;
  height: 20px !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain !important;
}

#luminus-world-overlay .luminus-peer-marker-icon[data-extension="luminus"] svg {
  width: 23px !important;
  height: 23px !important;
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
  --lm-glass: var(--luminus-ui-surface);
  --lm-plate: var(--luminus-ui-surface-raised);
  --lm-plate-hover: var(--luminus-ui-surface-hover);
  --lm-plate-active: var(--luminus-ui-surface-active);
  --lm-hairline: var(--luminus-ui-border);
  --lm-hairline-soft: var(--luminus-ui-border-soft);
  --lm-text: var(--luminus-ui-text);
  --lm-text-dim: var(--luminus-ui-text-dim);
  --lm-muted: var(--luminus-ui-muted);
  --lm-lumen: var(--luminus-ui-accent);
  --lm-lumen-bright: var(--luminus-ui-accent-strong);
  --lm-glow: rgba(142, 162, 255, 0.40);
  --lm-ink: #0b0e1c;

  --lm-mono: var(--luminus-ui-mono);
  --lm-sans: var(--luminus-ui-sans);
  --lm-radius: 18px;
  /* Header + footer reserved heights — content scrolls; resize never clips the footer. */
  --lm-header-h: 46px;
  --lm-footer-h: 26px;
  --lm-chrome-h: calc(var(--lm-header-h) + var(--lm-footer-h));
  /* Min shell: chrome + a short content band (relative to viewport). */
  --lm-panel-min-h: max(168px, min(220px, calc(var(--lm-safe-height, 70dvh) * 0.32)));

  position: fixed;
  z-index: 2147483647;
  width: min(400px, calc(100vw - 24px));
  height: min(550px, var(--lm-safe-height, calc(100dvh - 96px)));
  /* Cap to Nitro-safe band (toolbar top → viewport top); JS keeps --lm-safe-height fresh. */
  max-height: min(620px, var(--lm-safe-height, calc(100dvh - 96px)));
  min-height: var(--lm-panel-min-h);
  display: flex;
  flex-direction: column;

  /* layered glass: soft top-accent bloom + cool base over the smoked plate */
  background:
    radial-gradient(135% 90% at 50% -12%, rgba(142, 162, 255, 0.11), transparent 58%),
    radial-gradient(100% 60% at 100% 0%, rgba(196, 205, 255, 0.05), transparent 60%),
    var(--lm-glass);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
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

/* header / drag handle — fixed band so resize shrinks only the body */
#luminus-panel .lm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  height: var(--lm-header-h);
  min-height: var(--lm-header-h);
  max-height: var(--lm-header-h);
  padding: 0 13px 0 16px;
  cursor: grab;
  user-select: none;
  border-bottom: 1px solid var(--lm-hairline-soft);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01) 60%, transparent);
  flex: 0 0 var(--lm-header-h);
}

#luminus-panel .lm-header:active { cursor: grabbing; }

#luminus-panel .lm-view-heading {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
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
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  color: var(--lm-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

#luminus-panel .lm-view-copy {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  gap: 1px;
  line-height: 1.15;
}

#luminus-panel .lm-view-summary {
  max-width: 190px;
  overflow: hidden;
  color: var(--lm-muted);
  font-size: 9px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Footer: fixed height (screen-relative), never shrinks when the panel is shortened */
#luminus-panel .lm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-sizing: border-box;
  height: var(--lm-footer-h);
  min-height: var(--lm-footer-h);
  max-height: var(--lm-footer-h);
  flex: 0 0 var(--lm-footer-h);
  padding: 0 12px;
  border-top: 1px solid var(--lm-hairline-soft);
  color: rgba(168, 175, 208, 0.62);
  font-family: var(--lm-mono);
  font-size: 9px;
  letter-spacing: 0.02em;
  overflow: hidden;
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
  white-space: nowrap;
}

#luminus-panel.is-launcher,
#luminus-panel.is-grid-shell {
  width: min(400px, calc(100vw - 24px));
}

#luminus-panel .lm-launcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 14px;
  /* Body absorbs shrink; footer/header stay fixed. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(196, 205, 255, 0.42) transparent;
  animation: lm-view-in 0.18s ease-out;
}
#luminus-panel .lm-launcher::-webkit-scrollbar { width: 6px; }
#luminus-panel .lm-launcher::-webkit-scrollbar-track { background: transparent; }
#luminus-panel .lm-launcher::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(196, 205, 255, 0.48), rgba(142, 162, 255, 0.28));
  border-radius: 999px;
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
#luminus-panel .lm-launcher-item.is-render .lm-launcher-icon { color: #8fd8ff; }

#luminus-panel .lm-launcher-item.is-dev .lm-launcher-icon { color: #f4c76d; }

#luminus-panel .lm-launcher-item.is-logs:hover { border-color: rgba(98, 223, 198, 0.38); }
#luminus-panel .lm-launcher-item.is-visual:hover { border-color: rgba(255, 159, 200, 0.38); }
#luminus-panel .lm-launcher-item.is-render:hover { border-color: rgba(143, 216, 255, 0.38); }
#luminus-panel .lm-launcher-item.is-dev:hover { border-color: rgba(244, 199, 109, 0.38); }

/* Intent-first launcher: the shell stays compact, while search and detail remain discoverable. */
#luminus-panel .lm-launcher {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}
#luminus-panel .lm-launcher-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
#luminus-panel .lm-launcher-item {
  min-height: 88px;
  padding: 10px 8px;
  gap: 7px;
  font-size: 11.5px;
  line-height: 1.2;
}
#luminus-panel .lm-launcher-item small {
  display: -webkit-box;
  max-width: 100%;
  overflow: hidden;
  color: var(--lm-muted);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
#luminus-panel .lm-launcher-item .lm-launcher-icon {
  width: 34px;
  height: 34px;
  border-radius: 7px;
}
#luminus-panel .lm-launcher-item .lm-launcher-icon svg {
  width: 20px;
  height: 20px;
}
#luminus-panel .lm-panel-search {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 8px;
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--lm-muted);
}
#luminus-panel .lm-panel-search .lm-input {
  min-width: 0;
  border: 0;
  background: transparent;
  padding-left: 0;
}
#luminus-panel .lm-panel-search:focus-within {
  border-color: rgba(196, 205, 255, 0.18);
  box-shadow: 0 0 0 2px rgba(142, 162, 255, 0.08);
}
#luminus-panel .lm-panel-search .lm-input:focus {
  outline: none;
  border-color: transparent !important;
  background: transparent !important;
}
#luminus-panel .lm-search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(320px, calc(var(--lm-safe-height, 70dvh) - var(--lm-chrome-h) - 62px));
  overflow-y: auto;
}
#luminus-panel .lm-search-result {
  all: unset;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px;
  border-radius: 7px;
  cursor: pointer;
}
#luminus-panel .lm-search-result:hover,
#luminus-panel .lm-search-result.is-active { background: var(--lm-plate-hover); }
#luminus-panel .lm-search-result-title { color: var(--lm-text); font-size: 11px; font-weight: 700; }
#luminus-panel .lm-search-result-meta { color: var(--lm-muted); font-size: 9px; line-height: 1.3; }
#luminus-panel .lm-search-empty { padding: 10px; color: var(--lm-muted); font-size: 10px; text-align: center; }
#luminus-panel .lm-section.is-search-focus {
  animation: lm-section-focus 0.7s ease-out;
}
@keyframes lm-section-focus {
  0% { filter: brightness(1.35); }
  100% { filter: brightness(1); }
}

@media (max-width: 420px) {
  #luminus-panel .lm-launcher-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #luminus-panel .lm-view-summary { max-width: 145px; }
}

/* Generic 2-col status plate */
#luminus-panel .lm-status-grid {
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
#luminus-panel .lm-status-grid span { display: flex; justify-content: space-between; gap: 6px; }
#luminus-panel .lm-status-grid b { color: var(--lm-muted); font-weight: 600; }


@keyframes lm-view-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* category content — only body scrolls when panel height is reduced */
#luminus-panel .lm-tab-content {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(196, 205, 255, 0.42) transparent;
  flex: 1 1 auto;
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
  gap: 4px;
}

#luminus-panel .lm-section-title {
  font-family: var(--lm-sans);
  display: grid;
  grid-template-columns: auto minmax(24px, 1fr);
  align-items: center;
  gap: 11px;
  font-size: 13px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: rgba(226, 230, 250, 0.88);
  padding: 8px 3px 5px;
  text-align: left;
  white-space: nowrap;
}

#luminus-panel .lm-section-title::after {
  content: "";
  height: 1px;
  background: linear-gradient(90deg, rgba(142, 162, 255, 0.34), rgba(255, 255, 255, 0.08) 48%, transparent);
}

#luminus-panel .lm-subsection-title {
  padding: 4px 7px 1px;
  color: var(--lm-muted);
  font-size: 9.5px;
  font-weight: 700;
}

/* row: label + control (glass plate) */
#luminus-panel .lm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  transition: background 0.16s, border-color 0.16s;
}

/* nested sub-option under a toggle row Ã¢â‚¬â€ indented, quieter plate, no card chrome */
#luminus-panel .lm-row-sub {
  margin-left: 0;
  min-height: 35px;
  padding: 5px 8px;
  background: transparent;
  border: 1px solid transparent;
}

#luminus-panel .lm-row-sub .lm-label { font-size: 11.5px; }

#luminus-panel .lm-row-layout-priority {
  align-items: flex-start;
}

#luminus-panel .lm-segmented-control {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: rgba(5, 7, 15, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
}

#luminus-panel .lm-segmented-btn {
  min-width: 70px;
  padding: 6px 8px;
  color: var(--lm-muted);
  background: transparent;
  border: 0;
  border-radius: 6px;
  font: 650 10px/1 var(--lm-sans);
  cursor: pointer;
  transition: color 0.14s, background 0.14s, box-shadow 0.14s;
}

#luminus-panel .lm-segmented-btn:hover,
#luminus-panel .lm-segmented-btn:focus-visible {
  color: var(--lm-text-dim);
  background: rgba(255, 255, 255, 0.06);
  outline: none;
}

#luminus-panel .lm-segmented-btn.is-active {
  color: #111426;
  background: linear-gradient(135deg, #dce1ff, #8ea2ff);
  box-shadow: 0 4px 12px rgba(90, 110, 210, 0.24);
}

/* Nested under another sub-option (e.g. Ctrl+clique → libera anti-girar) */
#luminus-panel .lm-row-sub2 {
  margin-left: 8px;
  background: rgba(142, 162, 255, 0.035);
}

#luminus-panel .lm-row-sub2 .lm-label { font-size: 11px; }

#luminus-panel .lm-option-group {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(196, 205, 255, 0.11);
  border-radius: 12px;
  transition: background 0.18s, border-color 0.18s;
}

#luminus-panel .lm-option-group:hover {
  background: rgba(255, 255, 255, 0.052);
  border-color: rgba(196, 205, 255, 0.2);
}

#luminus-panel .lm-option-group.is-open {
  background: rgba(142, 162, 255, 0.055);
  border-color: rgba(142, 162, 255, 0.24);
}

#luminus-panel .lm-option-group > .lm-row {
  background: transparent;
  border: 0;
  min-height: 44px;
  padding: 7px 10px;
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
  gap: 3px;
  padding: 2px 5px 2px 7px;
  border-radius: 999px;
  color: rgba(196, 205, 255, 0.68);
  background: rgba(142, 162, 255, 0.08);
  font-size: 9.75px;
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
  gap: 2px;
  margin: 0;
  padding: 6px 7px 8px;
  border-top: 1px solid rgba(196, 205, 255, 0.1);
  background: rgba(3, 5, 13, 0.12);
}

#luminus-panel .lm-inline-option {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 4px 7px;
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
  font-size: 12.5px;
  color: var(--lm-text);
  flex: 1;
  min-width: 0;
  line-height: 1.32;
}

/* packet identifiers, headers, coords Ã¢â€ â€™ mono (the tool's native type) */
#luminus-panel .lm-sub {
  font-family: var(--lm-sans);
  font-size: 11px;
  color: rgba(177, 184, 216, 0.68);
  display: block;
  margin-top: 3px;
  line-height: 1.34;
  letter-spacing: 0;
}

/* Radix Switch */
#luminus-panel .lm-switch-root {
  all: unset;
  width: 36px;
  height: 22px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 11px;
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
  top: 3px;
  left: 3px;
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

#luminus-panel .lm-row-controls {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex: 0 0 auto;
}

#luminus-panel .lm-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--lm-hairline-soft);
  border-radius: 8px;
  color: var(--lm-text);
  height: 24px;
  font-size: 11px;
  font-family: var(--lm-mono);
  padding: 3px 7px;
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

#luminus-panel .lm-input.lm-input-number {
  width: 60px;
  flex: 0 0 60px;
  font-variant-numeric: tabular-nums;
}

#luminus-panel .lm-input.lm-input-small {
  width: 72px;
  flex: 0 0 72px;
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
  min-height: 24px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 4px 11px;
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
  border: 0 !important;
  border-radius: 12px !important;
  padding: 0 6px !important;
  overflow: hidden !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55) !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only,
body.luminus-ui-menus .nitro-context-menu.is-name-only {
  --luminus-context-edge: 5px;
  --luminus-context-gap: 5px;
  display: flex !important;
  align-items: center !important;
  min-height: 32px !important;
  background:
    linear-gradient(105deg, rgba(185, 199, 255, 0.19), rgba(112, 128, 205, 0.08) 48%, rgba(15, 18, 30, 0.78)),
    rgba(21, 24, 38, 0.92) !important;
  border: 0 !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.95) !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  gap: var(--luminus-context-gap) !important;
  line-height: 1.05 !important;
  padding: 4px 8px !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.62) !important;
  box-shadow: 0 8px 18px -10px rgba(0, 0, 0, 0.9) !important;
  transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only:hover,
body.luminus-ui-menus .nitro-context-menu.is-name-only:hover {
  border-color: rgba(205, 216, 255, 0.38) !important;
  background:
    linear-gradient(105deg, rgba(202, 214, 255, 0.25), rgba(129, 146, 226, 0.12) 48%, rgba(15, 18, 30, 0.84)),
    rgba(24, 28, 45, 0.94) !important;
  box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.95) !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-name-only-link-icon,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-name-only-link-icon,
body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-name-only-link-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 20px !important;
  height: 20px !important;
  cursor: pointer !important;
  margin-left: auto !important;
  padding-left: 6px !important;
  border-left: 1px solid rgba(206, 216, 255, 0.22) !important;
  pointer-events: auto !important;
  flex-shrink: 0 !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-name-only-link-icon svg,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-name-only-link-icon svg,
body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-name-only-link-icon svg {
  width: 14px !important;
  height: 14px !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget,
body.luminus-ui-user-chooser .nitro-user-chooser,
body.luminus-ui-user-chooser [class*="user-chooser-widget"] {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05) !important;
  border: 0 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55) !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-name-only-link-icon,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-name-only-link-icon {
  margin-left: auto !important;
  margin-right: 0 !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-gender-icon,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-gender-icon,
body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-gender-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 18px !important;
  height: 18px !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding: 3px !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.08) !important;
  flex: 0 0 auto !important;
  line-height: 1 !important;
}

body.luminus-ui-menus .nitro-context-menu.name-only .luminus-gender-icon,
body.luminus-ui-menus .nitro-context-menu.is-name-only .luminus-gender-icon {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-gender-icon {
  margin-right: 1px !important;
}

body.luminus-ui-menus .nitro-context-menu .menu-header .luminus-name-only-link-icon {
  margin-left: auto !important;
}

body.luminus-ui-menus .nitro-context-menu .luminus-gender-icon.gender-f {
  color: #ff8fc7 !important;
  filter: drop-shadow(0 0 3px rgba(255, 143, 199, 0.28));
}

body.luminus-ui-menus .nitro-context-menu .luminus-gender-icon.gender-m {
  color: #8ea2ff !important;
  filter: drop-shadow(0 0 3px rgba(142, 162, 255, 0.28));
}

body.luminus-ui-menus .nitro-context-menu .luminus-gender-icon.is-bot {
  width: 18px !important;
  height: 18px !important;
  padding: 2px !important;
  border: 1px solid rgba(255, 205, 112, 0.42) !important;
  border-radius: 6px !important;
  background: rgba(255, 184, 77, 0.16) !important;
  color: #ffd170 !important;
  filter: drop-shadow(0 0 4px rgba(255, 184, 77, 0.42)) !important;
}

body.luminus-ui-menus .nitro-context-menu .luminus-gender-icon svg {
  display: block;
  width: 13px !important;
  height: 13px !important;
}

body.luminus-ui-menus .nitro-context-menu .luminus-gender-icon.is-bot svg {
  width: 14px !important;
  height: 14px !important;
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
    radial-gradient(125% 110% at 8% -18%, rgba(142, 162, 255, 0.24), transparent 58%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.018) 58%),
    rgba(13, 16, 26, 0.88) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  border: 0 !important;
  border-radius: 14px !important;
  box-sizing: border-box !important;
  color: rgba(238, 241, 255, 0.94) !important;
  font-family: var(--luminus-ui-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif) !important;
  min-width: min(158px, calc(100vw - 24px)) !important;
  width: min(202px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 24px) !important;
  padding: 7px !important;
  overflow: hidden !important;
  box-shadow: 0 18px 38px -18px rgba(0, 0, 0, 0.92) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .flex-column.gap-2 {
  gap: 6px !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog > .d-flex > .align-items-center.justify-content-between {
  align-items: flex-start !important;
  gap: 6px !important;
  padding: 0 !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .fs-6 {
  color: rgba(244, 246, 255, 0.96) !important;
  flex: 1 1 auto !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.22 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.48) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .fa-icon {
  width: 10px !important;
  height: 10px !important;
  padding: 2px !important;
  border: 0 !important;
  border-radius: 4px !important;
  background: none !important;
  background-color: transparent !important;
  color: rgba(230, 234, 255, 0.72) !important;
  box-shadow: none !important;
  flex: 0 0 auto !important;
  margin: -1px -1px 0 0 !important;
  transition: color 0.14s, background 0.14s, border-color 0.14s, transform 0.14s !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .fa-icon:hover {
  color: #ffffff !important;
  background: rgba(142, 162, 255, 0.12) !important;
  transform: scale(1.08) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog > .d-flex > .d-flex.gap-1.justify-content-end {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  gap: 4px !important;
  width: 100% !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn {
  border-radius: 8px !important;
  color: rgba(248, 250, 255, 0.96) !important;
  display: flex !important;
  flex: 1 1 0 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  line-height: 1.1 !important;
  min-height: 24px !important;
  min-width: 0 !important;
  padding: 4px 6px !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.42) !important;
  transition: background 0.14s, border-color 0.14s, box-shadow 0.14s, transform 0.14s !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn:hover {
  transform: translateY(-1px) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn:focus-visible,
body.luminus-ui-menus .nitro-friend-request-dialog .fa-icon:focus-visible {
  outline: 2px solid rgba(196, 205, 255, 0.9) !important;
  outline-offset: 2px !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-danger {
  background: rgba(255, 255, 255, 0.055) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(231, 235, 250, 0.82) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-danger:hover {
  background: rgba(220, 112, 137, 0.17) !important;
  border-color: rgba(255, 173, 185, 0.42) !important;
  color: #ffd9df !important;
  box-shadow: 0 7px 16px -10px rgba(220, 112, 137, 0.54) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-success {
  background: linear-gradient(145deg, rgba(142, 162, 255, 0.92), rgba(71, 91, 190, 0.94)) !important;
  border: 1px solid rgba(196, 205, 255, 0.48) !important;
  color: #f4f6ff !important;
  box-shadow: 0 7px 16px -10px rgba(91, 112, 224, 0.7) !important;
}

body.luminus-ui-menus .nitro-friend-request-dialog .btn-success:hover {
  background: linear-gradient(145deg, rgba(169, 184, 255, 0.98), rgba(82, 104, 218, 0.98)) !important;
  border-color: rgba(216, 222, 255, 0.72) !important;
  box-shadow: 0 9px 18px -10px rgba(91, 112, 224, 0.84) !important;
}

/* Context menu children Ã¢â‚¬â€ this lives outside #luminus-panel so our --lm-* custom properties
   aren't inherited; colors are spelled out literally to match the same palette. */
body.luminus-ui-menus .nitro-context-menu .menu-header {
  background: rgba(142, 162, 255, 0.16) !important;
  border: 0 !important;
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
  border: 0 !important;
  border-radius: 8px !important;
  color: rgba(255, 255, 255, 0.92) !important;
  transition: background 0.12s, border-color 0.12s !important;
}

body.luminus-ui-menus .nitro-context-menu .menu-item:hover {
  background: rgba(142, 162, 255, 0.2) !important;
}

body.luminus-ui-menus .nitro-context-menu .menu-footer {
  padding: 4px !important;
}

/* Expanded user menus: a quiet identity rail above a compact action stack. */
body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  width: max-content !important;
  min-width: 126px !important;
  max-width: calc(100vw - 16px) !important;
  padding: 5px !important;
  border-radius: 12px !important;
  background:
    radial-gradient(120% 90% at 10% 0%, rgba(142, 162, 255, 0.2), transparent 58%),
    rgba(13, 16, 26, 0.9) !important;
  border: 0 !important;
  box-shadow: 0 18px 38px -18px rgba(0, 0, 0, 0.94) !important;
}

body.luminus-ui-menus .nitro-context-menu.luminus-context-long-menu:not(.nitro-friend-request-dialog) {
  width: max-content !important;
  min-width: max-content !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-header {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: 100% !important;
  align-self: stretch !important;
  box-sizing: border-box !important;
  flex: 0 0 auto !important;
  min-height: 32px !important;
  margin: 0 0 4px !important;
  padding: 4px 32px !important;
  gap: var(--luminus-context-gap, 5px) !important;
  border: 0 !important;
  border-radius: 8px !important;
  background:
    linear-gradient(105deg, rgba(142, 162, 255, 0.2), rgba(142, 162, 255, 0.06) 62%, transparent),
    rgba(255, 255, 255, 0.035) !important;
  color: rgba(248, 250, 255, 0.98) !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  line-height: 1.05 !important;
  letter-spacing: normal !important;
  white-space: nowrap !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.62) !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-header.luminus-context-long-name {
  width: auto !important;
  min-width: 0 !important;
  max-width: 100% !important;
  flex: 0 0 auto !important;
  padding-inline: 30px !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  text-align: center !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-header .luminus-name-only-link-icon {
  position: absolute !important;
  right: 8px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  margin-left: 0 !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-header > .luminus-gender-icon {
  position: absolute !important;
  left: 8px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  margin: 0 !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-list {
  width: 100% !important;
  align-self: stretch !important;
  gap: 3px !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-list > .menu-item {
  margin: 1px 0 !important;
  min-height: 28px !important;
  padding: 7px 10px !important;
  border: 0 !important;
  border-radius: 7px !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: rgba(235, 239, 255, 0.86) !important;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-list > .menu-item:hover {
  transform: translateX(1px);
  background: rgba(142, 162, 255, 0.15) !important;
  color: #ffffff !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-item {
  width: 100% !important;
  align-self: stretch !important;
  margin: 1px 0 !important;
}

body.luminus-ui-menus .nitro-context-menu:not(.name-only):not(.is-name-only):not(.nitro-widget-high-score):not(.nitro-friend-request-dialog) > .menu-footer {
  width: 100% !important;
  align-self: stretch !important;
}

/* Room tools rail (camera/settings/chat-history/etc, left edge of the room) Ã¢â‚¬â€ flush against
   the left edge, so only the right corners round, mirroring .nitro-purse's flush-top logic */
/* Shared glass material: every room-side surface uses these exact values. */
:root {
  --luminus-ui-glass-background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62);
  --luminus-ui-glass-backdrop: blur(18px) saturate(160%) brightness(1.03);
  --luminus-ui-glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --luminus-ui-glass-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

body.luminus-ui-room-tools .nitro-room-tools {
  background: var(--luminus-ui-glass-background) !important;
  -webkit-backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  border: var(--luminus-ui-glass-border) !important;
  border-radius: 0 12px 12px 0 !important;
  box-shadow: var(--luminus-ui-glass-shadow) !important;
}

/* Right-side sidebar (currency/purse bar, flush against the top edge Ã¢â‚¬â€ only the bottom
   corners round Ã¢â‚¬â€ and the floating room-ranking notification bubble) */
body.luminus-ui-purse .nitro-purse {
  background: var(--luminus-ui-glass-background) !important;
  -webkit-backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  border: var(--luminus-ui-glass-border) !important;
  border-top: 0 !important;
  border-radius: 0 0 12px 12px !important;
  box-shadow: var(--luminus-ui-glass-shadow) !important;
}

/* Seasonal-currency rows (Rubis/Asinhas) Ã¢â‚¬â€ standalone boxes below the purse bar, not flush
   against anything, so unlike .nitro-purse they round on all corners */
body.luminus-ui-purse .nitro-purse-seasonal-currency {
  background: var(--luminus-ui-glass-background) !important;
  -webkit-backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  border: var(--luminus-ui-glass-border) !important;
  border-radius: 12px !important;
  box-shadow: var(--luminus-ui-glass-shadow) !important;
}

body.luminus-ui-notifications .nitro-notification-bubble {
  background: var(--luminus-ui-glass-background) !important;
  -webkit-backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  backdrop-filter: var(--luminus-ui-glass-backdrop) !important;
  border: var(--luminus-ui-glass-border) !important;
  border-radius: 12px !important;
  box-shadow: var(--luminus-ui-glass-shadow) !important;
}

/* toolbar icons (main Luminus icon + Logs/Links) Ã¢â‚¬â€ one shared pattern, same box, same margin */
/* Small native-feeling controls added around Nitro's right rail. */
.nitro-room-tools {
  transform-origin: left center;
  transition: opacity 0.16s ease-out, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.luminus-room-tools-shell,
.luminus-purse-shell {
  position: relative;
  isolation: isolate;
  gap: 0;
}

.luminus-room-tools-shell > .luminus-room-tools-toggle,
.luminus-room-tools-shell > .nitro-room-tools,
.luminus-purse-shell > .luminus-purse-toggle,
.luminus-purse-shell > .nitro-purse {
  position: relative;
  z-index: 1;
  margin: 0 !important;
}

.luminus-room-tools-shell {
  display: flex;
  align-items: stretch;
  width: max-content;
  max-width: 100%;
}

.luminus-purse-shell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: var(--luminus-purse-width, 100%);
}

.luminus-room-tools-shell::before,
.luminus-purse-shell::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
  content: "";
  background: var(--luminus-ui-glass-background);
  -webkit-backdrop-filter: var(--luminus-ui-glass-backdrop);
  backdrop-filter: var(--luminus-ui-glass-backdrop);
  border: var(--luminus-ui-glass-border);
  box-shadow: var(--luminus-ui-glass-shadow);
  opacity: 1;
  transition: opacity 0.16s ease-out, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.luminus-room-tools-shell::before {
  transform-origin: left center;
  border-radius: 0 12px 12px 0;
}

.luminus-purse-shell::before {
  transform-origin: top center;
  border-radius: 0 0 12px 12px;
}

.luminus-room-tools-shell-collapsed::before {
  opacity: 1;
  transform: scaleX(1);
}

.luminus-purse-shell-collapsed::before {
  opacity: 1;
  transform: scaleY(1);
}

.luminus-room-tools-shell:not(.luminus-room-tools-shell-collapsed)::before,
.luminus-purse-shell:not(.luminus-purse-shell-collapsed)::before {
  opacity: 1;
  transform: scale(1);
}

body:not(.luminus-ui-room-tools) .luminus-room-tools-shell::before {
  display: none;
}

body:not(.luminus-ui-purse) .luminus-purse-shell::before {
  display: none;
}

body.luminus-ui-room-tools .luminus-room-tools-shell .nitro-room-tools,
body.luminus-ui-purse .luminus-purse-shell .nitro-purse {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.luminus-room-tools-shell:not(.luminus-room-tools-shell-collapsed) .luminus-room-tools-toggle,
.luminus-purse-shell:not(.luminus-purse-shell-collapsed) .luminus-purse-toggle {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: none !important;
}

body.luminus-ui-purse .luminus-purse-shell-collapsed .luminus-purse-toggle {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: none !important;
}

.luminus-room-tools-shell-collapsed > .luminus-room-tools-toggle {
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: none !important;
}

.luminus-purse-seasonal-collapsed {
  display: none !important;
}

/* An external layout owner keeps its own controls and receives no duplicate
   affordance while the local owner is active. */
body.luminus-layout-luminus-first #PurseButtonCollapse,
body.luminus-layout-luminus-first #RoomToolsButtonCollapse {
  display: none !important;
}

body.luminus-layout-external-first .luminus-purse-shell,
body.luminus-layout-external-first .luminus-room-tools-shell,
body.luminus-layout-external-first .luminus-purse-toggle,
body.luminus-layout-external-first .luminus-room-tools-toggle {
  display: none !important;
}

body.luminus-ui-room-tools .nitro-room-tools.luminus-room-tools-collapsed {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  transform: scaleX(0.02);
}

body.luminus-ui-room-tools .nitro-room-tools:not(.luminus-room-tools-collapsed) {
  opacity: 1;
  transform: scaleX(1);
}

.nitro-room-tools-host-collapsed,
.nitro-purse-host-collapsed {
  gap: 0 !important;
}

.luminus-room-tools-host {
  align-items: stretch !important;
  gap: 0 !important;
}

.luminus-purse-host {
  align-items: stretch !important;
}

.luminus-room-tools-toggle {
  position: relative;
  z-index: 70 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  min-width: 18px;
  height: auto;
  min-height: 100%;
  align-self: stretch;
  flex: 0 0 18px;
  padding: 0;
  box-sizing: border-box;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(220, 226, 255, 0.82);
  cursor: pointer;
  pointer-events: auto !important;
  transition: color 0.14s, filter 0.14s, background 0.14s;
}

.luminus-room-tools-toggle svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

body.luminus-ui-room-tools .luminus-room-tools-toggle:hover,
body.luminus-ui-room-tools .luminus-room-tools-toggle:focus-visible,
body.luminus-ui-room-tools .luminus-room-tools-toggle[aria-expanded="true"] {
  background:
    radial-gradient(135% 140% at 50% -40%, rgba(142, 162, 255, 0.14), transparent 60%),
    rgba(16, 18, 28, 0.62);
  -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05);
  backdrop-filter: blur(24px) saturate(180%) brightness(1.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 12px 32px -10px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  color: #ffffff;
  filter: none;
  outline: none;
}

body.luminus-ui-room-tools .luminus-room-tools-toggle[aria-expanded="true"] {
  border: 0 !important;
  border-radius: 0;
  margin-right: -1px;
}

body.luminus-ui-room-tools .luminus-room-tools-toggle[aria-expanded="true"] + .nitro-room-tools {
  border-left: 0 !important;
}

.luminus-purse-toggle {
  position: relative;
  z-index: 70 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--luminus-purse-width, 100%);
  min-width: 0;
  flex: 0 0 18px;
  height: 18px;
  min-height: 18px;
  max-height: 18px;
  align-self: stretch;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: rgba(220, 226, 255, 0.82);
  cursor: pointer;
  pointer-events: auto !important;
  transition: color 0.14s, filter 0.14s, background 0.14s;
}

.luminus-purse-toggle svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nitro-purse.luminus-purse-collapsed {
  width: var(--luminus-purse-width, 100%) !important;
  min-width: var(--luminus-purse-width, 100%) !important;
  max-width: var(--luminus-purse-width, 100%) !important;
  max-height: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
  transform: scaleY(0.02);
}

.nitro-purse {
  transform-origin: top center;
  overflow: hidden;
  transition:
    opacity 0.16s ease-out,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    max-height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    padding 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.nitro-purse:not(.luminus-purse-collapsed) {
  max-height: 240px;
  opacity: 1;
  transform: scaleY(1);
}

/* The two disclosures must use the same motion contract, including when the
   browser reports prefers-reduced-motion for the native Nitro surface. */
.luminus-room-tools-shell > .nitro-room-tools,
.luminus-purse-shell > .nitro-purse {
  transition:
    opacity 0.16s ease-out,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    max-height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    padding 0.24s cubic-bezier(0.22, 1, 0.36, 1) !important;
}

body:not(.luminus-ui-purse) .luminus-purse-shell > .nitro-purse,
body:not(.luminus-ui-purse) .nitro-purse {
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .luminus-purse-toggle,
  .luminus-room-tools-toggle {
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

/* laptop / 720p–1080p band */
@media (max-width: 1366px) {
  #luminus-panel {
    width: min(400px, calc(100vw - 20px));
  }
}

@media (max-width: 1280px) {
  #luminus-panel {
    width: min(400px, calc(100vw - 16px));
  }
}

/* narrow screens */
@media (max-width: 480px) {
  #luminus-panel {
    width: calc(100vw - 16px);
    max-height: min(620px, var(--lm-safe-height, calc(100dvh - 72px)));
    right: 8px !important;
    left: auto !important;
    --lm-radius: 16px;
  }
  #luminus-panel .lm-tab-content { padding: 8px; gap: 8px; }
  #luminus-panel .lm-header { padding: 0 11px 0 14px; }
}

/* short viewports — slightly tighter chrome; footer still fixed and visible */
@media (max-height: 800px) {
  #luminus-panel {
    max-height: min(560px, var(--lm-safe-height, calc(100dvh - 72px)));
    --lm-header-h: 48px;
    --lm-footer-h: 28px;
  }
}

@media (max-height: 560px) {
  #luminus-panel {
    max-height: min(480px, var(--lm-safe-height, calc(100dvh - 48px)));
    --lm-header-h: 46px;
    --lm-footer-h: 26px;
    --lm-panel-min-h: max(140px, min(180px, calc(var(--lm-safe-height, 50dvh) * 0.4)));
  }
  #luminus-panel .lm-footer { font-size: 8px; }
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
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--lm-toast-accent) 16%, transparent), transparent 42%),
    var(--luminus-ui-surface);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid color-mix(in srgb, var(--lm-toast-accent) 36%, var(--luminus-ui-border));
  box-shadow:
    0 14px 34px -10px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  color: var(--luminus-ui-text);
  font-family: var(--luminus-ui-sans);
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
  --lw-bg:      var(--luminus-ui-surface);
  --lw-plate:   var(--luminus-ui-surface-raised);
  --lw-border:  var(--luminus-ui-border);
  --lw-text:    var(--luminus-ui-text);
  --lw-muted:   var(--luminus-ui-muted);
  --lw-radius:  var(--luminus-ui-radius);
  --lw-sans:    var(--luminus-ui-sans);
  --lw-mono:    var(--luminus-ui-mono);

  position: fixed;
  z-index: 999999;
  top: max(8px, var(--lm-safe-top, 8px));
  left: 24px;
  /* Size within Nitro-safe band; JS clamp keeps header on-screen and above toolbar. */
  width: min(580px, calc(100vw - 24px), var(--lm-safe-width, 100vw));
  height: min(620px, var(--lm-safe-height, calc(100dvh - 80px)));
  max-width: min(580px, calc(100vw - 16px), var(--lm-safe-width, 100vw));
  max-height: min(620px, var(--lm-safe-height, calc(100dvh - 80px)));
  min-width: min(360px, calc(100vw - 16px));
  min-height: min(260px, var(--lm-safe-height, 260px));
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
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--lw-border);
  border-radius: var(--lw-radius);
  box-shadow:
    0 0 0 0.5px rgba(255,255,255,0.05) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 32px 100px rgba(0,0,0,0.65),
    0 8px 32px rgba(0,0,0,0.4);
  overflow: hidden;
}

@media (max-width: 1366px) {
  .lm-float-window {
    width: min(520px, calc(100vw - 20px));
    max-width: min(520px, calc(100vw - 16px));
  }
}

@media (max-width: 1280px), (max-height: 720px) {
  .lm-float-window {
    width: min(480px, calc(100vw - 16px));
    max-width: min(480px, calc(100vw - 16px));
    min-width: min(320px, calc(100vw - 16px));
    height: min(520px, var(--lm-safe-height, calc(100dvh - 72px)));
    max-height: min(520px, var(--lm-safe-height, calc(100dvh - 72px)));
  }
}

/* Links: wider by default so multi-link people can lay chips horizontally */
#luminus-linkwindow {
  width: min(920px, calc(100vw - 24px), var(--lm-safe-width, 100vw));
  max-width: min(960px, calc(100vw - 16px), var(--lm-safe-width, 100vw));
  min-width: min(480px, calc(100vw - 16px));
}

@media (max-width: 1366px) {
  #luminus-linkwindow {
    width: min(820px, calc(100vw - 20px), var(--lm-safe-width, 100vw));
    max-width: min(860px, calc(100vw - 16px), var(--lm-safe-width, 100vw));
  }
}

@media (max-width: 1280px) {
  #luminus-linkwindow {
    width: min(720px, calc(100vw - 16px), var(--lm-safe-width, 100vw));
    max-width: min(760px, calc(100vw - 16px), var(--lm-safe-width, 100vw));
    min-width: min(400px, calc(100vw - 16px));
  }
}

/* header */
.lm-float-window .lw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 11px;
  border-bottom: 1px solid var(--lw-border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent);
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
  width: 32px;
  height: 32px;
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
.lm-float-window :focus-visible {
  outline: 2px solid var(--luminus-ui-accent);
  outline-offset: 2px;
  border-radius: 5px;
}

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
.lm-float-window .lw-filter-btn:focus-visible {
  outline: 2px solid var(--luminus-ui-accent);
  outline-offset: 2px;
}

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
.lm-float-window .lw-clear-btn:focus-visible {
  outline: 2px solid var(--luminus-ui-accent);
  outline-offset: 2px;
}

/* ── Logs search ── */
.lm-float-window .lw-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin: 0 12px 8px;
  padding: 6px 10px;
  border: 1px solid var(--lw-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
}
.lm-float-window .lw-search-bar:focus-within {
  border-color: rgba(142, 162, 255, 0.62);
  background: rgba(142, 162, 255, 0.07);
  box-shadow: 0 0 0 3px rgba(142, 162, 255, 0.1);
}
.lm-float-window .lw-search-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--lw-muted);
}
.lm-float-window .lw-search-input {
  all: unset;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--lw-text);
}
.lm-float-window .lw-search-input::placeholder { color: var(--lw-muted); }
.lm-float-window .lw-search-clear {
  all: unset;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--lw-muted);
  font-size: 10px;
  cursor: pointer;
}
.lm-float-window .lw-search-clear:hover {
  color: var(--lw-text);
  background: rgba(255, 255, 255, 0.06);
}

/* ── Presence strips (room + friends) ── */
.lm-float-window .lw-presence {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex-shrink: 0;
  border-bottom: 1px solid var(--lw-border);
  max-height: min(168px, 32%);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(196, 205, 255, 0.35) transparent;
}
.lm-float-window .lw-presence-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px 10px;
}
.lm-float-window .lw-presence-section + .lw-presence-section {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.lm-float-window .lw-presence-section.is-room {
  background: linear-gradient(180deg, rgba(84, 160, 255, 0.07), transparent 90%);
}
.lm-float-window .lw-presence-section.is-friend {
  background: linear-gradient(180deg, rgba(38, 222, 129, 0.07), transparent 90%);
}
.lm-float-window .lw-presence-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lm-float-window .lw-presence-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(200, 208, 240, 0.72);
}
.lm-float-window .lw-presence-section.is-room .lw-presence-title { color: rgba(140, 190, 255, 0.9); }
.lm-float-window .lw-presence-section.is-friend .lw-presence-title { color: rgba(110, 230, 170, 0.9); }
.lm-float-window .lw-presence-count {
  min-width: 18px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--lw-muted);
  font: 700 10px/1.4 var(--lw-mono);
  text-align: center;
}
.lm-float-window .lw-presence-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(196, 205, 255, 0.3) transparent;
}
.lm-float-window .lw-presence-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  max-width: min(260px, 72vw);
  padding: 4px 10px 4px 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
}
.lm-float-window .lw-presence-chip.is-room {
  border-color: rgba(84, 160, 255, 0.28);
  background: rgba(84, 160, 255, 0.1);
}
.lm-float-window .lw-presence-chip.is-friend {
  border-color: rgba(38, 222, 129, 0.28);
  background: rgba(38, 222, 129, 0.1);
  max-width: min(320px, 80vw);
}
.lm-float-window .lw-presence-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
}
.lm-float-window .lw-presence-avatar.is-blank {
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: rgba(220, 225, 255, 0.75);
}
.lm-float-window .lw-presence-name {
  font-size: 11.5px;
  font-weight: 650;
  color: var(--lw-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.lm-float-window .lw-presence-chip.is-room .lw-presence-name { color: #9ec8ff; }
.lm-float-window .lw-presence-chip.is-friend .lw-presence-name { color: #7eecb4; }
.lm-float-window .lw-presence-meta {
  font: 500 10px/1 var(--lw-mono);
  color: rgba(180, 200, 255, 0.7);
  white-space: nowrap;
}
.lm-float-window .lw-presence-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.lm-float-window .lw-presence-sub {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  font: 500 9px/1.25 var(--lw-mono);
  color: rgba(150, 200, 175, 0.75);
}
.lm-float-window .lw-presence-room {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(190, 210, 200, 0.65);
}
.lm-float-window .lw-presence-chip .lw-pulse {
  margin-left: 2px;
}

.lm-float-window .lw-pulse {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #26de81;
  box-shadow: 0 0 6px #26de8199;
  animation: lw-pulse 2s ease-in-out infinite;
}
.lm-float-window .lw-presence-chip.is-room .lw-pulse {
  background: #54a0ff;
  box-shadow: 0 0 6px #54a0ff99;
}

@keyframes lw-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Day divider (logs list) ── */
.lm-float-window .lw-day {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 14px 8px;
  user-select: none;
}
.lm-float-window .lw-day-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(196, 205, 255, 0.28),
    transparent
  );
}
.lm-float-window .lw-day-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  flex: 0 0 auto;
  max-width: min(280px, 70%);
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(157, 173, 255, 0.22);
  background:
    radial-gradient(120% 140% at 50% -20%, rgba(142, 162, 255, 0.16), transparent 60%),
    rgba(20, 24, 40, 0.72);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
}
.lm-float-window .lw-day-rel {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c4cdff;
  line-height: 1.2;
}
.lm-float-window .lw-day-title {
  font-size: 10px;
  font-weight: 600;
  color: rgba(210, 216, 242, 0.78);
  text-transform: capitalize;
  text-align: center;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* log list */
.lm-float-window .lw-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 0;
  /* Match Luminus panel scrollbar (thin lumen thumb). */
  scrollbar-width: thin;
  scrollbar-color: rgba(196, 205, 255, 0.42) transparent;
}
.lm-float-window .lw-list::-webkit-scrollbar { width: 6px; }
.lm-float-window .lw-list::-webkit-scrollbar-track { background: transparent; }
.lm-float-window .lw-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(196, 205, 255, 0.48), rgba(142, 162, 255, 0.28));
  border-radius: 999px;
}
.lm-float-window .lw-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(210, 218, 255, 0.58), rgba(142, 162, 255, 0.4));
}

.lm-float-window .lw-empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  text-align: center;
  padding: 32px 24px;
  color: var(--luminus-ui-text-dim);
  font-size: 12px;
  line-height: 1.5;
}

.lm-float-window .lw-entry {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--lw-accent, transparent) 38%, var(--luminus-ui-border-soft));
  background: linear-gradient(90deg, color-mix(in srgb, var(--lw-accent, transparent) 12%, transparent), transparent 38%);
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
  background: rgba(255, 255, 255, 0.045);
}

.lm-float-window .lw-entry-time {
  font-size: 10px;
  font-family: var(--lw-mono);
  color: var(--lw-muted);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
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

@media (max-width: 560px) {
  .lm-float-window .lw-filterbar {
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .lm-float-window .lw-filterbar-gap { display: none; }
  .lm-float-window .lw-clear-btn { margin-left: auto; }
  .lm-float-window .lw-entry { gap: 8px; padding-inline: 10px; }
  .lm-float-window .lw-entry-avatar { width: 34px; }
  .lm-float-window .lw-entry-avatar img,
  .lm-float-window .lw-avatar-blank { width: 30px; height: 30px; }
  .lm-float-window .lw-entry-time { width: 100%; margin-left: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .lm-float-window .lw-pulse { animation: none !important; }
}

/* Touch adaptation: keep the dense desktop shell while enlarging controls for
   coarse pointers. */
@media (pointer: coarse) {
  #luminus-panel .lm-switch-root { width: 44px; height: 28px; border-radius: 14px; }
  #luminus-panel .lm-switch-thumb { width: 18px; height: 18px; top: 4px; left: 4px; }
  #luminus-panel .lm-switch-root[data-state="checked"] .lm-switch-thumb { transform: translateX(16px); }
  #luminus-panel button,
  .lm-float-window button { min-height: 44px; }
  #luminus-panel input,
  #luminus-panel textarea,
  .lm-float-window input,
  .lm-float-window textarea { font-size: 16px; }
  #luminus-panel .lm-btn-icon,
  #luminus-panel .lm-close,
  #luminus-panel .lm-back,
  #luminus-panel .lm-dpad-btn,
  .lm-float-window .lw-close { min-width: 44px; }
  .lm-float-window .lk-link-actions button { min-width: 44px; min-height: 44px; }
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
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--lw-border);
  transition: background 0.12s;
}

.lm-float-window .lk-entry:hover { background: var(--lw-plate); }

.lm-float-window .lk-entry-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.lm-float-window .lk-name {
  all: unset;
  display: inline-flex;
  align-items: center;
  min-width: 0;
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

.lm-float-window .luminus-profile-link {
  all: unset;
  display: inline;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-align: inherit;
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

/* Horizontal wrap: multi-link people stay one compact row-band, not a tall stack */
.lm-float-window .lk-links {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 5px;
  padding-left: 28px;
  min-width: 0;
}

.lm-float-window .lk-link-chip {
  display: flex;
  align-items: center;
  gap: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

.lm-float-window .lk-link-main {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(280px, 100%);
  font-family: var(--lw-mono);
  text-decoration: none;
  padding: 3px 4px 3px 8px;
  border-radius: 7px;
  background: rgba(142, 162, 255, 0.10);
  border: 1px solid rgba(142, 162, 255, 0.28);
  transition: background 0.15s, border-color 0.15s;
}

.lm-float-window .lk-link-main:hover {
  background: rgba(142, 162, 255, 0.2);
  border-color: rgba(142, 162, 255, 0.5);
}

.lm-float-window .lk-link-url {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 148px;
  font-size: 11px;
  color: #8ea2ff;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* trailing group inside the link pill: click count / last-click blocks + remove X */
.lm-float-window .lk-link-meta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* compact icon badges — click count / last-click time */
.lm-float-window .lk-meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  font-size: 9px;
  font-family: var(--lw-mono);
  color: var(--lw-muted);
  padding: 2px 5px;
  border-radius: 100px;
  background: var(--lw-plate);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lm-float-window .lk-meta-badge.lk-meta-shared {
  max-width: 96px;
}

.lm-float-window .lk-link-remove {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 5px;
  color: var(--lw-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.lm-float-window .lk-link-remove:hover { background: rgba(255, 107, 107, 0.14); color: #ff6b6b; }

/* Wider chips when the Links window itself is wide */
@media (min-width: 900px) {
  .lm-float-window .lk-link-main { max-width: min(320px, 100%); }
  .lm-float-window .lk-link-url { max-width: 180px; }
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Infostand injections (live inside Nitro's own DOM, outside #luminus-panel) Ã¢â€â‚¬Ã¢â€â‚¬ */

.luminus-motto-link {
  color: #8ea2ff;
  text-decoration: underline;
  cursor: pointer;
  pointer-events: auto !important;
}

.luminus-motto-link:hover { color: #c4cdff; }

.luminus-eye,
.luminus-person-link-icon,
.luminus-gender-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  flex-shrink: 0;
  pointer-events: auto !important;
}

.lm-float-window .lk-link-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  min-height: 32px;
  padding-inline: 2px;
}

.luminus-gender-icon {
  width: 11px;
  height: 11px;
  margin-left: 0;
  margin-right: 1px;
  line-height: 1;
}

.luminus-eye,
.luminus-person-link-icon { cursor: pointer; }

.luminus-gender-icon.gender-f { color: #ff8fc7; }
.luminus-gender-icon.gender-m { color: #8ea2ff; }
.luminus-gender-icon.is-bot { color: #9dadff; filter: drop-shadow(0 0 3px rgba(157, 173, 255, 0.28)); }
.luminus-gender-icon svg { display: block; width: 11px; height: 11px; }

.luminus-eye svg { display: block; filter: drop-shadow(0 0 3px rgba(38, 222, 129, 0.5)); }
.luminus-person-link-icon svg { display: block; }
.luminus-link-block-btn,
.lk-link-block {
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 5px;
  color: rgba(150, 155, 175, 0.72);
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}
.lk-link-block svg { display: block; }
.lk-link-block:hover {
  color: rgba(190, 195, 215, 0.95);
  background: rgba(255, 255, 255, 0.06);
}
.lk-link-block.is-active {
  color: #ff6b6b;
}
.lk-link-block.is-active:hover {
  color: #ff8f8f;
  background: rgba(255, 100, 100, 0.12);
}
.luminus-link-block-btn:hover { color: #ffb0b0; }

body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand {
    gap: 7px !important;
}

/* Keep the infostand glass stable while the page applies a global fade. */
body.luminus-ui-infostand.nitro-faded .nitro-infostand-container.luminus-user-infostand,
body.luminus-ui-infostand .nitro-infostand-container.luminus-user-infostand.fade-out {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
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

/* Furniture infostand: eye toggle next to the mobi name */
.luminus-furni-hide-eye {
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin-left: 4px;
  border-radius: 6px;
  color: rgba(157, 173, 255, 0.92);
  cursor: pointer;
  pointer-events: auto !important;
  transition: color 0.12s, background 0.12s, transform 0.08s;
}
.luminus-furni-hide-eye:hover {
  color: #fff;
  background: rgba(142, 162, 255, 0.18);
}
.luminus-furni-hide-eye:active {
  transform: scale(0.94);
}
.luminus-furni-hide-eye.is-hidden {
  color: rgba(255, 160, 160, 0.95);
}
.luminus-furni-hide-eye.is-hidden:hover {
  color: #ffc9c9;
  background: rgba(255, 100, 100, 0.14);
}
.luminus-furni-hide-eye svg {
  display: block;
}

/* Mobis chooser (:furnis) — eye before each row name */
.luminus-furni-chooser-eye {
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 5px;
  color: rgba(80, 100, 160, 0.95);
  cursor: pointer;
  pointer-events: auto !important;
  transition: color 0.12s, background 0.12s, transform 0.08s;
}
.luminus-furni-chooser-eye:hover {
  color: #3a4f9a;
  background: rgba(100, 120, 200, 0.14);
}
.luminus-furni-chooser-eye:active {
  transform: scale(0.94);
}
.luminus-furni-chooser-eye.is-hidden {
  color: rgba(200, 60, 60, 0.95);
}
.luminus-furni-chooser-eye.is-hidden:hover {
  color: #c0392b;
  background: rgba(220, 80, 80, 0.12);
}
.luminus-furni-chooser-eye svg {
  display: block;
}
/* Nitro chooser rows are dark/light alternating — keep contrast on dark themes too */
.nitro-furni-chooser-widget .furni-row .luminus-furni-chooser-eye {
  color: rgba(120, 140, 220, 0.95);
}
.nitro-furni-chooser-widget .furni-row .luminus-furni-chooser-eye.is-hidden {
  color: rgba(255, 120, 120, 0.95);
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

/* A visual with two colour channels renders two palettes in the lower pane.
   Keep the horizontal layout proportions, but make each swatch compact enough
   for two rows to remain visible instead of clipping the second channel. */
/* 27px + 27px + 4px gap fits the fractional ~60px palette viewport. */
body.luminus-wardrobe-stacked .nitro-avatar-editor:not(:has(.menu > :nth-child(5).active)) .content-area > .grid > .g-col-9 > .grid:has(> .g-col-5:nth-child(3) > .grid + .grid) > .g-col-5:nth-child(3) > .grid {
  --nitro-grid-column-min-height: 27px !important;
}

/* Enables/Handitems CSS lives in enablesHanditemsStyles.ts and is injected
   separately from the shared panel stylesheet. */

/* Changelog */

#luminus-changelog {
  --cl-bg: rgba(15, 17, 26, 0.95);
  --cl-plate: rgba(255, 255, 255, 0.045);
  --cl-border: rgba(255, 255, 255, 0.11);
  --cl-text: rgba(238, 241, 255, 0.95);
  --cl-dim: rgba(205, 211, 238, 0.76);
  --cl-muted: rgba(160, 167, 201, 0.62);
  --cl-lumen: #8ea2ff;
  --cl-lumen-bright: #c4cdff;
  width: min(620px, calc(100vw - 24px));
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
  padding: 26px 64px 23px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
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
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 440px;
  margin: 0;
  color: #f4f5ff;
  font-size: clamp(23px, 4vw, 29px);
  font-weight: 740;
  line-height: 1.08;
  letter-spacing: -0.03em;
}

#luminus-changelog h2 svg {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  color: var(--cl-lumen-bright);
  filter: drop-shadow(0 4px 8px rgba(142, 162, 255, 0.48));
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

#luminus-changelog .lm-changelog-layer + .lm-changelog-layer {
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

#luminus-changelog .lm-changelog-layer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

#luminus-changelog .lm-changelog-layer-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #c4cdff;
}

#luminus-changelog .lm-changelog-layer-ver {
  font-family: ui-monospace, "SF Mono", "Cascadia Code", monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--lm-muted, rgba(200, 205, 230, 0.65));
}

#luminus-changelog .lm-changelog-body {
  min-height: 0;
  padding: 23px 30px 25px;
  overflow-y: auto;
}

#luminus-changelog .lm-changelog-body section + section { margin-top: 28px; }

#luminus-changelog .lm-changelog-section > h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  color: var(--cl-dim);
  font-size: 11px;
  font-weight: 720;
  line-height: 1;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

#luminus-changelog .lm-changelog-section > h3::after {
  content: "";
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(90deg, rgba(196, 205, 255, 0.22), transparent);
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

#luminus-changelog .lm-changelog-section.is-new .lm-changelog-marker {
  color: #e9fffb;
  background: linear-gradient(145deg, rgba(116, 232, 211, 0.27), rgba(74, 167, 155, 0.12)), #151f24;
  border-color: rgba(116, 232, 211, 0.34);
}

#luminus-changelog .lm-changelog-section.is-fixed .lm-changelog-marker {
  color: #fff0f2;
  background: linear-gradient(145deg, rgba(238, 139, 157, 0.25), rgba(175, 77, 97, 0.11)), #21191f;
  border-color: rgba(238, 139, 157, 0.32);
}

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

#luminus-changelog .lm-changelog-item-content {
  min-width: 0;
}

#luminus-changelog .lm-changelog-visual {
  margin: 12px 0 2px;
}

#luminus-changelog .lm-changelog-visual figcaption {
  grid-column: 1 / -1;
  margin-top: 8px;
  color: var(--cl-muted);
  font-size: 10px;
  line-height: 1.45;
}

#luminus-changelog .lm-changelog-image {
  overflow: hidden;
  background: rgba(7, 9, 16, 0.42);
  border-radius: 13px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 12px 30px rgba(0, 0, 0, 0.22);
}

#luminus-changelog .lm-changelog-image img {
  display: block;
  width: 100%;
  max-height: 290px;
  object-fit: contain;
}

#luminus-changelog .lm-changelog-image figcaption {
  padding: 0 12px 10px;
}

#luminus-changelog .lm-changelog-image-fallback {
  display: grid;
  place-items: center;
  gap: 7px;
  min-height: 126px;
  color: var(--cl-muted);
  font-size: 11px;
}

#luminus-changelog .lm-changelog-image-fallback svg {
  width: 21px;
  height: 21px;
}

#luminus-changelog .lm-changelog-comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;
}

#luminus-changelog .lm-changelog-compare-frame {
  min-width: 0;
  padding: 12px;
  background: rgba(255, 255, 255, 0.035);
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.075);
}

#luminus-changelog .lm-changelog-compare-frame.is-after {
  background: rgba(142, 162, 255, 0.09);
  box-shadow: inset 0 0 0 1px rgba(196, 205, 255, 0.18);
}

#luminus-changelog .lm-changelog-compare-frame > span {
  display: block;
  margin-bottom: 5px;
  color: var(--cl-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

#luminus-changelog .lm-changelog-compare-frame strong {
  display: block;
  color: var(--cl-text);
  font-size: 11px;
  line-height: 1.35;
}

#luminus-changelog .lm-changelog-compare-frame p {
  margin-top: 4px;
  color: var(--cl-muted);
  font-size: 10px;
  line-height: 1.45;
}

#luminus-changelog .lm-changelog-compare-arrow {
  align-self: center;
  width: 16px;
  height: 16px;
  color: var(--cl-lumen-bright);
}

#luminus-changelog .lm-changelog-demo {
  position: relative;
  overflow: hidden;
  padding: 13px;
  background:
    radial-gradient(80% 120% at 100% 0%, rgba(142, 162, 255, 0.13), transparent 58%),
    rgba(7, 9, 16, 0.48);
  border-radius: 13px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.09),
    0 12px 28px rgba(0, 0, 0, 0.18);
}

#luminus-changelog .lm-changelog-demo-head {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
}

#luminus-changelog .lm-changelog-demo-signal {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  background: #9fb0ff;
  border-radius: 50%;
  box-shadow: 0 3px 10px rgba(142, 162, 255, 0.56);
}

#luminus-changelog .lm-changelog-demo-head strong {
  display: block;
  color: var(--cl-text);
  font-size: 11px;
}

#luminus-changelog .lm-changelog-demo-head p {
  margin-top: 3px;
  color: var(--cl-muted);
  font-size: 10px;
}

#luminus-changelog .lm-changelog-demo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

#luminus-changelog .lm-changelog-demo-badges span {
  padding: 4px 7px;
  color: var(--cl-dim);
  background: rgba(255, 255, 255, 0.055);
  border-radius: 6px;
  font-size: 9px;
  font-weight: 650;
}

#luminus-changelog .lm-changelog-demo-rows {
  display: grid;
  gap: 7px;
  margin: 11px 0 0;
}

#luminus-changelog .lm-changelog-demo-rows > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-top: 7px;
  border-top: 1px solid rgba(255, 255, 255, 0.065);
}

#luminus-changelog .lm-changelog-demo-rows dt,
#luminus-changelog .lm-changelog-demo-rows dd {
  margin: 0;
  font-size: 10px;
}

#luminus-changelog .lm-changelog-demo-rows dt { color: var(--cl-muted); }
#luminus-changelog .lm-changelog-demo-rows dd { color: var(--cl-text); font-weight: 650; text-align: right; }

#luminus-changelog .lm-changelog-demo-action {
  display: inline-flex;
  margin-top: 11px;
  padding: 6px 9px;
  color: #161a2e;
  background: #c4cdff;
  border-radius: 7px;
  box-shadow: 0 5px 14px rgba(89, 107, 196, 0.24);
  font-size: 9px;
  font-weight: 750;
}

#luminus-changelog .lm-changelog-details {
  margin-top: 9px;
}

#luminus-changelog .lm-changelog-details summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--cl-lumen-bright);
  font-size: 10px;
  font-weight: 650;
  cursor: pointer;
  list-style: none;
}

#luminus-changelog .lm-changelog-details summary::-webkit-details-marker { display: none; }
#luminus-changelog .lm-changelog-details summary svg { width: 13px; height: 13px; transition: transform 0.16s ease-out; }
#luminus-changelog .lm-changelog-details[open] summary svg { transform: rotate(180deg); }

#luminus-changelog .lm-changelog-details ul {
  display: grid;
  gap: 6px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}

#luminus-changelog .lm-changelog-details li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 6px;
  color: var(--cl-dim);
  font-size: 10px;
  line-height: 1.45;
}

#luminus-changelog .lm-changelog-details li svg {
  width: 12px;
  height: 12px;
  margin-top: 1px;
  color: var(--cl-lumen-bright);
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
  #luminus-changelog .lm-changelog-header { padding: 24px 56px 20px 22px; }
  #luminus-changelog .lm-changelog-body { padding: 20px 22px 22px; }
  #luminus-changelog .lm-changelog-comparison {
    grid-template-columns: minmax(0, 1fr);
  }
  #luminus-changelog .lm-changelog-compare-arrow {
    justify-self: center;
    transform: rotate(90deg);
  }
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

/* Guarda-Roupa: ações de cópia/importação ficam no fim da barra nativa do Nitro. */
.nitro-avatar-editor .menu {
  display: flex;
  align-items: stretch;
}

.luminus-wardrobe-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  gap: 4px;
  margin-left: auto;
  padding-left: 6px;
}

.luminus-wardrobe-action {
  appearance: none;
  min-width: 58px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 5px;
  color: #e8ebff;
  background: rgba(20, 24, 45, 0.72);
  font: 600 11px/1 sans-serif;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}

.luminus-wardrobe-action:hover {
  border-color: rgba(174, 187, 255, 0.6);
  background: rgba(74, 88, 160, 0.72);
}

.luminus-wardrobe-action:disabled { opacity: 0.55; cursor: wait; }

.luminus-wardrobe-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 3;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1px solid rgba(255, 190, 198, 0.5);
  border-radius: 50%;
  color: #ffd7dc;
  background: rgba(31, 18, 28, 0.82);
  cursor: pointer;
  user-select: none;
}

.luminus-wardrobe-delete svg {
  display: block;
  width: 12px;
  height: 12px;
  overflow: visible;
  pointer-events: none;
}

.luminus-wardrobe-delete path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.luminus-wardrobe-delete:hover {
  color: #fff;
  background: rgba(151, 55, 74, 0.72);
}

.luminus-wardrobe-delete[data-busy="true"] {
  opacity: 0.55;
  cursor: wait;
  pointer-events: none;
}

.nitro-avatar-editor-wardrobe-figure-preview.luminus-wardrobe-empty .avatar-image {
  visibility: hidden;
}

.luminus-wardrobe-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(7, 9, 18, 0.68);
}

.luminus-wardrobe-dialog {
  width: min(390px, 100%);
  padding: 20px;
  border: 1px solid rgba(184, 195, 255, 0.28);
  border-radius: 10px;
  color: #eef0ff;
  background: #20243a;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.5);
  font-size: 13px;
}

.luminus-wardrobe-dialog h2 { margin: 0 0 8px; font-size: 16px; }
.luminus-wardrobe-dialog p { margin: 0 0 16px; color: rgba(232, 235, 255, 0.72); line-height: 1.4; }

.luminus-wardrobe-dialog-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #e8ebff;
  line-height: 1.35;
  cursor: pointer;
}

.luminus-wardrobe-dialog-option input { margin-top: 2px; accent-color: #9caeff; }

.luminus-wardrobe-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.luminus-wardrobe-dialog-actions button {
  min-width: 78px;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  color: #e8ebff;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.luminus-wardrobe-dialog-actions [data-confirm] {
  color: #15182a;
  background: #abb9ff;
  border-color: transparent;
  font-weight: 700;
}
`;
