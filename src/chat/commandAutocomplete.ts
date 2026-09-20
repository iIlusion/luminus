export interface HotelChatCommand {
  code: string;
  description: string;
  dangerous?: boolean;
  vip?: boolean;
}

/** Hotel commands exposed by the native Habblet command system. */
export const HOTEL_CHAT_COMMANDS: readonly HotelChatCommand[] = [
  { code: ":empty", description: "Deletar todos os mobis do inventário", dangerous: true },
  { code: ":sit", description: "Sentar no chão" },
  { code: ":lay", description: "Deitar no chão" },
  { code: ":home", description: "Ir para o seu cafofo" },
  { code: ":deletegroup", description: "Deletar grupo do quarto atual", dangerous: true },
  { code: ":friends", description: "Ativar ou desativar pedidos de amizade" },
  { code: ":trade", description: "Ativar ou desativar trocas" },
  { code: ":habbletname", description: "Mudar nome (custa 100k diamantes)", vip: true, dangerous: true },
  { code: ":moonwalk", description: "Ativar ou desativar andar de costas" },
  { code: ":enable", description: "Habilitar efeito de avatar (enable)" },
  { code: ":copy", description: "Copiar visual de alguém" },
  { code: ":pet", description: "Se transformar em pet", vip: true },
  { code: ":cara", description: "Esconder rosto" },
  { code: ":follow", description: "Seguir alguém" },
  { code: ":handitem", description: "Habilitar handitem" },
  { code: ":diagonal", description: "Ativar ou desativar andar na diagonal" },
  { code: ":random", description: "Gerar número aleatório [min max]" },
  { code: ":mutepets", description: "Mutar pets" },
  { code: ":mutebots", description: "Mutar bots" },
  { code: ":emptypets", description: "Deletar todos os pets no inventário", dangerous: true },
  { code: ":emptybots", description: "Deletar todos os bots no inventário", dangerous: true },
  { code: ":afk", description: "Ativar modo ausente", vip: true },
  { code: ":aus", description: "Ativar modo ausente (pt-BR)", vip: true },
  { code: ":pickrare", description: "Recolher todos os raros do quarto", dangerous: true },
  { code: ":emptyrel", description: "Resetar relacionamentos", dangerous: true },
  { code: ":ct", description: "Clicar através de Habblets" },
  { code: ":wiredtool", description: "Ferramenta Wired" },
  { code: ":tele", description: "Teleportar no quarto", vip: true },
  { code: ":pickall", description: "Recolher tudo do quarto", dangerous: true },
  { code: ":pickwired", description: "Recolher wireds do quarto", dangerous: true },
  { code: ":ejectall", description: "Ejetar mobis do quarto", dangerous: true },
  { code: ":setmax", description: "Definir máximo de visitantes no quarto", vip: true },
  { code: ":ativar", description: "Reativar comandos desativados", vip: true },
  { code: ":desativar", description: "Desativar comandos no quarto", vip: true },
  { code: ":kickpets", description: "Kickar todos os pets", dangerous: true },
  { code: ":kickbots", description: "Kickar todos os bots", dangerous: true },
  { code: ":setspeed", description: "Definir velocidade dos rollers (num)" },
  { code: ":blockroom", description: "Bloquear alterações no quarto" },
  { code: ":up", description: "Construir em altura específica (num)" },
  { code: ":spin", description: "Construir em rotação específica (num)" },
  { code: ":state", description: "Construir em estado específico (num)" },
  { code: ":quickpoll", description: "Criar enquete rápida (msg)", vip: true },
  { code: ":wired", description: "Esconder wireds do quarto" },
  { code: ":autofloor", description: "Remover pisos sem mobis", dangerous: true },
  { code: ":pyramid", description: "Mostrar ou esconder pirâmides wired" },
  { code: ":eject", description: "Ejetar mobis de um usuário (user)", dangerous: true },
  { code: ":kis", description: "Beijar usuário (user)", vip: true },
  { code: ":kiss", description: "Manda beijo" },
  { code: ":soco", description: "Socar usuário (user)", vip: true },
  { code: ":abracar", description: "Abraçar usuário (user)" },
  { code: ":push", description: "Empurrar usuário (user)" },
  { code: ":pull", description: "Puxar usuário (user)" },
  { code: ":roomid", description: "Ir até o quarto do ID especificado" },
  { code: ":sign", description: "Exibir placa do número especificado" },
  { code: ":d", description: "Risadinha" },
  { code: ":settings", description: "Exibir configurações do quarto" },
  { code: ":floor", description: "Exibir editor de chão do quarto" },
  { code: ":flip", description: "Inverter a tela (use :zoom 1 para desfazer)", dangerous: true },
  { code: ":iddqd", description: "Inverter a tela (use :zoom 1 para desfazer)", dangerous: true },
  { code: ":zoom", description: "Ajustar o zoom no quarto" },
  { code: ":chooser", description: "Exibir lista de usuários no quarto" },
  { code: ":furni", description: "Exibir editor de mobis no quarto" },
  { code: ":performance", description: "Exibir informações técnicas do navegador" },
  { code: ":comandos", description: "Listar comandos do hotel" },
  { code: ":idle", description: "Ativar indicador de inatividade (Zzz)" },
  { code: ":screenshot", description: "Abrir uma imagem do quarto em uma nova aba" },
];

export interface ActiveCommandToken {
  start: number;
  query: string;
}

/** Finds a command token only while the caret is at the end of the message. */
export function findActiveCommandToken(value: string, caret: number): ActiveCommandToken | null {
  if (caret !== value.length) return null;
  const match = /(?:^|\s)(:[^\s]*)$/.exec(value.slice(0, caret));
  if (!match) return null;
  const start = match.index + (match[0].startsWith(":") ? 0 : 1);
  return { start, query: match[0].slice(start - match.index + 1) };
}

export function getCommandSuggestions(query: string, limit = 8): readonly HotelChatCommand[] {
  const normalized = query.trim().toLocaleLowerCase("pt-BR").replace(/^:/, "");
  if (limit <= 0) return [];
  return HOTEL_CHAT_COMMANDS
    .filter(command => command.code.slice(1).toLocaleLowerCase("pt-BR").startsWith(normalized))
    .sort((left, right) => left.code.localeCompare(right.code, "pt-BR"))
    .slice(0, limit);
}

export function applyCommandSelection(value: string, caret: number, code: string): string {
  const before = value.slice(0, caret);
  const match = /(?:^|\s)(:[^\s]*)$/.exec(before);
  if (!match) return value;
  const start = match.index + (match[0].startsWith(":") ? 0 : 1);
  const suffix = value.slice(caret);
  return `${value.slice(0, start)}${code}${suffix.startsWith(" ") ? "" : " "}${suffix}`;
}

export function moveCommandSuggestionIndex(current: number, delta: -1 | 1, size: number): number {
  if (size <= 0) return -1;
  const base = current < 0 ? (delta > 0 ? -1 : 0) : current;
  return (base + delta + size) % size;
}

const AUTOCOMPLETE_ID = "luminus-chat-command-autocomplete";
const CHAT_INPUT_SELECTOR = ".nitro-room-chatinput-component .chat-input";

function setNativeInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function createSuggestion(command: HotelChatCommand, index: number): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "lm-command-autocomplete-item";
  item.dataset.index = String(index);
  item.setAttribute("role", "option");
  item.innerHTML = `
    <span class="lm-command-autocomplete-code"></span>
    <span class="lm-command-autocomplete-description"></span>
    <span class="lm-command-autocomplete-badges"></span>
  `;
  item.querySelector(".lm-command-autocomplete-code")!.textContent = command.code;
  item.querySelector(".lm-command-autocomplete-description")!.textContent = command.description;
  const badges = item.querySelector(".lm-command-autocomplete-badges")!;
  if (command.vip) badges.insertAdjacentHTML("beforeend", "<span class=\"lm-command-autocomplete-badge lm-command-autocomplete-badge-vip\">VIP</span>");
  if (command.dangerous) badges.insertAdjacentHTML("beforeend", "<span class=\"lm-command-autocomplete-badge lm-command-autocomplete-badge-danger\">atenção</span>");
  return item;
}

export function initChatCommandAutocomplete(): () => void {
  let input: HTMLInputElement | null = null;
  let host: HTMLDivElement | null = null;
  let suggestions: readonly HotelChatCommand[] = [];
  let selectedIndex = -1;
  let cleanupInput: (() => void) | null = null;
  let observer: MutationObserver | null = null;

  const hide = () => {
    selectedIndex = -1;
    suggestions = [];
    if (!host) return;
    host.hidden = true;
    host.setAttribute("aria-hidden", "true");
  };

  const position = () => {
    if (!host || !input || host.hidden) return;
    const rect = input.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 280), 420, window.innerWidth - 16);
    host.style.width = `${width}px`;
    host.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    const height = host.getBoundingClientRect().height;
    host.style.top = `${Math.max(8, rect.top - height - 8)}px`;
  };

  const render = () => {
    if (!host || !input) return;
    const caret = input.selectionStart ?? input.value.length;
    const token = findActiveCommandToken(input.value, caret);
    suggestions = token ? getCommandSuggestions(token.query) : [];
    if (suggestions.length === 0) {
      hide();
      return;
    }

    selectedIndex = Math.min(Math.max(selectedIndex, 0), suggestions.length - 1);
    const list = document.createElement("ul");
    list.className = "lm-command-autocomplete-list";
    list.setAttribute("role", "listbox");
    suggestions.forEach((command, index) => {
      const item = createSuggestion(command, index);
      item.setAttribute("aria-selected", String(index === selectedIndex));
      if (index === selectedIndex) item.classList.add("is-selected");
      item.addEventListener("mousedown", event => {
        event.preventDefault();
        select(index);
      });
      list.appendChild(item);
    });

    host.replaceChildren(
      Object.assign(document.createElement("div"), {
        className: "lm-command-autocomplete-header",
        innerHTML: "<span>Comandos do hotel</span><span class=\"lm-command-autocomplete-hint\">↑↓ navegar · Enter escolher</span>",
      }),
      list,
    );
    host.hidden = false;
    host.setAttribute("aria-hidden", "false");
    position();
  };

  const select = (index: number) => {
    const command = suggestions[index];
    if (!command || !input) return;
    const caret = input.selectionStart ?? input.value.length;
    const value = applyCommandSelection(input.value, caret, command.code);
    setNativeInputValue(input, value);
    input.focus();
    input.setSelectionRange(value.length, value.length);
    hide();
  };

  const attach = (nextInput: HTMLInputElement) => {
    if (input === nextInput) return;
    cleanupInput?.();
    input = nextInput;
    const onInput = () => { selectedIndex = -1; render(); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!host || host.hidden || suggestions.length === 0) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        selectedIndex = moveCommandSuggestionIndex(selectedIndex, event.key === "ArrowDown" ? 1 : -1, suggestions.length);
        render();
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        select(selectedIndex < 0 ? 0 : selectedIndex);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hide();
      }
    };
    const onFocus = () => render();
    const onBlur = () => window.setTimeout(() => {
      if (!host?.contains(document.activeElement)) hide();
    }, 120);
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown, true);
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    cleanupInput = () => {
      input?.removeEventListener("input", onInput);
      input?.removeEventListener("keydown", onKeyDown, true);
      input?.removeEventListener("focus", onFocus);
      input?.removeEventListener("blur", onBlur);
    };
    render();
  };

  const sync = () => {
    const nextInput = document.querySelector<HTMLInputElement>(CHAT_INPUT_SELECTOR);
    if (nextInput) attach(nextInput);
    else {
      cleanupInput?.();
      cleanupInput = null;
      input = null;
      hide();
    }
  };

  const start = () => {
    host = document.createElement("div");
    host.id = AUTOCOMPLETE_ID;
    host.hidden = true;
    host.setAttribute("role", "presentation");
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    sync();
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
  };

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  return () => {
    observer?.disconnect();
    cleanupInput?.();
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", position, true);
    host?.remove();
  };
}
