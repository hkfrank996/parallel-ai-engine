import { describe, it, expect } from "vitest";
import { listWorlds, listWorldIds, loadWorld, loadDefaultWorld } from "@/lib/world/loadWorld";

// --- Helper: basic structural validation that complements Zod's runtime parse ---
function expectValidWorldStructure(world: ReturnType<typeof loadWorld>) {
  expect(world.id).toBeTruthy();
  expect(world.name).toBeTruthy();
  expect(world.genre).toBeTruthy();
  expect(world.tagline).toBeTruthy();
  expect(world.opening.length).toBeGreaterThan(0);
  expect(world.rules.length).toBeGreaterThan(0);

  // Scene
  expect(world.scene.id).toBeTruthy();
  expect(world.scene.name).toBeTruthy();
  expect(world.scene.description.length).toBeGreaterThan(0);

  // Characters
  expect(world.characters.length).toBeGreaterThanOrEqual(1);
  for (const c of world.characters) {
    expect(c.id).toBeTruthy();
    expect(c.name).toBeTruthy();
    expect(c.role).toBeTruthy();
    expect(Array.isArray(c.personality)).toBe(true);
    expect(c.personality.length).toBeGreaterThan(0);
    expect(Array.isArray(c.goals)).toBe(true);
    expect(c.speaking_style).toBeTruthy();
  }
}

describe("showcase worlds — list & structure", () => {
  it("listWorlds returns at least 9 built-in worlds", () => {
    const worlds = listWorlds();
    expect(worlds.length).toBeGreaterThanOrEqual(9);
  });

  it("every listed world has id, name, genre fields", () => {
    const worlds = listWorlds();
    for (const w of worlds) {
      expect(w.id).toBeTruthy();
      expect(w.name).toBeTruthy();
      expect(w.genre).toBeTruthy();
    }
  });

  it("listWorlds id matches the file stem (no drift between YAML id and filename)", () => {
    const worlds = listWorlds();
    const fileStems = listWorldIds();
    // Each loaded id must equal its source file's stem
    for (const w of worlds) {
      expect(fileStems).toContain(w.id);
    }
  });
});

describe("showcase worlds — load each one successfully", () => {
  const listed = listWorlds();
  // Snapshot the listed ids so the dynamic test runs against the actual built-in set
  const ids = listed.map((w) => w.id);

  it("at least 9 world ids discovered", () => {
    expect(ids.length).toBeGreaterThanOrEqual(9);
  });

  // Generate one test per world dynamically. This is intentional: a per-world
  // failure in CI will point to the specific world that's broken.
  for (const id of ids) {
    it(`loads "${id}" and passes structural validation`, () => {
      const world = loadWorld(id);
      expect(world.id).toBe(id);
      expectValidWorldStructure(world);
    });
  }
});

describe("showcase worlds — genre/theme coverage", () => {
  it("covers at least 3 distinct genres across the built-in set", () => {
    const genres = new Set(listWorlds().map((w) => w.genre).filter(Boolean));
    expect(genres.size).toBeGreaterThanOrEqual(3);
  });
});

describe("showcase worlds — loadDefaultWorld contract", () => {
  it("loadDefaultWorld returns neon-harbor", () => {
    const world = loadDefaultWorld();
    expect(world.id).toBe("neon-harbor");
    expectValidWorldStructure(world);
  });
});

describe("showcase worlds — error handling", () => {
  it("loadWorld throws for unknown id", () => {
    expect(() => loadWorld("definitely-not-a-real-world-12345")).toThrow();
  });

  it("loadWorld throws for id with unsafe characters", () => {
    // The loader normalizes/validates id; this should reject
    expect(() => loadWorld("../../etc/passwd")).toThrow();
  });

  it("loadWorld throws for empty string id", () => {
    expect(() => loadWorld("")).toThrow();
  });
});
