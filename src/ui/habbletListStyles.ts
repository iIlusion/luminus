export const HABBLET_LIST_STYLES = `
.nitro-user-chooser-widget.luminus-habblet-list-enhanced .content-area {
  display: flex !important;
  min-height: 0 !important;
  gap: 8px !important;
  padding: 12px !important;
}

.luminus-habblet-native-controls,
.luminus-habblet-controls {
  display: grid !important;
  width: 100%;
  gap: 6px !important;
  align-items: center;
}

.luminus-habblet-native-controls {
  grid-template-columns: minmax(0, 1fr) clamp(118px, 30%, 150px);
}

.luminus-habblet-controls {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 8px;
  border-radius: 8px;
}

.luminus-habblet-controls[hidden] { display: none !important; }
.luminus-habblet-filter { min-width: 0; }

.luminus-habblet-filter-toggle,
.luminus-habblet-filter-clear {
  min-height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.045);
  color: inherit;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.luminus-habblet-filter-toggle {
  width: 100%;
  padding: 4px 8px;
  text-align: left;
}

.luminus-habblet-filter-clear {
  grid-column: 1 / -1;
  justify-self: end;
  min-height: 24px;
  padding: 3px 8px;
}

.luminus-habblet-controls select {
  width: 100%;
  min-width: 0;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 6px;
  appearance: auto;
}

.luminus-habblet-result-count {
  min-height: 16px;
  font-size: 10px;
  line-height: 16px;
  text-align: right;
}

.luminus-habblet-row.luminus-filter-hidden { display: none !important; }

.luminus-habblet-row .row-text:first-child {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.luminus-habblet-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.luminus-habblet-tags {
  display: inline-flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 3px;
  margin-left: auto;
}

.luminus-habblet-tag {
  display: inline-flex;
  min-height: 14px;
  align-items: center;
  padding: 1px 4px;
  border: 1px solid rgba(142, 162, 255, 0.28);
  border-radius: 4px;
  background: rgba(142, 162, 255, 0.12);
  color: #dfe5ff;
  font-size: 9px;
  line-height: 1.2;
  white-space: nowrap;
}

.luminus-habblet-empty {
  display: grid;
  min-height: 120px;
  place-items: center;
  padding: 20px;
  color: var(--luminus-ui-text-dim);
  font-size: 12px;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced {
  width: min(92vw, 460px) !important;
  min-width: 0 !important;
  height: min(76vh, 620px) !important;
  min-height: 360px !important;
  max-height: calc(100vh - 24px) !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--luminus-ui-surface) !important;
  border: 0 !important;
  border-radius: var(--luminus-ui-radius) !important;
  color: var(--luminus-ui-text) !important;
  box-shadow: var(--luminus-ui-shadow) !important;
  font-family: var(--luminus-ui-sans) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .nitro-card-header {
  border-top: 0 !important;
  box-shadow: none !important;
  min-height: 48px !important;
  padding: 10px 14px !important;
  background: var(--luminus-ui-surface-raised) !important;
  border-bottom: 1px solid rgba(196, 205, 255, 0.16) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .luminus-habblet-expand-toggle {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  margin-left: auto;
  padding: 4px 9px;
  border: 1px solid var(--luminus-ui-border-soft);
  border-radius: 7px;
  background: transparent;
  color: var(--luminus-ui-text-dim);
  font: 650 10px/1 var(--luminus-ui-sans);
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .luminus-habblet-expand-toggle:hover,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .luminus-habblet-expand-toggle[aria-expanded="true"] {
  border-color: rgba(196, 205, 255, 0.34);
  background: rgba(142, 162, 255, 0.12);
  color: var(--luminus-ui-text);
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .luminus-habblet-expand-toggle:focus-visible {
  outline: 2px solid var(--luminus-ui-accent);
  outline-offset: 2px;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .nitro-card-header-text {
  color: var(--luminus-ui-text) !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.2 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
}

body.luminus-ui-user-chooser .luminus-habblet-controls,
body.luminus-ui-user-chooser .luminus-habblet-filter-toggle {
  background: var(--luminus-ui-surface-raised) !important;
  color: var(--luminus-ui-text-dim) !important;
}

body.luminus-ui-user-chooser .luminus-habblet-controls {
  border: 1px solid var(--luminus-ui-border-soft) !important;
  border-radius: var(--luminus-ui-radius-sm) !important;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-toggle:hover,
body.luminus-ui-user-chooser .luminus-habblet-filter-toggle.is-open,
body.luminus-ui-user-chooser .luminus-habblet-filter-toggle.has-active,
body.luminus-ui-user-chooser .luminus-habblet-filter-clear:hover {
  background: rgba(142, 162, 255, 0.16) !important;
  color: var(--luminus-ui-text) !important;
}

body.luminus-ui-user-chooser .luminus-habblet-controls select,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced input.search-filter,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced select.type-filter {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.07) !important;
  color: #f5f7ff !important;
  box-shadow: none !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced input.search-filter::placeholder {
  color: rgba(210, 216, 242, 0.72) !important;
  opacity: 1 !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content > .d-flex.flex-column:first-child {
  background: transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content > .d-flex.flex-column:first-child {
  padding: 0 8px !important;
  background: rgba(255, 255, 255, 0.035) !important;
  border-bottom-color: var(--luminus-ui-border-soft) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .text-black {
  color: var(--luminus-ui-text) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .column-text {
  color: var(--luminus-ui-muted) !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  line-height: 1.2 !important;
  text-transform: uppercase !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .column-text:nth-child(n + 2),
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .row-text:nth-child(n + 2) {
  text-align: center !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content {
  min-height: 0 !important;
  overflow: hidden !important;
  background: color-mix(in srgb, var(--luminus-ui-surface) 92%, #000) !important;
  border: 1px solid var(--luminus-ui-border-soft) !important;
  border-radius: var(--luminus-ui-radius-sm) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row {
  min-height: 34px;
  background: color-mix(in srgb, var(--luminus-ui-surface) 92%, #000) !important;
  border-bottom: 1px solid var(--luminus-ui-border-soft) !important;
  color: var(--luminus-ui-text) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row > .text-black,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .row-text {
  color: var(--luminus-ui-text) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row > .text-black {
  padding: 4px 8px !important;
  background: transparent !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .row-text:first-child {
  font-weight: 650 !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .row-text:nth-child(n + 2) {
  color: var(--luminus-ui-text-dim) !important;
  font-size: 12px !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row {
  transition: background 140ms ease, box-shadow 140ms ease !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row:focus-within {
  position: relative;
  z-index: 1;
  outline: 2px solid rgba(142, 162, 255, 0.72) !important;
  outline-offset: -2px;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .luminus-habblet-name {
  color: inherit !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content > .d-flex.overflow-auto {
  scrollbar-color: rgba(196, 205, 255, 0.38) transparent;
  scrollbar-width: thin;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content > .d-flex.overflow-auto::-webkit-scrollbar {
  width: 7px;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content > .d-flex.overflow-auto::-webkit-scrollbar-thumb {
  background: rgba(196, 205, 255, 0.38);
  border-radius: 999px;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .search-filter,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .type-filter,
body.luminus-ui-user-chooser .luminus-habblet-controls select {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 34px !important;
  border-radius: 9px !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .search-filter:focus,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced select:focus {
  border-color: rgba(142, 162, 255, 0.72) !important;
  outline: 2px solid rgba(142, 162, 255, 0.42) !important;
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(142, 162, 255, 0.12) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced select option {
  background: #171b2b;
  color: #f5f7ff;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-toggle {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  border-radius: 9px;
  font-weight: 650;
  letter-spacing: 0.01em;
  text-align: left;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease !important;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-toggle::after {
  width: 6px;
  height: 6px;
  margin: -3px 2px 0 8px;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  content: "";
  opacity: 0.7;
  transform: rotate(45deg);
  transition: transform 140ms ease;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-toggle[aria-expanded="true"]::after {
  margin-top: 3px;
  transform: rotate(225deg);
}

body.luminus-ui-user-chooser .luminus-habblet-filter-toggle.has-active {
  border-color: rgba(142, 162, 255, 0.42) !important;
  box-shadow: 0 0 0 3px rgba(142, 162, 255, 0.08) !important;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-clear {
  color: var(--luminus-ui-text-dim) !important;
  font-weight: 650 !important;
  transition: border-color 140ms ease, color 140ms ease, opacity 140ms ease !important;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-clear:disabled {
  cursor: default;
  opacity: 0.42;
}

body.luminus-ui-user-chooser .luminus-habblet-result-count {
  color: var(--luminus-ui-muted) !important;
  font-size: 10px !important;
  font-weight: 650 !important;
  letter-spacing: 0.02em;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row:nth-child(even) {
  background: color-mix(in srgb, var(--luminus-ui-surface) 96%, #fff) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row:hover {
  background: rgba(142, 162, 255, 0.16) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced.luminus-habblet-list-expanded {
  width: min(94vw, 760px) !important;
  height: min(88vh, 820px) !important;
  max-height: calc(100vh - 24px) !important;
}

@media (max-width: 620px) {
  .luminus-habblet-native-controls,
  .luminus-habblet-controls { grid-template-columns: 1fr 1fr; }
  .luminus-habblet-native-controls .search-filter { grid-column: 1 / -1; }
}

@media (max-width: 420px) {
  .luminus-habblet-controls { grid-template-columns: 1fr; }
  .luminus-habblet-filter-clear { grid-column: 1; justify-self: stretch; }
}

@media (max-width: 620px) {
  body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced.luminus-habblet-list-expanded {
    width: calc(100vw - 16px) !important;
    height: calc(100vh - 16px) !important;
    max-height: calc(100vh - 16px) !important;
  }
}
`;
