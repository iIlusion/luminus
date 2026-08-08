/** Styles for the Luminus effects and handitems window. */
export const ENABLES_HANDITEMS_STYLES = `
/* ── Enables / Handitems window ─────────────────────────────── */
#luminus-enables-window {
  width: min(520px, calc(100vw - 24px), var(--lm-safe-width, 100vw));
  max-width: min(560px, calc(100vw - 16px), var(--lm-safe-width, 100vw));
  min-width: min(360px, calc(100vw - 16px));
  height: min(480px, var(--lm-safe-height, calc(100dvh - 80px)));
  max-height: min(520px, var(--lm-safe-height, calc(100dvh - 80px)));
  min-height: min(280px, var(--lm-safe-height, 280px));
}

#luminus-enables-window .lm-eh-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(196, 205, 255, 0.42) transparent !important;
  scrollbar-gutter: stable;
  padding: 10px 12px 14px;
}

#luminus-enables-window .lm-eh-body::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
}

#luminus-enables-window .lm-eh-body::-webkit-scrollbar-track,
#luminus-enables-window .lm-eh-body::-webkit-scrollbar-corner {
  background: transparent !important;
}

#luminus-enables-window .lm-eh-body::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(196, 205, 255, 0.48),
    rgba(142, 162, 255, 0.28)
  ) !important;
  border: 0 !important;
  border-radius: 999px !important;
}

#luminus-enables-window .lm-eh-body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(210, 218, 255, 0.58),
    rgba(142, 162, 255, 0.4)
  ) !important;
}

#luminus-enables-window .lm-eh-body::-webkit-scrollbar-button {
  display: none !important;
}

#luminus-enables-window .lm-eh-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 8px;
  justify-items: center;
}

#luminus-enables-window .lm-eh-card-shell {
  position: relative;
  width: 112px;
  height: 200px;
}

#luminus-enables-window .lm-eh-card {
  all: unset;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  /* Luminus glass plate; catalog planes are transparent so CSS owns the fill. */
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(142, 162, 255, 0.14), transparent 62%),
    radial-gradient(90% 70% at 100% 100%, rgba(196, 205, 255, 0.06), transparent 55%),
    rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  content-visibility: auto;
  contain-intrinsic-size: 112px 200px;
  isolation: isolate;
  transition: border-color 0.12s, background 0.12s, transform 0.12s, box-shadow 0.12s;
}

#luminus-enables-window .lm-eh-card-shell:hover .lm-eh-card {
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(142, 162, 255, 0.22), transparent 62%),
    radial-gradient(90% 70% at 100% 100%, rgba(196, 205, 255, 0.1), transparent 55%),
    rgba(142, 162, 255, 0.1);
  border-color: rgba(142, 162, 255, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 6px 18px rgba(0, 0, 0, 0.28);
  transform: translateY(-1px);
}

#luminus-enables-window .lm-eh-card:focus-visible {
  outline: 2px solid rgba(174, 188, 255, 0.95);
  outline-offset: 2px;
}

#luminus-enables-window .lm-eh-card.is-fav {
  border-color: rgba(245, 197, 66, 0.4);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(245, 197, 66, 0.12), transparent 60%),
    radial-gradient(90% 70% at 100% 100%, rgba(142, 162, 255, 0.08), transparent 55%),
    rgba(255, 255, 255, 0.05);
}

#luminus-enables-window .lm-eh-card-top {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 100%;
  padding: 3px 26px 3px 4px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 3px;
  pointer-events: none;
}

/* Full command visible for 3-4 digit ids (e.g. :handitem 1157). */
#luminus-enables-window .lm-eh-cmd {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 9px;
  line-height: 1.2;
  padding: 2px 4px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(238, 241, 255, 0.92);
  font-family: var(--lw-mono);
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: visible;
}

#luminus-enables-window .lm-eh-star {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  z-index: 6;
  right: 4px;
  top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: rgba(238, 241, 255, 0.75);
  background: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
}

#luminus-enables-window .lm-eh-card-shell:hover .lm-eh-star,
#luminus-enables-window .lm-eh-card-shell:focus-within .lm-eh-star,
#luminus-enables-window .lm-eh-star.is-active {
  opacity: 1;
}

#luminus-enables-window .lm-eh-star:hover {
  color: #f5c542;
  background: rgba(0, 0, 0, 0.55);
}

#luminus-enables-window .lm-eh-star:focus-visible,
#luminus-enables-window .lm-eh-thumb-retry:focus-visible {
  outline: 2px solid rgba(174, 188, 255, 0.95);
  outline-offset: 2px;
}

#luminus-enables-window .lm-eh-thumb {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  /* Keep the artwork clear of the compact name plate. */
  margin-bottom: 34px;
  background-color: transparent;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

#luminus-enables-window .lm-eh-thumb-stage {
  position: absolute;
  image-rendering: pixelated;
  pointer-events: none;
  user-select: none;
}

#luminus-enables-window .lm-eh-thumb-plane {
  position: absolute;
  display: block;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  pointer-events: none;
}

/* Skeleton: vertical heartbeat pulse (top → bottom), no icons */
#luminus-enables-window .lm-eh-thumb.is-loading,
#luminus-enables-window .lm-eh-thumb.is-idle {
  background-image: none !important;
  background: #0a0b10;
}

#luminus-enables-window .lm-eh-thumb.is-loading::before,
#luminus-enables-window .lm-eh-thumb.is-idle::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -40%;
  height: 45%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(142, 162, 255, 0.07) 35%,
    rgba(196, 205, 255, 0.22) 50%,
    rgba(142, 162, 255, 0.07) 65%,
    transparent 100%
  );
  transform: translateY(0);
  pointer-events: none;
}

#luminus-enables-window .lm-eh-card-shell.is-visible .lm-eh-thumb.is-loading::before,
#luminus-enables-window .lm-eh-card-shell.is-visible .lm-eh-thumb.is-idle::before {
  animation: lm-eh-skeleton-heartbeat 1.05s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

@keyframes lm-eh-skeleton-heartbeat {
  0% {
    transform: translateY(0);
    opacity: 0.35;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: translateY(315%);
    opacity: 0.2;
  }
}

#luminus-enables-window .lm-eh-thumb.is-error {
  background-image: none !important;
  background: rgba(255, 100, 120, 0.08);
  cursor: pointer;
}

#luminus-enables-window .lm-eh-thumb.is-unavailable {
  background: rgba(255, 255, 255, 0.025);
}

#luminus-enables-window .lm-eh-thumb-message {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  width: calc(100% - 20px);
  color: rgba(210, 216, 238, 0.62);
  font-size: 9px;
  line-height: 1.3;
  text-align: center;
}

#luminus-enables-window .lm-eh-thumb-retry {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  z-index: 7;
  left: 50%;
  top: 43%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: rgba(255, 175, 185, 0.95);
  background: rgba(22, 10, 14, 0.86);
  border: 1px solid rgba(255, 150, 165, 0.35);
  cursor: pointer;
}

#luminus-enables-window .lm-eh-thumb-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

#luminus-enables-window .lm-eh-remove-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
  color: rgba(255, 140, 160, 0.9);
  background: rgba(255, 100, 120, 0.12);
  border: 1px solid rgba(255, 140, 160, 0.35);
}

#luminus-enables-window .lm-eh-card.is-remove {
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 120, 140, 0.12), transparent 60%),
    rgba(255, 100, 120, 0.05);
  border-color: rgba(255, 140, 160, 0.22);
}

#luminus-enables-window .lm-eh-card-shell:hover .lm-eh-card.is-remove {
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 120, 140, 0.2), transparent 60%),
    rgba(255, 100, 120, 0.1);
  border-color: rgba(255, 140, 160, 0.45);
}

/* Compact two-line names; full text remains available in the title tooltip. */
#luminus-enables-window .lm-eh-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  padding: 5px 5px 4px;
  height: 34px;
  box-sizing: border-box;
  font-size: 10px;
  line-height: 1.25;
  text-align: center;
  color: var(--lw-text);
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.88) 0%,
    rgba(0, 0, 0, 0.72) 55%,
    transparent 100%
  );
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
`;
