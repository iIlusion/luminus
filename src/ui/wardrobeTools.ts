const WARDROBE_PREFIX = "LUMINUS_WARDROBE_V1:";
const ACTIONS_ATTR = "data-luminus-wardrobe-actions";
const SERVER_WARDROBE_LIMIT = 20;

type WardrobeTransport = {
  send: (header: number, values: unknown[]) => boolean;
};

type FigureDataLike = {
  constructor: new () => FigureDataLike;
  getFigureString?: () => string;
  loadAvatarData?: (figure: string, gender: string) => void;
  parseFigure?: (figure: string) => void;
};

type SavedSlot = [FigureDataLike | null, string?];
type EncodedSlot = [number, string, string];

type WardrobeProps = {
  figureData?: FigureDataLike;
  savedFigures: SavedSlot[];
  setSavedFigures: (figures: SavedSlot[]) => void;
};

type FiberLike = {
  return?: FiberLike | null;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
  memoizedProps?: unknown;
  pendingProps?: unknown;
};

let started = false;
let syncQueued = false;

function findReactFiber(element: Element): FiberLike | null {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber"));
  return key ? (element as unknown as Record<string, unknown>)[key] as FiberLike : null;
}

function isWardrobeProps(value: unknown): value is WardrobeProps {
  if (!value || typeof value !== "object") return false;
  const props = value as Record<string, unknown>;
  return Array.isArray(props.savedFigures) && typeof props.setSavedFigures === "function";
}

function getWardrobeProps(): WardrobeProps | null {
  const card = document.querySelector(".nitro-avatar-editor-wardrobe-figure-preview");
  let fiber = card ? findReactFiber(card) : null;
  while (fiber) {
    if (isWardrobeProps(fiber.memoizedProps)) return fiber.memoizedProps;
    if (isWardrobeProps(fiber.pendingProps)) return fiber.pendingProps;
    fiber = fiber.return ?? null;
  }
  return null;
}

function slotFigure(slot: SavedSlot | undefined): string {
  try {
    return String(slot?.[0]?.getFigureString?.() ?? "");
  } catch {
    return "";
  }
}

function slotGender(slot: SavedSlot | undefined): string {
  return typeof slot?.[1] === "string" && slot[1] ? slot[1] : "M";
}

function encodeSlots(slots: SavedSlot[]): string {
  const payload = {
    v: 1,
    s: slots.flatMap((slot, index) => {
      const figure = slotFigure(slot);
      return figure ? [[index, slotGender(slot), figure] satisfies EncodedSlot] : [];
    }),
  };
  return WARDROBE_PREFIX + JSON.stringify(payload);
}

function decodeSlots(raw: string): EncodedSlot[] {
  const text = raw.trim();
  const json = text.startsWith(WARDROBE_PREFIX) ? text.slice(WARDROBE_PREFIX.length) : text;
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") throw new Error("Formato invalido.");
  const data = parsed as { v?: unknown; s?: unknown };
  if (data.v !== 1 || !Array.isArray(data.s) || data.s.length > 200) {
    throw new Error("Codigo de guarda-roupa invalido.");
  }
  return data.s.flatMap((entry, position) => {
    if (!Array.isArray(entry)) throw new Error("Slot corrompido.");
    // Compatibilidade com o formato antigo [gender, figure].
    const legacy = typeof entry[0] === "string";
    const index = legacy ? position : entry[0];
    const genderValue = legacy ? entry[0] : entry[1];
    const figureValue = legacy ? entry[1] : entry[2];
    if (!Number.isInteger(index) || index < 0 || index > 199 || typeof genderValue !== "string" || typeof figureValue !== "string") {
      throw new Error("Slot corrompido.");
    }
    const gender = genderValue.trim().slice(0, 8) || "M";
    const figure = figureValue.trim();
    if (figure.length > 2000 || !/^[A-Za-z0-9_.-]*$/.test(figure)) {
      throw new Error("Visual invalido.");
    }
    return figure ? [[index, gender, figure] satisfies EncodedSlot] : [];
  });
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

async function readText(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return window.prompt("Cole aqui o código do guarda-roupa:") ?? "";
  }
}

function setButtonStatus(button: HTMLButtonElement, text: string): void {
  const original = button.dataset.luminusOriginalLabel ?? button.textContent ?? "";
  button.dataset.luminusOriginalLabel = original;
  button.textContent = text;
  window.setTimeout(() => {
    if (button.isConnected) button.textContent = original;
  }, 1800);
}

function showImportConfirmation(onConfirm: (freeOnly: boolean) => void): void {
  const overlay = document.createElement("div");
  overlay.className = "luminus-wardrobe-dialog-backdrop";
  overlay.innerHTML = `
    <div class="luminus-wardrobe-dialog" role="dialog" aria-modal="true" aria-labelledby="luminus-wardrobe-dialog-title">
      <h2 id="luminus-wardrobe-dialog-title">Importar guarda-roupa</h2>
      <p>Os visuais serão substituídos na mesma ordem e enviados ao servidor.</p>
      <label class="luminus-wardrobe-dialog-option">
        <input type="checkbox" data-free-only>
        <span>Colocar nos slots livres a partir do primeiro disponível</span>
      </label>
      <div class="luminus-wardrobe-dialog-actions">
        <button type="button" data-cancel>Cancelar</button>
        <button type="button" data-confirm>Importar</button>
      </div>
    </div>`;
  const close = () => overlay.remove();
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector<HTMLButtonElement>("[data-cancel]")?.addEventListener("click", close);
  overlay.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click", () => {
    const freeOnly = Boolean(overlay.querySelector<HTMLInputElement>("[data-free-only]")?.checked);
    close();
    onConfirm(freeOnly);
  });
  document.body.appendChild(overlay);
  overlay.querySelector<HTMLInputElement>("[data-free-only]")?.focus();
}

function makeSlot(template: FigureDataLike, figure: string, gender: string): SavedSlot {
  const next = new template.constructor();
  if (figure && typeof next.loadAvatarData === "function") next.loadAvatarData(figure, gender);
  else if (figure && typeof next.parseFigure === "function") next.parseFigure(figure);
  return [next, gender];
}

function persistSlots(api: WardrobeTransport, slots: EncodedSlot[]): void {
  if (slots.some(([index]) => index >= SERVER_WARDROBE_LIMIT)) {
    throw new Error(`O servidor suporta apenas ${SERVER_WARDROBE_LIMIT} slots de guarda-roupa.`);
  }
  const failed = slots.filter(([index, gender, figure]) => !api.send(800, [index + 1, figure, gender]));
  if (failed.length) throw new Error("Não foi possível enviar todos os visuais ao servidor.");
}

function applyImport(api: WardrobeTransport, encoded: EncodedSlot[], freeOnly: boolean): string {
  const props = getWardrobeProps();
  if (!props || !props.savedFigures.length) throw new Error("Abra o Guarda-Roupa e tente novamente.");
  const template = props.savedFigures.find((slot) => slot?.[0])?.[0] ?? props.figureData;
  if (!template) throw new Error("Não foi possível acessar os dados dos slots.");

  if (freeOnly) {
    const freeIndexes = props.savedFigures.slice(0, SERVER_WARDROBE_LIMIT)
      .map((slot, index) => slotFigure(slot) ? -1 : index)
      .filter((index) => index >= 0);
    const occupied = encoded.filter(([, , figure]) => figure);
    if (occupied.length > freeIndexes.length) throw new Error("Não há slots livres suficientes.");
    // Fill free slots from the first available position, preserving import order.
    const targetIndexes = freeIndexes.slice(0, occupied.length);
    const next = props.savedFigures.slice();
    const assigned = occupied.map(([, gender, figure], index) => {
      const target = targetIndexes[index];
      next[target] = makeSlot(template, figure, gender);
      return [target, gender, figure] satisfies EncodedSlot;
    });
    persistSlots(api, assigned);
    props.setSavedFigures(next);
    return "Adicionado!";
  }

  if (encoded.length > props.savedFigures.length) {
    throw new Error("O código tem mais slots do que este Guarda-Roupa suporta.");
  }
  const next = props.savedFigures.slice();
  encoded.forEach(([index, gender, figure]) => {
    if (index >= next.length) throw new Error("O codigo tem mais slots do que este Guarda-Roupa suporta.");
    next[index] = makeSlot(template, figure, gender || slotGender(next[index]));
  });
  persistSlots(api, encoded);
  props.setSavedFigures(next);
  return "Importado!";
}

function showError(button: HTMLButtonElement, error: unknown): void {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
  setButtonStatus(button, "Erro");
  window.setTimeout(() => window.alert(message), 0);
}

function createActions(menu: Element, api: WardrobeTransport): void {
  if (menu.querySelector(`[${ACTIONS_ATTR}]`)) return;
  const actions = document.createElement("div");
  actions.className = "luminus-wardrobe-actions";
  actions.setAttribute(ACTIONS_ATTR, "true");

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "luminus-wardrobe-action";
  exportButton.textContent = "Exportar";
  exportButton.title = "Copiar todos os visuais do guarda-roupa";
  exportButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const props = getWardrobeProps();
      if (!props) throw new Error("Abra o Guarda-Roupa e tente novamente.");
      await copyText(encodeSlots(props.savedFigures));
      setButtonStatus(exportButton, "Copiado!");
    } catch (error) {
      showError(exportButton, error);
    }
  });

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "luminus-wardrobe-action";
  importButton.textContent = "Importar";
  importButton.title = "Importar visuais para os slots";
  importButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    importButton.disabled = true;
    try {
      const raw = await readText();
      if (!raw.trim()) return;
      const encoded = decodeSlots(raw);
      showImportConfirmation((freeOnly) => {
        try {
          setButtonStatus(importButton, applyImport(api, encoded, freeOnly));
        } catch (error) {
          showError(importButton, error);
        }
      });
    } catch (error) {
      showError(importButton, error);
    } finally {
      importButton.disabled = false;
    }
  });

  // Append in this order so the actions read Importar → Exportar from left to right.
  actions.append(importButton, exportButton);
  menu.appendChild(actions);
}

function sync(api: WardrobeTransport): void {
  syncQueued = false;
  const menu = document.querySelector(".nitro-avatar-editor .menu");
  if (!menu) return;
  const tab = Array.from(menu.children).find((child) => child.textContent?.trim() === "Meu Guarda-Roupa");
  const active = Boolean(tab && (tab.classList.contains("active") || tab.querySelector(".active")));
  const actions = menu.querySelector(`[${ACTIONS_ATTR}]`);
  if (active) createActions(menu, api);
  else actions?.remove();
}

function scheduleSync(api: WardrobeTransport): void {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => sync(api));
}

export function initWardrobeTools(api: WardrobeTransport): void {
  if (started) return;
  started = true;
  const observer = new MutationObserver(() => scheduleSync(api));
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scheduleSync(api);
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
