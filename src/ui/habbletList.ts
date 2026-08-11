import type { LuminusApi } from "../ws/api";
import { getPeerExtensions, type DetectedExtension } from "../room/peerIdentify";

const WIDGET_SELECTOR = ".nitro-user-chooser-widget";
const ENHANCED_CLASS = "luminus-habblet-list-enhanced";
const CONTROL_CLASS = "luminus-habblet-controls";
const TOGGLE_CLASS = "luminus-habblet-filter-toggle";
const TAG_CLASS = "luminus-habblet-tags";
const URL_RE = /(?:https?:\/\/|www\.)|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i;

const EXTENSION_LABEL: Record<DetectedExtension, string> = {
  luminus: "Luminus",
  "presence-102": "Extensão 102",
  "presence-101": "Extensão 101",
};

type PageWindow = Window & { __luminusHabbletList?: boolean };
type FilterState = { gender: string; extension: string; links: string };
type RoomUnit = {
  index?: number;
  id?: number;
  name?: string;
  sex?: string;
  gender?: string;
  motto?: string;
};
type IndexedUnit = RoomUnit & { unitId?: number };
type UnitIndex = { byId: Map<number, IndexedUnit>; byName: Map<string, IndexedUnit> };

function units(api: LuminusApi): RoomUnit[] {
  const source = api.room.units;
  if (!source) return [];
  if (source instanceof Map) return [...source.values()] as RoomUnit[];
  return Array.isArray(source) ? source as RoomUnit[] : [];
}

function buildUnitIndex(api: LuminusApi): UnitIndex {
  const byId = new Map<number, IndexedUnit>();
  const byName = new Map<string, IndexedUnit>();
  for (const unit of units(api)) {
    const indexed = unit as IndexedUnit;
    indexed.unitId = unit.index ?? unit.id;
    if (unit.index != null) byId.set(unit.index, indexed);
    if (unit.id != null) byId.set(unit.id, indexed);
    if (unit.name) byName.set(unit.name, indexed);
  }
  return { byId, byName };
}

function findUnit(index: UnitIndex, name: string, idText: string): IndexedUnit | null {
  const id = Number(idText);
  return (Number.isFinite(id) ? index.byId.get(id) : undefined) ?? index.byName.get(name) ?? null;
}

function rowData(row: HTMLElement, index: UnitIndex) {
  const cells = [...row.querySelectorAll<HTMLElement>(".row-text")];
  const name = (cells[0]?.dataset.luminusName ?? cells[0]?.textContent ?? "").trim();
  const type = (cells[1]?.textContent ?? "").trim();
  const id = (cells[2]?.textContent ?? "").trim();
  const unit = findUnit(index, name, id);
  const unitId = unit?.unitId;
  const extensions = unitId == null ? [] : getPeerExtensions(unitId);
  const rawGender = String(unit?.sex ?? unit?.gender ?? "").toLowerCase();
  const gender = rawGender === "m" || rawGender === "male"
    ? "m"
    : rawGender === "f" || rawGender === "female" ? "f" : "unknown";
  return {
    name,
    type,
    id,
    gender,
    extensions,
    hasLink: URL_RE.test(String(unit?.motto ?? "")),
  };
}

function createSelect(
  document: Document,
  label: string,
  name: string,
  options: Array<[string, string]>,
): HTMLSelectElement {
  const wrapper = document.createElement("label");
  wrapper.className = "luminus-habblet-filter";
  const select = document.createElement("select");
  select.className = "form-select form-select-sm";
  select.dataset.luminusFilter = name;
  select.setAttribute("aria-label", label);
  for (const [value, text] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }
  wrapper.appendChild(select);
  return select;
}

function decorateRow(row: HTMLElement, data: ReturnType<typeof rowData>): void {
  row.classList.add("luminus-habblet-row");
  row.dataset.luminusGender = data.gender;
  row.dataset.luminusExtensions = data.extensions.join(",");
  row.dataset.luminusHasLink = data.hasLink ? "true" : "false";

  const nameCell = row.querySelector<HTMLElement>(".row-text");
  if (!nameCell || nameCell.querySelector(`.${TAG_CLASS}`)) return;
  nameCell.dataset.luminusName = data.name;
  const name = nameCell.ownerDocument.createElement("span");
  name.className = "luminus-habblet-name";
  name.textContent = data.name;
  const tags = nameCell.ownerDocument.createElement("span");
  tags.className = TAG_CLASS;
  const labels = [
    data.gender === "m" ? "M" : data.gender === "f" ? "F" : "",
    ...data.extensions.map(extension => EXTENSION_LABEL[extension]),
    data.hasLink ? "Link" : "",
  ].filter(Boolean);
  for (const label of labels) {
    const tag = nameCell.ownerDocument.createElement("span");
    tag.className = "luminus-habblet-tag";
    tag.textContent = label;
    tags.appendChild(tag);
  }
  nameCell.replaceChildren(name);
  if (labels.length) nameCell.appendChild(tags);
}

function readFilters(widget: HTMLElement): FilterState {
  const value = (name: keyof FilterState) =>
    widget.querySelector<HTMLSelectElement>(`[data-luminus-filter="${name}"]`)?.value ?? "all";
  return { gender: value("gender"), extension: value("extension"), links: value("links") };
}

function updateFilters(widget: HTMLElement, api: LuminusApi): void {
  const input = widget.querySelector<HTMLInputElement>("input.search-filter");
  const query = (input?.value ?? "").trim().toLocaleLowerCase();
  const filters = readFilters(widget);
  const index = buildUnitIndex(api);
  for (const row of widget.querySelectorAll<HTMLElement>(".user-row")) {
    const data = rowData(row, index);
    decorateRow(row, data);
    const text = `${data.name} ${data.type} ${data.id}`.toLocaleLowerCase();
    const visible = (!query || text.includes(query))
      && (filters.gender === "all" || data.gender === filters.gender)
      && (filters.extension === "all" || data.extensions.includes(filters.extension as DetectedExtension))
      && (filters.links === "all" || (filters.links === "links" ? data.hasLink : !data.hasLink));
    row.classList.toggle("luminus-filter-hidden", !visible);
  }

  const active = Object.values(filters).filter(value => value !== "all").length;
  const toggle = widget.querySelector<HTMLButtonElement>(`.${TOGGLE_CLASS}`);
  if (toggle) {
    toggle.textContent = active ? `Filtros (${active})` : "Filtros";
    toggle.classList.toggle("has-active", active > 0);
  }
  const rows = [...widget.querySelectorAll<HTMLElement>(".user-row")];
  const visibleRows = rows.filter(row => !row.classList.contains("luminus-filter-hidden"));
  const count = widget.querySelector<HTMLElement>(".luminus-habblet-result-count");
  if (count) count.textContent = `${visibleRows.length} resultado${visibleRows.length === 1 ? "" : "s"}`;
  const list = widget.querySelector<HTMLElement>(".content > .d-flex.overflow-auto");
  if (!list) return;
  let empty = list.querySelector<HTMLElement>(".luminus-habblet-empty");
  if (visibleRows.length) empty?.remove();
  else if (!empty) {
    empty = list.ownerDocument.createElement("div");
    empty.className = "luminus-habblet-empty";
    empty.textContent = "Nenhum Habblet encontrado";
    list.appendChild(empty);
  }
}

function enhanceWidget(widget: HTMLElement, api: LuminusApi): void {
  const content = widget.querySelector<HTMLElement>(":scope > .content-area");
  const nativeControls = content?.firstElementChild;
  if (!content || !(nativeControls instanceof HTMLElement)) return;

  widget.classList.add(ENHANCED_CLASS);
  nativeControls.classList.add("luminus-habblet-native-controls");
  const search = nativeControls.querySelector<HTMLInputElement>("input.search-filter");
  if (search) search.placeholder = "Buscar por nome ou ID";

  let controls = content.querySelector<HTMLElement>(`.${CONTROL_CLASS}`);
  if (!controls) {
    controls = content.ownerDocument.createElement("div");
    controls.className = CONTROL_CLASS;
    controls.append(
      createSelect(content.ownerDocument, "Filtrar por gênero", "gender", [["all", "Gênero: todos"], ["m", "Masculino"], ["f", "Feminino"], ["unknown", "Sem gênero"]]),
      createSelect(content.ownerDocument, "Filtrar por extensão", "extension", [["all", "Extensão: todas"], ["luminus", "Luminus"], ["presence-102", "Extensão 102"], ["presence-101", "Extensão 101"]]),
      createSelect(content.ownerDocument, "Filtrar por links", "links", [["all", "Links: todos"], ["links", "Com links"], ["no-links", "Sem links"]]),
    );
    const clear = content.ownerDocument.createElement("button");
    clear.type = "button";
    clear.className = "luminus-habblet-filter-clear";
    clear.textContent = "Limpar";
    clear.addEventListener("click", () => {
      controls?.querySelectorAll<HTMLSelectElement>("select").forEach(filter => { filter.value = "all"; });
      updateFilters(widget, api);
    });
    controls.appendChild(clear);
    content.insertBefore(controls, nativeControls.nextSibling);
  }

  let toggle = content.querySelector<HTMLButtonElement>(`.${TOGGLE_CLASS}`);
  if (!toggle) {
    toggle = content.ownerDocument.createElement("button");
    toggle.type = "button";
    toggle.className = TOGGLE_CLASS;
    toggle.textContent = "Filtros";
    toggle.setAttribute("aria-expanded", "false");
    controls.hidden = true;
    content.insertBefore(toggle, controls);
  }
  if (!content.querySelector(".luminus-habblet-result-count")) {
    const count = content.ownerDocument.createElement("div");
    count.className = "luminus-habblet-result-count";
    content.insertBefore(count, content.querySelector(".content"));
  }

  const update = () => updateFilters(widget, api);
  if (search && search.dataset.luminusBound !== "true") {
    search.dataset.luminusBound = "true";
    search.addEventListener("input", update);
  }
  if (controls.dataset.luminusBound !== "true") {
    controls.dataset.luminusBound = "true";
    controls.addEventListener("change", update);
  }
  if (toggle.dataset.luminusBound !== "true") {
    toggle.dataset.luminusBound = "true";
    toggle.addEventListener("click", () => {
      controls.hidden = !controls.hidden;
      toggle?.setAttribute("aria-expanded", String(!controls.hidden));
      toggle?.classList.toggle("is-open", !controls.hidden);
    });
  }
  update();
}

export function initHabbletList(api: LuminusApi, targetWindow: Window): void {
  const page = targetWindow as PageWindow;
  if (page.__luminusHabbletList) return;
  page.__luminusHabbletList = true;
  const document = page.document;
  let scheduled = false;
  const refresh = () => {
    scheduled = false;
    for (const widget of document.querySelectorAll<HTMLElement>(WIDGET_SELECTOR)) enhanceWidget(widget, api);
    for (const widget of document.querySelectorAll<HTMLElement>(`.${ENHANCED_CLASS}`)) updateFilters(widget, api);
  };
  const relevantNode = (node: Node): boolean => node instanceof Element && (
    node.matches(WIDGET_SELECTOR)
    || node.matches(".user-row")
    || !!node.querySelector(WIDGET_SELECTOR)
    || !!node.querySelector(".user-row")
    || !!node.closest(WIDGET_SELECTOR)
  );
  const observer = new MutationObserver(records => {
    if (!records.some(record => relevantNode(record.target)
      || [...record.addedNodes, ...record.removedNodes].some(relevantNode))) return;
    if (scheduled) return;
    scheduled = true;
    page.requestAnimationFrame(refresh);
  });
  const observeRoot = document.querySelector<HTMLElement>("#draggable-windows-container") ?? document.body;
  if (observeRoot) observer.observe(observeRoot, { childList: true, subtree: true });
  refresh();
}
