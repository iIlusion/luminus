import {
  applyExternalToolbarCompatibility,
  findLuminusToolbarMount,
  findExternalToolbarHost,
  shouldDelayToolbarBootstrapSelector,
} from "./externalToolbarFix.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const classNames = new Set<string>();
const iconGroup = {} as HTMLElement;
const inlineStyles: Record<string, { value: string; priority: string }> = {};
const style = {
  getPropertyValue: (name: string) => inlineStyles[name]?.value ?? "",
  getPropertyPriority: (name: string) => inlineStyles[name]?.priority ?? "",
  setProperty: (name: string, value: string, priority = "") => {
    inlineStyles[name] = { value, priority };
  },
  removeProperty: (name: string) => {
    const previous = inlineStyles[name]?.value ?? "";
    delete inlineStyles[name];
    return previous;
  },
} as unknown as CSSStyleDeclaration;
const toolbar = {
  classList: {
    add: (name: string) => classNames.add(name),
    contains: (name: string) => classNames.has(name),
    remove: (name: string) => classNames.delete(name),
  },
  dataset: {} as Record<string, string>,
  style,
  matches: (selector: string) => selector === ".nitro-toolbar-me" && classNames.has("nitro-toolbar-me"),
  removeAttribute: (name: string) => {
    if (name === "data-luminus-external-toolbar-fix") delete toolbar.dataset.luminusExternalToolbarFix;
  },
  querySelector: (selector: string) => selector === ".toolbar-navigation > div:first-child" ? iconGroup : null,
  getBoundingClientRect: () => ({ top: 862 } as DOMRect),
} as unknown as HTMLElement;

const upperToolbar = {
  ...toolbar,
  dataset: {} as Record<string, string>,
  getBoundingClientRect: () => ({ top: 520 } as DOMRect),
} as unknown as HTMLElement;

const fakeDocument = {
  querySelector: (selector: string) => selector === ".nitro-toolbar" ? upperToolbar : null,
  querySelectorAll: (selector: string) => selector === ".nitro-toolbar" ? [upperToolbar, toolbar] : [],
} as unknown as Document;

assert(findExternalToolbarHost(fakeDocument) === toolbar, "the real hotel toolbar must be detected");
assert(applyExternalToolbarCompatibility(fakeDocument), "compatibility class must be applied");
assert(classNames.has("nitro-toolbar-me"), "legacy toolbar selector must be added");
assert(toolbar.dataset.luminusExternalToolbarFix === "toolbar-host", "compatibility marker must be set on the real toolbar");
assert(inlineStyles.inset?.value === "auto 0 0 0", "compatibility must keep the real toolbar at the viewport bottom");
assert(inlineStyles.inset?.priority === "important", "toolbar position override must win over legacy marker styles");
assert(findLuminusToolbarMount(fakeDocument) === iconGroup, "Luminus controls must mount inside the existing navigation group");
assert(!applyExternalToolbarCompatibility(fakeDocument), "compatibility must be idempotent");

assert(
  shouldDelayToolbarBootstrapSelector(".navigation-item", false),
  "page integration must not see toolbar items before the room engine is ready",
);
assert(
  !shouldDelayToolbarBootstrapSelector(".navigation-item", true),
  "page integration must see toolbar items once the room engine is ready",
);
assert(
  !shouldDelayToolbarBootstrapSelector(".nitro-toolbar", false),
  "unrelated selectors must not be delayed",
);

console.log("externalToolbarFix toolbar compatibility: ok");
