export const WHISPER_BETA_STYLES = `
.luminus-chat-beta-trigger { position: relative; }
.luminus-chat-beta-badge {
  position: absolute;
  top: -5px;
  right: -7px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  background: #ef6f78;
  color: #fff;
  font: 800 8px/14px -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  text-align: center;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.48);
  pointer-events: none;
}

/* Chat Beta */
#luminus-chat-beta {
  --cb-panel: var(--luminus-ui-surface);
  --cb-sidebar: color-mix(in srgb, var(--luminus-ui-surface) 92%, #000);
  --cb-thread: color-mix(in srgb, var(--luminus-ui-surface) 94%, #fff);
  --cb-hover: var(--luminus-ui-surface-hover);
  --cb-active: var(--luminus-ui-surface-active);
  --cb-accent: var(--luminus-ui-accent);
  --cb-green: #55d6a0;
  --cb-amber: #f2bb66;
  --cb-danger: #ff7f87;
  --cb-border: var(--luminus-ui-border);
  /* No artificial max-width — may use the full Nitro-safe stage. */
  min-width: min(680px, 100%);
  min-height: min(420px, var(--lm-safe-height, 100dvh));
  max-width: none;
  max-height: var(--lm-safe-height, calc(100dvh - 16px));
  border-radius: 8px;
  background: var(--cb-panel);
}

#luminus-chat-beta *,
#luminus-chat-beta *::before,
#luminus-chat-beta *::after { box-sizing: border-box; }

#luminus-chat-beta button,
#luminus-chat-beta input,
#luminus-chat-beta textarea { font: inherit; letter-spacing: 0; }

#luminus-chat-beta button { color: inherit; }

#luminus-chat-beta .cb-titlebar {
  display: flex;
  height: 46px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid var(--cb-border);
  background: rgba(11, 13, 18, 0.72);
  cursor: grab;
  user-select: none;
}

#luminus-chat-beta .cb-brand,
#luminus-chat-beta .cb-brand > span,
#luminus-chat-beta .cb-title-actions,
#luminus-chat-beta .cb-thread-actions {
  display: flex;
  align-items: center;
}

#luminus-chat-beta .cb-brand { gap: 9px; }
#luminus-chat-beta .cb-brand > span:last-child { gap: 7px; }
#luminus-chat-beta .cb-brand strong { font-size: 13px; }
#luminus-chat-beta .cb-brand small {
  padding: 2px 5px;
  border: 1px solid rgba(242, 187, 102, 0.28);
  border-radius: 4px;
  color: var(--cb-amber);
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}

#luminus-chat-beta .cb-brand > .cb-brand-mark {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 6px;
  background: rgba(157, 173, 255, 0.13);
  color: var(--cb-accent);
}

#luminus-chat-beta .cb-brand-mark svg { display: block; width: 15px; height: 15px; }
#luminus-chat-beta .cb-title-actions,
#luminus-chat-beta .cb-thread-actions { gap: 2px; }

#luminus-chat-beta .cb-title-actions button,
#luminus-chat-beta .cb-thread-actions button,
#luminus-chat-beta .cb-mobile-back,
#luminus-chat-beta .cb-row-menu,
#luminus-chat-beta .cb-message-menu,
#luminus-chat-beta .cb-dialog-head button {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(200, 205, 225, 0.72);
  cursor: pointer;
}

#luminus-chat-beta .cb-title-actions button:hover,
#luminus-chat-beta .cb-thread-actions button:hover,
#luminus-chat-beta .cb-mobile-back:hover,
#luminus-chat-beta .cb-row-menu:hover,
#luminus-chat-beta .cb-message-menu:hover,
#luminus-chat-beta .cb-dialog-head button:hover {
  background: var(--cb-hover);
  color: #fff;
}

#luminus-chat-beta .cb-thread-actions button.is-active,
#luminus-chat-beta .cb-title-actions button.is-active {
  background: rgba(85, 214, 160, 0.12);
  color: var(--cb-green);
}

#luminus-chat-beta .cb-title-actions svg,
#luminus-chat-beta .cb-thread-actions svg,
#luminus-chat-beta .cb-mobile-back svg,
#luminus-chat-beta .cb-row-menu svg,
#luminus-chat-beta .cb-message-menu svg,
#luminus-chat-beta .cb-dialog-head svg { width: 16px; height: 16px; }

#luminus-chat-beta .cb-layout {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 320px minmax(0, 1fr);
}

#luminus-chat-beta .cb-sidebar {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid var(--cb-border);
  background: var(--cb-sidebar);
}

#luminus-chat-beta .cb-sidebar-tools {
  display: flex;
  gap: 7px;
  padding: 10px 10px 8px;
}

#luminus-chat-beta .cb-search {
  display: flex;
  min-width: 0;
  height: 34px;
  flex: 1;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.035);
}

#luminus-chat-beta .cb-search:focus-within {
  border-color: rgba(157, 173, 255, 0.48);
  box-shadow: 0 0 0 2px rgba(157, 173, 255, 0.08);
}

#luminus-chat-beta .cb-search svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: rgba(166, 173, 199, 0.62);
}

#luminus-chat-beta .cb-search input,
#luminus-chat-beta .cb-group-name {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--lw-text);
  font-size: 12px;
}

#luminus-chat-beta .cb-search input::placeholder,
#luminus-chat-beta .cb-group-name::placeholder,
#luminus-chat-beta .cb-composer textarea::placeholder { color: rgba(147, 153, 177, 0.62); }

#luminus-chat-beta .cb-icon-primary,
#luminus-chat-beta .cb-send {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(157, 173, 255, 0.24);
  border-radius: 6px;
  background: rgba(157, 173, 255, 0.13);
  color: var(--cb-accent);
  cursor: pointer;
}

#luminus-chat-beta .cb-icon-primary:hover,
#luminus-chat-beta .cb-send:hover:not(:disabled) { background: rgba(157, 173, 255, 0.22); }
#luminus-chat-beta .cb-icon-primary svg,
#luminus-chat-beta .cb-send svg { width: 16px; height: 16px; }

#luminus-chat-beta .cb-filters {
  display: grid;
  gap: 3px;
  padding: 0 10px 9px;
  grid-template-columns: repeat(3, 1fr);
}

#luminus-chat-beta .cb-filters button,
#luminus-chat-beta .cb-mode-tabs button {
  min-width: 0;
  height: 27px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: rgba(170, 176, 199, 0.72);
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

#luminus-chat-beta .cb-filters button:hover,
#luminus-chat-beta .cb-mode-tabs button:hover { background: var(--cb-hover); color: var(--lw-text); }
#luminus-chat-beta .cb-filters button[data-state="on"],
#luminus-chat-beta .cb-mode-tabs button[data-state="active"] {
  border-color: rgba(157, 173, 255, 0.2);
  background: var(--cb-active);
  color: #dce2ff;
}

#luminus-chat-beta .cb-contact-scroll {
  min-height: 0;
  flex: 1;
}

#luminus-chat-beta .cb-contact-list {
  width: 100%;
  height: 100%;
  overscroll-behavior: contain;
}

#luminus-chat-beta .cb-contact-flow {
  width: 100%;
  min-width: 0;
  min-height: 100%;
}

#luminus-chat-beta .cb-ui-message-scroller-viewport,
#luminus-chat-beta .cb-selected-members,
#luminus-chat-beta .cb-contact-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(157, 173, 255, 0.34) transparent;
}

#luminus-chat-beta .cb-ui-message-scroller-viewport::-webkit-scrollbar,
#luminus-chat-beta .cb-selected-members::-webkit-scrollbar,
#luminus-chat-beta .cb-contact-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

#luminus-chat-beta .cb-ui-message-scroller-viewport::-webkit-scrollbar-track,
#luminus-chat-beta .cb-selected-members::-webkit-scrollbar-track,
#luminus-chat-beta .cb-contact-list::-webkit-scrollbar-track { background: transparent; }

#luminus-chat-beta .cb-ui-message-scroller-viewport::-webkit-scrollbar-thumb,
#luminus-chat-beta .cb-selected-members::-webkit-scrollbar-thumb,
#luminus-chat-beta .cb-contact-list::-webkit-scrollbar-thumb {
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(157, 173, 255, 0.34);
  background-clip: padding-box;
}

#luminus-chat-beta .cb-ui-message-scroller-viewport::-webkit-scrollbar-thumb:hover,
#luminus-chat-beta .cb-selected-members::-webkit-scrollbar-thumb:hover,
#luminus-chat-beta .cb-contact-list::-webkit-scrollbar-thumb:hover {
  background: rgba(174, 186, 255, 0.52);
  background-clip: padding-box;
}

#luminus-chat-beta .cb-ui-scroll-area {
  position: relative;
  min-width: 0;
  overflow: hidden;
}

#luminus-chat-beta .cb-ui-scroll-viewport {
  width: 100%;
  height: 100%;
}

#luminus-chat-beta .cb-ui-scroll-viewport > div {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

#luminus-chat-beta .cb-ui-scrollbar {
  z-index: 3;
  display: flex;
  width: 8px;
  padding: 2px;
  user-select: none;
  touch-action: none;
}

#luminus-chat-beta .cb-ui-scroll-thumb {
  position: relative;
  flex: 1;
  border-radius: 6px;
  background: rgba(157, 173, 255, 0.34);
}

#luminus-chat-beta .cb-ui-scroll-thumb:hover { background: rgba(174, 186, 255, 0.52); }
#luminus-chat-beta .cb-ui-scroll-corner { background: transparent; }

#luminus-chat-beta .cb-archive-row {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 11px;
  padding: 7px 13px;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.035);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

#luminus-chat-beta .cb-archive-row:hover { background: var(--cb-hover); }
#luminus-chat-beta .cb-archive-row > svg { width: 18px; height: 18px; color: var(--cb-amber); }
#luminus-chat-beta .cb-archive-row.is-back > svg { color: var(--cb-accent); }
#luminus-chat-beta .cb-archive-row span { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
#luminus-chat-beta .cb-archive-row strong { font-size: 11px; }
#luminus-chat-beta .cb-archive-row small { color: var(--lw-muted); font-size: 9px; }

#luminus-chat-beta .cb-contact {
  content-visibility: auto;
  contain-intrinsic-size: auto 62px;
  position: relative;
  display: flex;
  min-height: 62px;
  align-items: stretch;
  border-bottom: 1px solid rgba(255, 255, 255, 0.038);
}

#luminus-chat-beta .cb-contact:hover { background: var(--cb-hover); }
#luminus-chat-beta .cb-contact.is-active {
  background: var(--cb-active);
  box-shadow: inset 3px 0 0 var(--cb-accent);
}

#luminus-chat-beta .cb-room-contact {
  position: sticky;
  z-index: 3;
  top: 0;
  content-visibility: visible;
  border-bottom-color: rgba(157, 173, 255, 0.16);
  background: rgba(22, 25, 34, 0.98);
}
#luminus-chat-beta .cb-room-contact:hover { background: rgba(30, 34, 46, 0.98); }
#luminus-chat-beta .cb-room-contact.is-active { background: rgba(39, 45, 65, 0.98); }

#luminus-chat-beta .cb-contact-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 7px 29px 7px 10px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

#luminus-chat-beta .cb-contact-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

#luminus-chat-beta .cb-contact-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

#luminus-chat-beta .cb-contact-line strong {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: rgba(239, 242, 255, 0.94);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#luminus-chat-beta .cb-contact-line time {
  flex-shrink: 0;
  color: rgba(147, 153, 177, 0.65);
  font-size: 8px;
}

#luminus-chat-beta .cb-contact-line.is-preview > span:first-child {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: rgba(166, 172, 194, 0.72);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#luminus-chat-beta .is-typing { color: var(--cb-green) !important; }
#luminus-chat-beta .is-unverified { color: var(--cb-amber) !important; }
#luminus-chat-beta .cb-contact-indicators { display: flex; flex-shrink: 0; align-items: center; gap: 5px; }
#luminus-chat-beta .cb-contact-indicators svg { width: 10px; height: 10px; color: var(--cb-amber); }
#luminus-chat-beta .cb-contact-indicators b {
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ef6f78;
  color: #fff;
  font-size: 8px;
  line-height: 17px;
  text-align: center;
}

#luminus-chat-beta .cb-contact-indicators i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cb-accent);
}

#luminus-chat-beta .cb-row-menu {
  position: absolute;
  top: 16px;
  right: 4px;
  width: 26px;
  height: 26px;
  opacity: 0;
}

#luminus-chat-beta .cb-contact:hover .cb-row-menu,
#luminus-chat-beta .cb-row-menu:focus-visible { opacity: 1; }

#luminus-chat-beta .cb-avatar {
  position: relative;
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  background: rgba(157, 173, 255, 0.11);
  color: #dbe1ff;
  font-size: 14px;
  font-weight: 800;
}

#luminus-chat-beta .cb-avatar:not(.cb-group-avatar) > img,
#luminus-chat-beta .cb-group-head > img {
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  width: 200%;
  max-width: none;
  height: auto;
  transform: translate(-51%, -40%) scale(0.55);
}

#luminus-chat-beta .cb-avatar-pending {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

#luminus-chat-beta .cb-group-avatar { overflow: visible; }
#luminus-chat-beta .cb-group-avatar > .cb-group-head {
  position: absolute;
  width: 27px;
  height: 27px;
  overflow: hidden;
  border: 2px solid #181a21;
  border-radius: 50%;
  background: #20232d;
}
#luminus-chat-beta .cb-group-avatar > .cb-group-head:nth-child(1) { top: 0; left: 0; }
#luminus-chat-beta .cb-group-avatar > .cb-group-head:nth-child(2) { right: 0; bottom: 0; }
#luminus-chat-beta .cb-group-avatar > .cb-group-head:nth-child(3) { right: 0; top: -1px; width: 20px; height: 20px; }
#luminus-chat-beta .cb-group-avatar > svg { width: 19px; height: 19px; }
#luminus-chat-beta .cb-room-avatar {
  border-radius: 8px;
  border-color: rgba(157, 173, 255, 0.2);
  background: rgba(104, 123, 218, 0.18);
}
#luminus-chat-beta .cb-room-avatar > svg { width: 20px; height: 20px; color: #b9c4ff; }

#luminus-chat-beta .cb-list-empty,
#luminus-chat-beta .cb-message-empty {
  padding: 24px 18px;
  color: var(--lw-muted);
  font-size: 10px;
  line-height: 1.45;
  text-align: center;
}

#luminus-chat-beta .cb-thread {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--cb-thread);
}

#luminus-chat-beta .cb-thread-header {
  display: flex;
  height: 58px;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--cb-border);
  background: rgba(19, 21, 27, 0.92);
}

#luminus-chat-beta .cb-thread-person {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

#luminus-chat-beta .cb-thread-person:disabled { cursor: default; }
#luminus-chat-beta .cb-thread-person .cb-avatar { width: 38px; height: 38px; flex-basis: 38px; }
#luminus-chat-beta .cb-thread-person > span:last-child { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
#luminus-chat-beta .cb-thread-person > span:last-child { flex: 1; overflow: hidden; }
#luminus-chat-beta .cb-thread-actions { flex-shrink: 0; }
#luminus-chat-beta .cb-thread-person strong {
  overflow: hidden;
  color: rgba(241, 243, 255, 0.95);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#luminus-chat-beta .cb-thread-person small { color: var(--lw-muted); font-size: 9px; }
#luminus-chat-beta .cb-mobile-back { display: none; }

#luminus-chat-beta .cb-room-message-search,
#luminus-chat-beta .cb-thread-search {
  display: flex;
  width: min(245px, 42%);
  height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
}
#luminus-chat-beta .cb-thread-search {
  width: auto;
  flex: 0 0 auto;
  margin: 0 10px 0 0;
  align-self: stretch;
  height: 36px;
  margin: 0 12px 8px;
  width: auto;
  max-width: none;
}
#luminus-chat-beta .cb-room-message-search > svg,
#luminus-chat-beta .cb-thread-search > svg {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  color: rgba(180, 188, 220, 0.75);
}
#luminus-chat-beta .cb-room-message-search input,
#luminus-chat-beta .cb-thread-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: rgba(238, 241, 255, 0.95);
  caret-color: #c4cdff;
  font-size: 11px;
  -webkit-text-fill-color: rgba(238, 241, 255, 0.95);
}
#luminus-chat-beta .cb-room-message-search input::placeholder,
#luminus-chat-beta .cb-thread-search input::placeholder {
  color: rgba(160, 168, 200, 0.55);
  -webkit-text-fill-color: rgba(160, 168, 200, 0.55);
  opacity: 1;
}
#luminus-chat-beta .cb-room-message-search small,
#luminus-chat-beta .cb-thread-search small {
  color: var(--cb-accent);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
}
#luminus-chat-beta .cb-thread-search-clear {
  all: unset;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 4px;
  color: rgba(180, 188, 220, 0.7);
  cursor: pointer;
}
#luminus-chat-beta .cb-thread-search-clear:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
#luminus-chat-beta .cb-thread-search-clear svg { width: 12px; height: 12px; }

#luminus-chat-beta .cb-thread-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: var(--lw-muted);
  text-align: center;
}

#luminus-chat-beta .cb-thread-empty > svg { width: 30px; height: 30px; color: rgba(157, 173, 255, 0.42); }
#luminus-chat-beta .cb-thread-empty strong { color: rgba(222, 226, 243, 0.8); font-size: 12px; }
#luminus-chat-beta .cb-thread-empty span { font-size: 10px; }

#luminus-chat-beta .cb-messages {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

#luminus-chat-beta .cb-ui-message-scroller-viewport {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

#luminus-chat-beta .cb-message-flow {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  padding: 14px 18px 20px;
}

#luminus-chat-beta .cb-ui-message-scroller-item {
  min-width: 0;
  flex-shrink: 0;
  contain-intrinsic-size: auto 80px;
  content-visibility: auto;
}

#luminus-chat-beta .cb-ui-message-scroller-button {
  position: absolute;
  z-index: 4;
  right: 16px;
  bottom: 12px;
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(157, 173, 255, 0.25);
  border-radius: 50%;
  background: rgba(29, 32, 42, 0.96);
  color: var(--cb-accent);
  box-shadow: 0 7px 22px rgba(0, 0, 0, 0.36);
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
}

#luminus-chat-beta .cb-ui-message-scroller-button[data-active="false"] {
  pointer-events: none;
  opacity: 0;
  transform: translateY(5px);
}

#luminus-chat-beta .cb-ui-message-scroller-button svg { width: 14px; height: 14px; }

#luminus-chat-beta .cb-load-older {
  display: flex;
  height: 27px;
  align-items: center;
  gap: 5px;
  margin: 0 auto 11px;
  padding: 0 10px;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(190, 196, 218, 0.75);
  font-size: 9px;
  cursor: pointer;
}

#luminus-chat-beta .cb-load-older svg { width: 12px; height: 12px; }
#luminus-chat-beta .cb-legacy-notice {
  display: flex;
  width: min(430px, calc(100% - 16px));
  align-items: flex-start;
  gap: 8px;
  margin: 2px auto 9px;
  padding: 8px 10px;
  border: 1px solid rgba(242, 187, 102, 0.2);
  border-radius: 6px;
  background: rgba(242, 187, 102, 0.07);
  color: rgba(238, 209, 158, 0.9);
}
#luminus-chat-beta .cb-legacy-notice > svg {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  margin-top: 1px;
}
#luminus-chat-beta .cb-legacy-notice > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
#luminus-chat-beta .cb-legacy-notice strong { font-size: 9px; }
#luminus-chat-beta .cb-legacy-notice small {
  color: rgba(202, 188, 166, 0.76);
  font-size: 8px;
  line-height: 1.4;
}
#luminus-chat-beta .cb-day-separator {
  width: fit-content;
  margin: 9px auto 5px;
  padding: 3px 8px;
  border: 1px solid rgba(157, 173, 255, 0.13);
  border-radius: 5px;
  background: rgba(157, 173, 255, 0.06);
  color: rgba(190, 199, 239, 0.7);
  font-size: 8px;
  text-transform: capitalize;
}
#luminus-chat-beta .cb-ui-message-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  margin-top: 7px;
}

#luminus-chat-beta .cb-message {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: flex-end;
  gap: 9px;
}

#luminus-chat-beta .cb-message[data-align="end"] { flex-direction: row-reverse; }

#luminus-chat-beta .cb-ui-message-avatar {
  position: relative;
  z-index: 2;
  display: flex;
  width: 38px;
  height: auto;
  flex: 0 0 38px;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

#luminus-chat-beta .cb-ui-message-avatar.is-spacer { visibility: hidden; }
#luminus-chat-beta .cb-ui-message-avatar > .cb-avatar {
  position: absolute;
  top: 0;
  right: 0;
  width: 38px;
  height: 38px;
  flex-basis: 38px;
}

#luminus-chat-beta .cb-ui-message-content {
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

#luminus-chat-beta .cb-message[data-align="end"] > .cb-ui-message-content { align-items: flex-end; }
#luminus-chat-beta .cb-bubble {
  --cb-message-bg: rgba(255, 255, 255, 0.06);
  --cb-message-border: rgba(255, 255, 255, 0.08);
  position: relative;
  display: flex;
  width: fit-content;
  max-width: 78%;
  min-width: 0;
  flex-direction: column;
  /* Allow selecting/copying message text (parents use user-select: none). */
  user-select: text;
  -webkit-user-select: text;
}
#luminus-chat-beta .cb-bubble *,
#luminus-chat-beta .cb-bubble-body,
#luminus-chat-beta .cb-bubble-body p,
#luminus-chat-beta .cb-message-author-row,
#luminus-chat-beta .cb-message-author {
  user-select: text;
  -webkit-user-select: text;
}
/* Keep chrome controls non-selectable */
#luminus-chat-beta .cb-bubble .cb-message-menu,
#luminus-chat-beta .cb-bubble .cb-role-chip {
  user-select: none;
  -webkit-user-select: none;
}

#luminus-chat-beta .cb-bubble[data-align="end"] { align-self: flex-end; }

#luminus-chat-beta .cb-ui-bubble-content {
  position: relative;
  z-index: 1;
  display: flex;
  width: fit-content;
  max-width: 100%;
  min-width: 42px;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 7px 10px;
  overflow: hidden;
  border: 1px solid var(--cb-message-border);
  border-radius: 5px 14px 14px 5px;
  background: var(--cb-message-bg);
  overflow-wrap: anywhere;
}

#luminus-chat-beta .cb-message.is-start:not(.is-mine) .cb-ui-bubble-content {
  border-radius: 5px 14px 14px 5px;
}

#luminus-chat-beta .cb-message.is-mine .cb-bubble {
  --cb-message-bg: rgba(104, 123, 218, 0.2);
  --cb-message-border: rgba(157, 173, 255, 0.18);
}

#luminus-chat-beta .cb-message.is-mine .cb-ui-bubble-content {
  border-radius: 14px 5px 5px 14px;
}

#luminus-chat-beta .cb-message.is-start.is-mine .cb-ui-bubble-content {
  border-radius: 14px 14px 5px 14px;
}

#luminus-chat-beta .cb-message.is-end:not(.is-start).is-mine .cb-ui-bubble-content {
  border-radius: 14px 5px 14px 14px;
}

#luminus-chat-beta .cb-message.is-shout .cb-bubble p { font-weight: 700; }
#luminus-chat-beta .cb-message.is-whisper .cb-bubble {
  --cb-message-bg: rgba(85, 214, 160, 0.08);
  --cb-message-border: rgba(85, 214, 160, 0.2);
}

/* Room roles: bot / system / wired-as-self (SystemChatStyleEnum + unit type) */
#luminus-chat-beta .cb-message.is-bot .cb-bubble {
  --cb-message-bg: rgba(122, 142, 238, 0.1);
  --cb-message-border: rgba(122, 142, 238, 0.28);
}
#luminus-chat-beta .cb-message.is-system .cb-bubble {
  --cb-message-bg: rgba(242, 187, 102, 0.08);
  --cb-message-border: rgba(242, 187, 102, 0.22);
}
#luminus-chat-beta .cb-role-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--cb-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--cb-accent);
}
#luminus-chat-beta .cb-role-avatar.is-bot {
  color: #9dadff;
  background: rgba(122, 142, 238, 0.14);
  border-color: rgba(122, 142, 238, 0.3);
}
#luminus-chat-beta .cb-role-avatar.is-system {
  color: #f2bb66;
  background: rgba(242, 187, 102, 0.12);
  border-color: rgba(242, 187, 102, 0.28);
}
#luminus-chat-beta .cb-role-avatar svg { width: 18px; height: 18px; }
#luminus-chat-beta .cb-message-author-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin-bottom: 1px;
}
#luminus-chat-beta .cb-role-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--cb-border);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(200, 205, 230, 0.88);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.3;
}
#luminus-chat-beta .cb-role-chip svg { width: 10px; height: 10px; }
#luminus-chat-beta .cb-role-chip.is-bot {
  color: #b8c4ff;
  border-color: rgba(122, 142, 238, 0.35);
  background: rgba(122, 142, 238, 0.12);
}
#luminus-chat-beta .cb-role-chip.is-system {
  color: #f2d19a;
  border-color: rgba(242, 187, 102, 0.35);
  background: rgba(242, 187, 102, 0.1);
}
#luminus-chat-beta .cb-role-chip.is-whisper {
  color: #7ee0b4;
  border-color: rgba(85, 214, 160, 0.35);
  background: rgba(85, 214, 160, 0.1);
}
#luminus-chat-beta .cb-role-chip.is-shout {
  color: #ffb0b0;
  border-color: rgba(255, 127, 135, 0.35);
  background: rgba(255, 127, 135, 0.1);
}
#luminus-chat-beta .cb-message-author.is-bot { color: #9dadff; cursor: default; }
#luminus-chat-beta .cb-message-author.is-system { color: #f2bb66; cursor: default; }

#luminus-chat-beta .cb-message-author {
  display: block;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--cb-green);
  font-size: 9px;
  font-weight: 800;
  line-height: 1.25;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

#luminus-chat-beta .cb-message-author.is-local {
  color: var(--cb-accent);
  cursor: default;
}

#luminus-chat-beta .cb-message.is-start:not(.is-mine) .cb-message-author.is-expanded {
  min-width: max-content;
}

#luminus-chat-beta .cb-room-thread-header + .cb-messages .cb-message-author {
  display: inline-flex;
  width: fit-content;
  align-self: flex-start;
  margin-left: 0;
}

#luminus-chat-beta .cb-bubble-body {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  gap: 6px;
}

#luminus-chat-beta .cb-bubble-body p {
  min-width: 0;
  flex: 1;
  margin: 0;
  color: rgba(237, 240, 251, 0.9);
  font-size: 11px;
  line-height: 1.38;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
}

#luminus-chat-beta .cb-bubble time {
  flex: 0 0 auto;
  margin-bottom: 1px;
  color: rgba(163, 169, 190, 0.64);
  font-size: 7px;
  line-height: 1;
}

#luminus-chat-beta .cb-message-menu {
  position: absolute;
  top: 50%;
  right: -24px;
  width: 18px;
  height: 20px;
  border-radius: 4px;
  opacity: 0;
  transform: translateY(-50%);
}

#luminus-chat-beta .cb-message.is-mine .cb-message-menu { right: auto; left: -24px; }
#luminus-chat-beta .cb-message:hover .cb-message-menu,
#luminus-chat-beta .cb-message-menu:focus-visible,
#luminus-chat-beta .cb-message-menu[data-state="open"] { opacity: 1; }

#luminus-chat-beta .cb-click-event {
  display: block;
  margin: 8px auto;
  padding: 4px 9px;
  border: 1px solid rgba(242, 187, 102, 0.16);
  border-radius: 5px;
  background: rgba(242, 187, 102, 0.07);
  color: rgba(237, 203, 146, 0.84);
  font-size: 8px;
  cursor: pointer;
}

#luminus-chat-beta .cb-room-search-summary {
  width: fit-content;
  margin: 2px auto 7px;
  color: var(--lw-muted);
  font-size: 8px;
}

#luminus-chat-beta .cb-composer {
  display: flex;
  flex-shrink: 0;
  align-items: flex-end;
  gap: 8px;
  padding: 9px 11px;
  border-top: 1px solid var(--cb-border);
  background: rgba(14, 16, 21, 0.8);
}

#luminus-chat-beta .cb-composer textarea {
  min-width: 0;
  min-height: 34px;
  max-height: 92px;
  flex: 1;
  padding: 8px 10px;
  resize: none;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  outline: 0;
  background: rgba(255, 255, 255, 0.04);
  color: var(--lw-text);
  font-size: 11px;
  line-height: 16px;
}

#luminus-chat-beta .cb-composer textarea:focus { border-color: rgba(157, 173, 255, 0.45); }
#luminus-chat-beta .cb-composer textarea:disabled,
#luminus-chat-beta .cb-send:disabled { opacity: 0.45; cursor: not-allowed; }
#luminus-chat-beta .cb-error {
  padding: 0 12px 8px;
  background: rgba(14, 16, 21, 0.8);
  color: var(--cb-danger);
  font-size: 9px;
}

#luminus-chat-beta .cb-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 5;
  width: 16px;
  height: 16px;
  border-right: 2px solid rgba(255, 255, 255, 0.24);
  border-bottom: 2px solid rgba(255, 255, 255, 0.24);
  cursor: se-resize;
}

.luminus-chat-beta-menu {
  z-index: 1000004;
  display: flex;
  width: 230px;
  max-height: calc(100vh - 16px);
  padding: 5px;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 7px;
  background: rgba(21, 23, 30, 0.98);
  color: rgba(238, 241, 255, 0.92);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.52);
  scrollbar-width: thin;
  scrollbar-color: rgba(157, 173, 255, 0.34) transparent;
  transform-origin: var(--radix-dropdown-menu-content-transform-origin, var(--radix-context-menu-content-transform-origin));
}

.luminus-chat-beta-menu[data-state="open"] { animation: cb-menu-in 100ms ease-out; }
@keyframes cb-menu-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.luminus-chat-beta-menu::-webkit-scrollbar { width: 6px; }
.luminus-chat-beta-menu::-webkit-scrollbar-track { background: transparent; }
.luminus-chat-beta-menu::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: rgba(157, 173, 255, 0.34);
}

.luminus-chat-beta-menu [role="menuitem"] {
  display: flex;
  width: 100%;
  min-height: 31px;
  align-items: center;
  gap: 9px;
  padding: 5px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(225, 228, 241, 0.88);
  font-size: 10px;
  text-align: left;
  cursor: pointer;
  outline: 0;
  user-select: none;
}

.luminus-chat-beta-menu [role="menuitem"]:focus,
.luminus-chat-beta-menu [role="menuitem"][data-highlighted] { background: rgba(255, 255, 255, 0.055); color: #fff; }
.luminus-chat-beta-menu [role="menuitem"].is-danger { color: #ff7f87; }
.luminus-chat-beta-menu [role="menuitem"][data-disabled] { opacity: 0.4; pointer-events: none; }
.luminus-chat-beta-menu [role="menuitem"] svg { width: 14px; height: 14px; flex-shrink: 0; }
.luminus-chat-beta-menu .cb-menu-separator { height: 1px; margin: 4px 5px; background: rgba(255, 255, 255, 0.09); }

#luminus-chat-beta .cb-modal-backdrop {
  position: absolute;
  z-index: 1000003;
  inset: 46px 0 0;
  background: rgba(4, 5, 8, 0.68);
}

#luminus-chat-beta .cb-dialog {
  position: absolute;
  z-index: 1000004;
  top: calc(50% + 23px);
  left: 50%;
  display: flex;
  width: min(430px, calc(100vw - 36px));
  max-height: min(590px, calc(100% - 70px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #181a22;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.62);
  outline: 0;
  transform: translate(-50%, -50%);
}
/* Fixed height so the people list flex child can grow and scroll */
#luminus-chat-beta .cb-dialog.cb-new-dialog {
  height: min(520px, calc(100% - 70px));
  min-height: min(420px, calc(100% - 70px));
}

#luminus-chat-beta .cb-dialog[data-state="open"] { animation: cb-dialog-in 120ms ease-out; }
@keyframes cb-dialog-in {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

#luminus-chat-beta .cb-dialog-head {
  display: flex;
  height: 45px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid var(--cb-border);
}

#luminus-chat-beta .cb-dialog-head strong { font-size: 12px; }
#luminus-chat-beta .cb-new-tabs {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}
#luminus-chat-beta .cb-mode-tabs {
  display: grid;
  gap: 5px;
  padding: 10px 12px 6px;
  grid-template-columns: 1fr 1fr;
}

#luminus-chat-beta .cb-mode-tabs button {
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
#luminus-chat-beta .cb-mode-tabs svg {
  display: block;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
}
#luminus-chat-beta .cb-group-name {
  width: auto;
  height: 34px;
  margin: 2px 12px 6px;
  padding: 0 10px;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.035);
}
#luminus-chat-beta .cb-search.is-dialog { flex: 0 0 34px; margin: 6px 12px; flex-shrink: 0; }
/* People list fills remaining dialog space (parent has fixed height) and scrolls */
#luminus-chat-beta .cb-search-scroll {
  min-height: 200px;
  flex: 1 1 auto;
  overflow: hidden;
}
#luminus-chat-beta .cb-search-scroll.cb-ui-scroll-area {
  min-height: 200px;
  height: auto;
}
/* Native overflow list (nova conversa) — wheel/trackpad reliable */
#luminus-chat-beta .cb-search-scroll-native {
  min-height: 220px;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: rgba(157, 173, 255, 0.34) transparent;
}
#luminus-chat-beta .cb-search-scroll-native::-webkit-scrollbar { width: 8px; }
#luminus-chat-beta .cb-search-scroll-native::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background: rgba(157, 173, 255, 0.34);
}
#luminus-chat-beta .cb-ui-scroll-area.cb-search-scroll .cb-ui-scroll-viewport,
#luminus-chat-beta .cb-search-scroll .cb-ui-scroll-viewport {
  height: 100%;
  max-height: 100%;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  touch-action: pan-y;
}
#luminus-chat-beta .cb-search-results { padding: 3px 8px 10px; box-sizing: border-box; }
#luminus-chat-beta .cb-result-section h4 {
  margin: 9px 7px 4px;
  color: rgba(157, 173, 255, 0.78);
  font-size: 8px;
  text-transform: uppercase;
}

#luminus-chat-beta .cb-search-result {
  content-visibility: auto;
  contain-intrinsic-size: auto 50px;
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  gap: 9px;
  padding: 5px 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

#luminus-chat-beta .cb-search-result:hover,
#luminus-chat-beta .cb-search-result.is-selected { background: var(--cb-hover); }
#luminus-chat-beta .cb-search-result .cb-avatar {
  width: 37px;
  height: 37px;
  min-width: 37px;
  max-width: 37px;
  flex: 0 0 37px;
}
#luminus-chat-beta .cb-search-result .cb-avatar > img {
  display: block;
}
#luminus-chat-beta .cb-search-result > .cb-search-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
#luminus-chat-beta .cb-search-result strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
#luminus-chat-beta .cb-search-result small { color: var(--lw-muted); font-size: 8px; }
#luminus-chat-beta .cb-search-result > i {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  padding: 0;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cb-border);
  border-radius: 50%;
}
#luminus-chat-beta .cb-search-result.is-selected > i { border-color: var(--cb-green); background: rgba(85, 214, 160, 0.14); color: var(--cb-green); }
#luminus-chat-beta .cb-search-result > i svg {
  display: block;
  width: 11px;
  height: 11px;
  flex: 0 0 11px;
}
#luminus-chat-beta .cb-selected-members { display: flex; gap: 5px; padding: 3px 12px; overflow-x: auto; }
#luminus-chat-beta .cb-selected-members button {
  display: flex;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 0 7px;
  border: 1px solid rgba(85, 214, 160, 0.2);
  border-radius: 5px;
  background: rgba(85, 214, 160, 0.08);
  color: rgba(196, 238, 219, 0.9);
  font-size: 9px;
  cursor: pointer;
}
#luminus-chat-beta .cb-selected-members svg { width: 10px; height: 10px; }

#luminus-chat-beta .cb-dialog-actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 7px;
  padding: 10px 12px;
  border-top: 1px solid var(--cb-border);
}

#luminus-chat-beta .cb-dialog-actions button {
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(222, 226, 241, 0.84);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

#luminus-chat-beta .cb-dialog-actions button.is-primary {
  border-color: rgba(157, 173, 255, 0.28);
  background: rgba(157, 173, 255, 0.15);
  color: #dce2ff;
}
#luminus-chat-beta .cb-dialog-actions button.is-danger {
  border-color: rgba(255, 127, 135, 0.3);
  background: rgba(255, 127, 135, 0.12);
  color: #ffadb2;
}
#luminus-chat-beta .cb-dialog-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
#luminus-chat-beta .cb-confirm-dialog { width: min(360px, calc(100vw - 36px)); }
#luminus-chat-beta .cb-confirm-dialog p { margin: 0; padding: 16px 14px; color: rgba(203, 207, 225, 0.8); font-size: 10px; line-height: 1.5; }
#luminus-chat-beta .cb-rename-dialog label {
  display: flex;
  padding: 14px;
  flex-direction: column;
  gap: 7px;
  color: rgba(190, 195, 215, 0.75);
  font-size: 9px;
}
#luminus-chat-beta .cb-rename-dialog input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--cb-border);
  border-radius: 6px;
  outline: 0;
  background: rgba(255, 255, 255, 0.04);
  color: var(--lw-text);
}

#luminus-chat-beta .cb-member-scroll {
  min-height: 120px;
  max-height: 420px;
}

#luminus-chat-beta .cb-member-list {
  padding: 7px;
}

#luminus-chat-beta .cb-member-list > button {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  gap: 9px;
  padding: 5px 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

#luminus-chat-beta .cb-member-list > button:hover { background: var(--cb-hover); }
#luminus-chat-beta .cb-member-list .cb-avatar { width: 38px; height: 38px; flex-basis: 38px; }
#luminus-chat-beta .cb-member-list > button > span { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
#luminus-chat-beta .cb-member-list strong { font-size: 11px; }
#luminus-chat-beta .cb-member-list small { color: var(--lw-muted); font-size: 8px; }

#luminus-chat-beta :focus-visible {
  outline: 2px solid rgba(174, 186, 255, 0.85);
  outline-offset: 1px;
}

@media (max-width: 980px) and (min-width: 761px) {
  #luminus-chat-beta .cb-layout { grid-template-columns: minmax(260px, 38%) minmax(0, 1fr); }
  #luminus-chat-beta .cb-message-flow { padding-inline: 13px; }
  #luminus-chat-beta .cb-bubble { max-width: 84%; }
}

@media (max-width: 760px) {
  #luminus-chat-beta {
    inset: 52px 8px 8px !important;
    width: auto !important;
    height: auto !important;
    min-width: 0;
    min-height: 0;
  }
  #luminus-chat-beta .cb-layout { display: block; position: relative; }
  #luminus-chat-beta .cb-sidebar,
  #luminus-chat-beta .cb-thread { position: absolute; inset: 0; border-right: 0; }
  #luminus-chat-beta.is-list .cb-thread,
  #luminus-chat-beta.is-thread .cb-sidebar { display: none; }
  #luminus-chat-beta .cb-mobile-back { display: grid; }
  #luminus-chat-beta .cb-resize { display: none; }
  #luminus-chat-beta .cb-titlebar { padding-left: 10px; }
  #luminus-chat-beta .cb-sidebar-tools { padding-inline: 8px; }
  #luminus-chat-beta .cb-filters { padding-inline: 8px; }
  #luminus-chat-beta .cb-thread-header { padding-left: 6px; }
  #luminus-chat-beta .cb-thread-actions { gap: 0; }
  #luminus-chat-beta .cb-message-flow { padding: 11px 9px 18px; }
  #luminus-chat-beta .cb-bubble { max-width: 90%; }
  #luminus-chat-beta .cb-composer { gap: 6px; padding: 8px; }
  .luminus-chat-beta-menu { width: min(230px, calc(100vw - 16px)); }
}

@media (hover: none) {
  #luminus-chat-beta .cb-row-menu,
  #luminus-chat-beta .cb-message-menu { opacity: 0.72; }
}

@media (pointer: coarse) {
  #luminus-chat-beta button { min-height: 44px; }
  #luminus-chat-beta .cb-title-actions button,
  #luminus-chat-beta .cb-thread-actions button,
  #luminus-chat-beta .cb-mobile-back,
  #luminus-chat-beta .cb-row-menu,
  #luminus-chat-beta .cb-message-menu,
  #luminus-chat-beta .cb-dialog-head button { width: 44px; height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  .luminus-chat-beta-menu[data-state="open"],
  #luminus-chat-beta .cb-dialog[data-state="open"] { animation: none !important; }
}
`;
