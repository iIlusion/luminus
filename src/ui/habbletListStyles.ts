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
  opacity: 0.66;
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
  background: #10131f !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 12px !important;
  color: #f5f7ff !important;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32) !important;
  font-family: "Ubuntu Custom", sans-serif !important;
}

body.luminus-ui-user-chooser .luminus-habblet-controls,
body.luminus-ui-user-chooser .luminus-habblet-filter-toggle {
  background: #171b2b !important;
  color: #d3daf4 !important;
}

body.luminus-ui-user-chooser .luminus-habblet-filter-toggle:hover,
body.luminus-ui-user-chooser .luminus-habblet-filter-toggle.is-open,
body.luminus-ui-user-chooser .luminus-habblet-filter-toggle.has-active,
body.luminus-ui-user-chooser .luminus-habblet-filter-clear:hover {
  background: rgba(142, 162, 255, 0.16) !important;
  color: #f5f7ff !important;
}

body.luminus-ui-user-chooser .luminus-habblet-controls select,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced input.search-filter,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced select.type-filter {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.07) !important;
  color: #f5f7ff !important;
  box-shadow: none !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .nitro-card-header,
body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content > .d-flex.flex-column:first-child {
  background: #171b2b !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .content {
  min-height: 0 !important;
  overflow: hidden !important;
  background: #0c0f19 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row {
  min-height: 34px;
  background: #0c0f19 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.055) !important;
  color: #f5f7ff !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row:nth-child(even) {
  background: #101522 !important;
}

body.luminus-ui-user-chooser .nitro-user-chooser-widget.luminus-habblet-list-enhanced .user-row:hover {
  background: rgba(142, 162, 255, 0.16) !important;
}

@media (max-width: 620px) {
  .luminus-habblet-native-controls,
  .luminus-habblet-controls { grid-template-columns: 1fr 1fr; }
  .luminus-habblet-native-controls .search-filter { grid-column: 1 / -1; }
}
`;
