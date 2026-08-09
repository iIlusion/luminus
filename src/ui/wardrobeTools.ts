const WARDROBE_PREFIX = "LUMINUS_WARDROBE_V1:";
const ACTIONS_ATTR = "data-luminus-wardrobe-actions";
const DELETE_ATTR = "data-luminus-wardrobe-delete";
const DELETE_ICON = `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.25 2.25 9.75 9.75M9.75 2.25 2.25 9.75" /></svg>`;
const SERVER_WARDROBE_LIMIT = 50;
const AVATAR_DELETED_PLACEHOLDER = {
  figure: "hd-180-97554.lg-12275-4008-1408",
  gender: "M",
} as const;
// The wardrobe endpoint applies flood control. Staying below 10 saves/second
// avoids silent drops when importing a full 50-slot code.
const WARDROBE_SAVE_INTERVAL_MS = 100;

type WardrobeTransport = {
  send: (header: number, values: unknown[]) => boolean;
};

type FigureDataLike = {
  getFigureString?: () => string;
  gender?: string;
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
const removedUseButtons = new WeakMap<HTMLElement, HTMLElement>();
const pendingEmptySlots = new Set<number>();
const deletingSlots = new Set<number>();
let deleteResyncTimer: number | undefined;
let deleteSyncInterval: number | undefined;

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

function setButtonStatus(button: HTMLElement, text: string): void {
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

function showDeleteConfirmation(index: number, onConfirm: () => void, onCancel: () => void): void {
  const overlay = document.createElement("div");
  overlay.className = "luminus-wardrobe-dialog-backdrop";
  overlay.innerHTML = `
    <div class="luminus-wardrobe-dialog" role="dialog" aria-modal="true" aria-labelledby="luminus-wardrobe-delete-title">
      <h2 id="luminus-wardrobe-delete-title">Excluir visual do slot ${index + 1}?</h2>
      <p>O visual original será substituído no servidor pelo placeholder padrão do Luminus. Isso exclui o visual original deste slot.</p>
      <p>O servidor não apaga o registro; ele guarda o placeholder. Sem o Luminus, o placeholder poderá aparecer como um avatar normal.</p>
      <div class="luminus-wardrobe-dialog-actions">
        <button type="button" data-cancel>Cancelar</button>
        <button type="button" data-confirm>Excluir visual</button>
      </div>
    </div>`;
  const close = () => overlay.remove();
  const cancel = () => { close(); onCancel(); };
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) cancel();
  });
  overlay.querySelector<HTMLButtonElement>("[data-cancel]")?.addEventListener("click", cancel);
  overlay.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click", () => {
    close();
    onConfirm();
  });
  document.body.appendChild(overlay);
  overlay.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
}

function normalizeSlots(slots: SavedSlot[]): SavedSlot[] {
  const next = slots.slice(0, SERVER_WARDROBE_LIMIT);
  for (let index = next.length; index < SERVER_WARDROBE_LIMIT; index += 1) next[index] = [null, "M"];
  return next;
}

async function persistSlots(api: WardrobeTransport, slots: EncodedSlot[]): Promise<void> {
  if (slots.some(([index]) => index >= SERVER_WARDROBE_LIMIT)) {
    throw new Error(`O servidor suporta apenas ${SERVER_WARDROBE_LIMIT} slots de guarda-roupa.`);
  }
  for (const [position, [index, gender, figure]] of slots.entries()) {
    if (!api.send(800, [index + 1, figure, gender])) {
      throw new Error("Não foi possível enviar todos os visuais ao servidor.");
    }
    if (position < slots.length - 1) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, WARDROBE_SAVE_INTERVAL_MS));
    }
  }
}

async function refreshWardrobe(api: WardrobeTransport): Promise<void> {
  // Nitro loads the 50-slot wardrobe in three server pages. Let Nitro rebuild
  // each FigureData instance instead of injecting synthetic objects into React.
  for (const page of [0, 1, 2]) {
    if (!api.send(2742, [page])) throw new Error("Não foi possível atualizar o guarda-roupa.");
    if (page < 2) await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  }
}

async function applyImport(api: WardrobeTransport, encoded: EncodedSlot[], freeOnly: boolean): Promise<string> {
  const props = getWardrobeProps();
  if (!props) throw new Error("Abra o Guarda-Roupa e tente novamente.");
  const current = normalizeSlots(props.savedFigures);

  if (freeOnly) {
    const freeIndexes = current
      .map((slot, index) => slotFigure(slot) ? -1 : index)
      .filter((index) => index >= 0);
    const occupied = encoded.filter(([, , figure]) => figure);
    if (occupied.length > freeIndexes.length) throw new Error("Não há slots livres suficientes.");
    // Fill free slots from the first available position, preserving import order.
    const targetIndexes = freeIndexes.slice(0, occupied.length);
    const assigned = occupied.map(([, gender, figure], index) => {
      const target = targetIndexes[index];
      return [target, gender, figure] satisfies EncodedSlot;
    });
    await persistSlots(api, assigned);
    await refreshWardrobe(api);
    scheduleDeleteResync(api, 800);
    return "Adicionado!";
  }

  encoded.forEach(([index, gender, figure]) => {
    if (index >= current.length) throw new Error("O codigo tem mais slots do que este Guarda-Roupa suporta.");
  });
  await persistSlots(api, encoded);
  await refreshWardrobe(api);
  scheduleDeleteResync(api, 800);
  return "Importado!";
}

function showError(button: HTMLElement, error: unknown): void {
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
        importButton.dataset.luminusOriginalLabel ??= importButton.textContent ?? "Importar";
        importButton.disabled = true;
        importButton.textContent = "Enviando...";
        void applyImport(api, encoded, freeOnly)
          .then((status) => setButtonStatus(importButton, status))
          .catch((error) => showError(importButton, error))
          .finally(() => { importButton.disabled = false; });
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

async function deleteWardrobeSlot(api: WardrobeTransport, button: HTMLElement, index: number): Promise<void> {
  if (button.dataset.busy === "true") return;
  const { figure, gender } = AVATAR_DELETED_PLACEHOLDER;
  button.dataset.busy = "true";
  button.textContent = "Enviando...";
  deletingSlots.add(index);
  setSlotEmptyVisual(index, true);
  try {
    if (!api.send(800, [index + 1, figure, gender])) {
      throw new Error("Não foi possível substituir o slot no servidor.");
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, WARDROBE_SAVE_INTERVAL_MS));
    await refreshWardrobe(api);
    scheduleDeleteResync(api, 800);
    button.textContent = "✓";
    window.setTimeout(() => {
      if (button.isConnected && button.dataset.busy !== "true") button.innerHTML = DELETE_ICON;
    }, 1800);
  } catch (error) {
    deletingSlots.delete(index);
    setSlotEmptyVisual(index, false);
    button.textContent = "!";
    window.setTimeout(() => {
      if (button.isConnected && button.dataset.busy !== "true") button.innerHTML = DELETE_ICON;
    }, 1800);
    window.setTimeout(() => window.alert(error instanceof Error ? error.message : "Não foi possível excluir o visual."), 0);
  } finally {
    delete button.dataset.busy;
  }
}

function setSlotEmptyVisual(index: number, empty: boolean): void {
  const card = document.querySelectorAll<HTMLElement>(".nitro-avatar-editor-wardrobe-figure-preview")[index];
  if (empty) pendingEmptySlots.add(index);
  else pendingEmptySlots.delete(index);
  if (!card) return;
  if (empty) card.dataset.luminusPendingEmpty = "true";
  else delete card.dataset.luminusPendingEmpty;
  card.classList.toggle("luminus-wardrobe-empty", empty);
  syncUseButton(card, card.querySelector<HTMLElement>(".button-container"), empty);
}

function syncUseButton(card: HTMLElement, container: HTMLElement | null, empty: boolean): void {
  if (!container) return;
  const useButton = Array.from(container.querySelectorAll<HTMLElement>(".btn"))
    .find((candidate) => candidate.textContent?.trim() === "Usar");
  if (empty) {
    if (useButton) {
      removedUseButtons.set(card, useButton);
      useButton.remove();
    }
    return;
  }
  if (useButton) {
    useButton.style.display = "";
    removedUseButtons.delete(card);
    return;
  }
  const savedButton = removedUseButtons.get(card);
  const group = container.querySelector<HTMLElement>(".d-flex.flex-column");
  if (savedButton && group) {
    savedButton.style.display = "";
    group.appendChild(savedButton);
    removedUseButtons.delete(card);
  }
}

function syncDeleteButtons(api: WardrobeTransport): void {
  const props = getWardrobeProps();
  if (!props) return;
  const figure = AVATAR_DELETED_PLACEHOLDER.figure;
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".nitro-avatar-editor-wardrobe-figure-preview"));
  cards.forEach((card, index) => {
    const container = card.querySelector<HTMLElement>(".button-container");
    if (!container) return;
    const saved = slotFigure(props.savedFigures[index]);
    const existingButton = card.querySelector<HTMLElement>(`[${DELETE_ATTR}]`);
    if (saved === figure) deletingSlots.delete(index);
    const deleting = deletingSlots.has(index);
    if (saved && saved !== figure && !deleting && existingButton?.dataset.busy !== "true") {
      pendingEmptySlots.delete(index);
      delete card.dataset.luminusPendingEmpty;
    }
    const empty = deleting || pendingEmptySlots.has(index) || card.dataset.luminusPendingEmpty === "true" || Boolean(figure && saved === figure);
    if (saved === figure) delete card.dataset.luminusPendingEmpty;
    card.classList.toggle("luminus-wardrobe-empty", empty);
    const hasVisual = !deleting && Boolean(saved && saved !== figure);
    let button = existingButton;
    if (!hasVisual) {
      button?.remove();
      syncUseButton(card, container, empty);
      return;
    }
    if (!button) {
      button = document.createElement("div");
      button.className = "luminus-wardrobe-delete";
      button.setAttribute(DELETE_ATTR, "true");
      button.setAttribute("role", "button");
      button.tabIndex = 0;
      button.innerHTML = DELETE_ICON;
      button.setAttribute("aria-label", "Excluir slot");
      button.title = "Excluir visual";
      const run = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button?.dataset.busy === "true" || button?.dataset.confirming === "true") return;
        button!.dataset.confirming = "true";
        showDeleteConfirmation(index, () => {
          delete button!.dataset.confirming;
          void deleteWardrobeSlot(api, button!, index);
        }, () => {
          delete button!.dataset.confirming;
        });
      };
      button.addEventListener("click", run);
      button.addEventListener("keydown", (event) => {
        if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) run(event);
      });
      card.appendChild(button);
    } else if (button.parentElement !== card) {
      card.appendChild(button);
    }
    button.title = "Excluir visual";
    if (button.dataset.busy !== "true" && !button.querySelector("svg")) button.innerHTML = DELETE_ICON;
    syncUseButton(card, container, empty);
  });
}

function scheduleDeleteResync(api: WardrobeTransport, delay = 250): void {
  if (deleteResyncTimer !== undefined) return;
  deleteResyncTimer = window.setTimeout(() => {
    deleteResyncTimer = undefined;
    syncDeleteButtons(api);
  }, delay);
}

function setDeleteSyncInterval(api: WardrobeTransport, enabled: boolean): void {
  if (!enabled) {
    if (deleteSyncInterval !== undefined) window.clearInterval(deleteSyncInterval);
    deleteSyncInterval = undefined;
    return;
  }
  if (deleteSyncInterval !== undefined) return;
  deleteSyncInterval = window.setInterval(() => {
    if (document.querySelector('.nitro-avatar-editor .menu')) syncDeleteButtons(api);
    else setDeleteSyncInterval(api, false);
  }, 300);
}

function sync(api: WardrobeTransport): void {
  syncQueued = false;
  const menu = document.querySelector(".nitro-avatar-editor .menu");
  if (!menu) return;
  const tab = Array.from(menu.children).find((child) => child.textContent?.trim() === "Meu Guarda-Roupa");
  const active = Boolean(tab && (tab.classList.contains("active") || tab.querySelector(".active")));
  const actions = menu.querySelector(`[${ACTIONS_ATTR}]`);
  if (active) {
    createActions(menu, api);
    syncDeleteButtons(api);
    scheduleDeleteResync(api);
    setDeleteSyncInterval(api, true);
  } else {
    actions?.remove();
    setDeleteSyncInterval(api, false);
  }
}

function scheduleSync(api: WardrobeTransport): void {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => sync(api));
}

export function initWardrobeTools(api: WardrobeTransport): void {
  if (started) return;
  started = true;
  const observer = new MutationObserver(() => {
    if (pendingEmptySlots.size) syncDeleteButtons(api);
    scheduleSync(api);
  });
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scheduleSync(api);
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
