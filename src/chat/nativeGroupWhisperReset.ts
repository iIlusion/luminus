import { RoomUnitWhisperComposer } from "../messages/outgoing/RoomUnitWhisperComposer";
import type { LuminusApi } from "../ws/api";
import { NATIVE_GROUP_RESET_PREFIX } from "./nativeGroupWhisperResetPrefix";

type NativeChatInput = HTMLInputElement & Record<string, unknown>;

const BUTTON_CLASS = "luminus-native-group-reset";
const GROUP_PREFIX = "sussurrar group";
let lastResetAt = 0;

function normalizeChatValue(input: HTMLInputElement | null): string {
  return input?.value.trim().toLocaleLowerCase("pt-BR") ?? "";
}

function getNativeChatInput(): NativeChatInput | null {
  return document.querySelector<NativeChatInput>(".nitro-room-chatinput-component .chat-input");
}

function isGroupWhisperInput(input: HTMLInputElement | null): boolean {
  return normalizeChatValue(input).startsWith(GROUP_PREFIX);
}

export function resetNativeGroupMembers(api?: LuminusApi, force = false): boolean {
  const username = api?.myself?.username?.trim();
  if (!api || !username) return false;

  const now = Date.now();
  if (!force && now - lastResetAt < 1000) return true;
  lastResetAt = now;

  return api.send(new RoomUnitWhisperComposer(username, `${NATIVE_GROUP_RESET_PREFIX}${now.toString(36).slice(-4)}`));
}

export function clearNativeGroupWhisperInput(api?: LuminusApi): boolean {
  const input = getNativeChatInput();
  if (!input || !isGroupWhisperInput(input)) return false;

  resetNativeGroupMembers(api);

  const propsKey = Object.keys(input).find(key => key.startsWith("__reactProps$"));
  const props = propsKey ? input[propsKey] as { onChange?: (event: { target: { value: string } }) => void } : undefined;
  if (props?.onChange) {
    props.onChange({ target: { value: "" } });
    return true;
  }

  input.value = "";
  input.parentElement?.setAttribute("data-value", "");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function initNativeGroupWhisperReset(api: LuminusApi): () => void {
  let cleanupInput: (() => void) | null = null;
  let watchedInput: HTMLInputElement | null = null;
  let button: HTMLButtonElement | null = null;
  let groupResetArmed = false;

  const updateButton = () => {
    if (button) button.style.display = isGroupWhisperInput(getNativeChatInput()) ? "inline-flex" : "none";
  };

  const sync = () => {
    const root = document.querySelector<HTMLElement>(".nitro-room-chatinput-component");
    const input = getNativeChatInput();
    if (!root || !input) return;

    button = root.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.textContent = "x";
      button.title = "Limpar membros do grupo de sussurro";
      button.setAttribute("aria-label", "Limpar membros do grupo de sussurro");
      Object.assign(button.style, {
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        margin: "0 4px",
        padding: "0",
        border: "1px solid rgba(0, 0, 0, 0.45)",
        borderRadius: "4px",
        background: "rgba(28, 31, 38, 0.92)",
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: "700",
        lineHeight: "20px",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
      });
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        clearNativeGroupWhisperInput(api);
        getNativeChatInput()?.focus();
        updateButton();
      });
      root.insertBefore(button, root.querySelector(".chatstyles"));
    }

    if (input === watchedInput) {
      updateButton();
      return;
    }

    cleanupInput?.();
    watchedInput = input;
    groupResetArmed = isGroupWhisperInput(input);

    const detectManualClear = () => {
      const value = normalizeChatValue(input);
      const isGroup = isGroupWhisperInput(input);
      if (isGroup) groupResetArmed = true;
      if (groupResetArmed && !value) {
        resetNativeGroupMembers(api);
        groupResetArmed = false;
      }
      updateButton();
    };
    const onInput = () => {
      detectManualClear();
      requestAnimationFrame(detectManualClear);
      setTimeout(detectManualClear, 0);
    };

    input.addEventListener("input", onInput);
    input.addEventListener("change", onInput);
    input.addEventListener("keydown", onInput);
    input.addEventListener("keyup", onInput);
    input.addEventListener("blur", onInput);
    cleanupInput = () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onInput);
      input.removeEventListener("keydown", onInput);
      input.removeEventListener("keyup", onInput);
      input.removeEventListener("blur", onInput);
    };
    updateButton();
  };

  const start = () => {
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cleanupInput?.();
      document.querySelector(`.${BUTTON_CLASS}`)?.remove();
    };
  };

  if (document.body) return start();

  let stop: (() => void) | null = null;
  document.addEventListener("DOMContentLoaded", () => { stop = start(); }, { once: true });
  return () => stop?.();
}
