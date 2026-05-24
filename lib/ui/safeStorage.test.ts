import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { safeGetItem, safeSetItem, safeRemoveItem, _resetForTesting } from "./safeStorage";

/**
 * Tests for safeStorage helpers.
 *
 * vitest runs in Node (no jsdom). We shim globals via Object.defineProperty
 * and call _resetForTesting() to bust the module's cached available probe.
 *
 * The critical path tested here: window.localStorage GETTER throws
 * SecurityError. This is the exact Codex in-app browser failure mode.
 */

const store: Record<string, string> = {};
const mockStorage: Storage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

function setupNormalStorage() {
  if (typeof globalThis.window === "undefined") {
    (globalThis as unknown as Record<string, unknown>).window = {};
  }
  const win = globalThis.window as unknown as Record<string, unknown>;
  Object.defineProperty(win, "localStorage", { value: mockStorage, configurable: true, writable: true });
  Object.defineProperty(globalThis, "localStorage", { value: mockStorage, configurable: true, writable: true });
  _resetForTesting();
}

function clearBoth() {
  // Remove shims so the module re-probes honestly
  try { delete (globalThis as Record<string, unknown>).localStorage; } catch { /* ok */ }
  try { delete ((globalThis as Record<string, unknown>).window as Record<string, unknown>).localStorage; } catch { /* ok */ }
  _resetForTesting();
}

beforeEach(() => {
  for (const k in store) delete store[k];
  clearBoth();
});

describe("safeStorage — normal localStorage", () => {
  beforeEach(() => { setupNormalStorage(); });

  it("safeGetItem returns stored value", () => {
    localStorage.setItem("k", "v");
    expect(safeGetItem("k")).toBe("v");
  });

  it("safeGetItem returns null for missing key", () => {
    expect(safeGetItem("missing")).toBeNull();
  });

  it("safeSetItem stores value", () => {
    safeSetItem("k", "hello");
    expect(localStorage.getItem("k")).toBe("hello");
  });

  it("safeRemoveItem removes value", () => {
    localStorage.setItem("k", "bye");
    safeRemoveItem("k");
    expect(localStorage.getItem("k")).toBeNull();
  });
});

describe("safeStorage — window.localStorage GETTER throws SecurityError", () => {
  // This is the exact Codex in-app browser failure mode
  beforeEach(() => {
    if (typeof globalThis.window === "undefined") {
      (globalThis as unknown as Record<string, unknown>).window = {};
    }
    const win = globalThis.window as unknown as Record<string, unknown>;
    Object.defineProperty(win, "localStorage", {
      get() { throw Object.assign(new Error("blocked"), { name: "SecurityError" }); },
      configurable: true,
    });
  });

  it("safeGetItem returns null instead of throwing", () => {
    expect(safeGetItem("any-key")).toBeNull();
  });

  it("safeSetItem does not throw", () => {
    expect(() => safeSetItem("any-key", "value")).not.toThrow();
  });

  it("safeRemoveItem does not throw", () => {
    expect(() => safeRemoveItem("any-key")).not.toThrow();
  });
});

describe("safeStorage — localStorage is undefined", () => {
  beforeEach(() => {
    if (typeof globalThis.window === "undefined") {
      (globalThis as unknown as Record<string, unknown>).window = {};
    }
    const win = globalThis.window as unknown as Record<string, unknown>;
    Object.defineProperty(win, "localStorage", { value: undefined, configurable: true });
  });

  it("safeGetItem returns null", () => { expect(safeGetItem("k")).toBeNull(); });
  it("safeSetItem does not throw", () => { expect(() => safeSetItem("k", "v")).not.toThrow(); });
  it("safeRemoveItem does not throw", () => { expect(() => safeRemoveItem("k")).not.toThrow(); });
});

describe("safeStorage — setItem throws QuotaExceededError", () => {
  beforeEach(() => { setupNormalStorage(); });

  it("safeSetItem does not throw", () => {
    const original = mockStorage.setItem;
    mockStorage.setItem = () => { throw new DOMException("full", "QuotaExceededError"); };
    expect(() => safeSetItem("k", "v")).not.toThrow();
    mockStorage.setItem = original;
  });
});
