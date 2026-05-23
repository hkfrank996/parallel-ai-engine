import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";

/**
 * Test 1: Import failure leaves no dirty file
 *
 * When sessionData validation fails (e.g. messages is a string instead of array),
 * the API should return 400 AND should NOT create a YAML file in data/worlds/.
 *
 * We test the POST handler directly by mocking NextRequest/NextResponse
 * and spying on fs.writeFileSync.
 */

// Minimal valid YAML that passes worldSchema.parse
const VALID_YAML = `
id: test-import-world
name: Test Import World
tagline: A world for testing
genre: mystery
rules:
  - "Rule 1"
opening: "The test begins."
scene:
  id: scene-1
  name: Lobby
  description: "A test lobby"
characters:
  - id: char-1
    name: Alice
    role: detective
    personality: ["curious"]
    goals: ["solve the case"]
    speaking_style: "formal"
    relationship_notes: {}
`.trim();

/** Build a mock NextRequest with the given JSON body */
function mockRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as import("next/server").NextRequest;
}

// We need to intercept fs.writeFileSync to prevent real file writes
// and to verify whether a YAML file was created.
let writeSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
  vi.spyOn(fs, "existsSync").mockReturnValue(true);
  vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
  // Suppress console.error — the route logs caught errors
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/world/import — sessionData validation before YAML write", () => {
  it("returns 400 and writes no YAML when messages is a string instead of array", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const req = mockRequest({
      yaml: VALID_YAML,
      sessionData: { messages: "not-an-array" },
    });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("messages");
    expect(body.error).toContain("must be an array");

    // CRITICAL: No YAML file should have been written
    const yamlWrites = writeSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith(".yaml")
    );
    expect(yamlWrites).toHaveLength(0);
  });

  it("returns 400 and writes no YAML when events is a number", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const req = mockRequest({
      yaml: VALID_YAML,
      sessionData: { events: 42 },
    });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("events");

    const yamlWrites = writeSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith(".yaml")
    );
    expect(yamlWrites).toHaveLength(0);
  });

  it("returns 400 and writes no YAML when worldFacts is a boolean", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const req = mockRequest({
      yaml: VALID_YAML,
      sessionData: { worldFacts: true },
    });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("worldFacts");

    const yamlWrites = writeSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith(".yaml")
    );
    expect(yamlWrites).toHaveLength(0);
  });

  it("returns 400 and writes no YAML when characterMemories is an object", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const req = mockRequest({
      yaml: VALID_YAML,
      sessionData: { characterMemories: { not: "an array" } },
    });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("characterMemories");

    const yamlWrites = writeSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith(".yaml")
    );
    expect(yamlWrites).toHaveLength(0);
  });

  it("returns 400 and writes no YAML when relationships is null", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const req = mockRequest({
      yaml: VALID_YAML,
      sessionData: { relationships: null },
    });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("relationships");

    const yamlWrites = writeSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith(".yaml")
    );
    expect(yamlWrites).toHaveLength(0);
  });

  it("returns 400 when sessionData has too many total entries (>10000)", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    // Create an array with 10001 entries
    const bigArray = Array.from({ length: 10001 }, (_, i) => ({
      id: `msg-${i}`,
      sessionId: "orig",
      speakerType: "user",
      speakerId: "p1",
      speakerName: "Alice",
      content: "Test",
      createdAt: "2026-05-23T00:00:00.000Z",
    }));

    const req = mockRequest({
      yaml: VALID_YAML,
      sessionData: { messages: bigArray },
    });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("too large");

    const yamlWrites = writeSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith(".yaml")
    );
    expect(yamlWrites).toHaveLength(0);
  });

  it("returns 400 when yaml content is missing", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const req = mockRequest({ sessionData: { messages: [] } });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("yaml");
  });

  it("returns 400 when yaml content exceeds 500KB", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const hugeYaml = "x: " + "a".repeat(500_001);
    const req = mockRequest({ yaml: hugeYaml });

    const response = await POST(req);
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("too large");
  });

  it("returns 400 when yaml is invalid (fails worldSchema)", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    // Missing required fields
    const req = mockRequest({ yaml: "id: bad-world\nname: Bad" });

    const response = await POST(req);

    expect((response as Response).status).toBe(400);
  });
});
