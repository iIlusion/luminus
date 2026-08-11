class MemoryStorage {
  private readonly values = new Map<string, string>();

  get length(): number { return this.values.size; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const localStorage = new MemoryStorage();
const listeners = new Map<string, () => void>();
Object.assign(globalThis, {
  localStorage,
  window: {
    addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    setTimeout,
    clearTimeout,
  },
});

localStorage.setItem("luminus.shared:luminus.panel.demo", "true");
localStorage.setItem("luminus.shared:luminus.links.store", JSON.stringify({ PlayerA: [{ link: "https://example.test" }] }));

const { readPref, writePref } = await import("./prefs.ts");
assert(readPref<boolean>("luminus.panel.demo", false) === true, "must read migrated setting");

const settings = JSON.parse(localStorage.getItem("luminus.shared:luminus.settings.v1") ?? "{}");
const migration = JSON.parse(localStorage.getItem("luminus.shared:luminus.settings.migration.v1") ?? "{}");
assert(settings.values["luminus.panel.demo"] === true, "must preserve legacy setting");
assert(localStorage.getItem("luminus.shared:luminus.panel.demo") === null, "must remove migrated legacy key");
assert(migration.status === "complete", "must persist migration state");
assert(localStorage.getItem("luminus.shared:luminus.links.store") !== null, "must keep separate data outside settings");

writePref("luminus.panel.demo", false);
listeners.get("pagehide")?.();
const flushed = JSON.parse(localStorage.getItem("luminus.shared:luminus.settings.v1") ?? "{}");
assert(flushed.values["luminus.panel.demo"] === false, "must flush pending setting on pagehide");

console.log("prefs.test.ts: ok");
