import "fake-indexeddb/auto";
import { beforeEach, vi } from "vitest";

/**
 * A minimal browser surface for Node.
 *
 * Only what the modules under test actually touch. Deliberately not jsdom:
 * none of the logic being tested here renders anything, and a DOM would add
 * seconds to every run for no coverage.
 */
const store = new Map<string, string>();
const localStorageShim: Storage = {
  get length() {
    return store.size;
  },
  key: (i) => [...store.keys()][i] ?? null,
  getItem: (k) => (store.has(k) ? store.get(k)! : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
};

vi.stubGlobal("localStorage", localStorageShim);

// Node 26 exposes `navigator` as a getter-only global, so it must be
// redefined rather than assigned. No `gpu` property, which is the point:
// tests run on the no-WebGPU path, the same one a low-end phone takes.
Object.defineProperty(globalThis, "navigator", {
  value: { language: "en", onLine: true },
  configurable: true,
  writable: true,
});

beforeEach(() => {
  store.clear();
});
