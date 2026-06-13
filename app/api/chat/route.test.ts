import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks for route dependencies ---
vi.mock("@/lib/world/loadWorld", () => ({
  loadDefaultWorld: vi.fn(() => ({
    id: "test-world",
    name: "Test World",
    genre: "mystery",
    scene: { id: "s1", name: "Scene", description: "A scene" },
    characters: [],
    rules: [],
    opening: "Start.",
  })),
  loadWorld: vi.fn(() => null),
}));

vi.mock("@/lib/storage/store", () => ({
  getOrCreateSession: vi.fn(() => ({ id: "session-1", worldId: "test-world" })),
  getSession: vi.fn(() => null),
}));

const mockRunTurn = vi.fn();
vi.mock("@/lib/engine/runTurn", () => ({
  runTurn: (...args: unknown[]) => mockRunTurn(...args),
}));

vi.mock("@/lib/llm/catalog", () => ({
  getCatalog: vi.fn(() => []),
}));

vi.mock("@/lib/llm/validateUrl", () => ({
  assertSafeApiUrl: vi.fn(),
  sanitizeError: vi.fn((e: unknown) => String(e)),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/chat streaming contract", () => {
  it("returns NDJSON content-type when stream=true", async () => {
    mockRunTurn.mockResolvedValue({ userMessage: { id: "1", content: "hi" }, characterMessages: [] });
    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({ message: "hi", stream: true }) } as never);
    expect(res.headers.get("content-type")).toContain("ndjson");
  });

  it("returns JSON content-type when stream is absent", async () => {
    mockRunTurn.mockResolvedValue({ userMessage: { id: "1", content: "hi" }, characterMessages: [] });
    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({ message: "hi" }) } as never);
    expect(res.headers.get("content-type")).toContain("json");
    expect(res.headers.get("content-type")).not.toContain("ndjson");
  });

  it("streaming response emits done event with TurnResult", async () => {
    const turnResult = {
      userMessage: { id: "1", content: "hi" },
      characterMessages: [{ speakerId: "mira", speakerName: "Mira", content: "Hello." }],
      event: { summary: "test" },
      degraded: false,
    };
    mockRunTurn.mockImplementation(async (_sid: unknown, _world: unknown, _msg: unknown, _cfg: unknown, _lang: unknown, _name: unknown, onEvent?: (e: { type: string; data: unknown }) => void) => {
      // Simulate engine emitting events
      onEvent?.({ type: "content", data: { kind: "narration_done", text: "A scene unfolds." } });
      onEvent?.({ type: "status", data: { phase: "character_started", characterId: "mira", characterName: "Mira" } });
      onEvent?.({ type: "content", data: { kind: "character_delta", characterId: "mira", characterName: "Mira", text: "Hello." } });
      onEvent?.({ type: "status", data: { phase: "extraction_started" } });
      return turnResult;
    });

    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({ message: "hi", stream: true }) } as never);

    const text = await res.text();
    const lines = text.trim().split("\n").map((l: string) => JSON.parse(l));

    // Verify event types and ordering
    const types = lines.map((l: { type: string }) => l.type);
    expect(types).toContain("content");
    expect(types).toContain("status");
    expect(types[types.length - 1]).toBe("done");

    // Verify done event contains TurnResult
    const doneEvent = lines[lines.length - 1];
    expect(doneEvent.type).toBe("done");
    expect(doneEvent.data).toMatchObject({ userMessage: { id: "1" } });
  });

  it("streaming response emits error event on failure", async () => {
    mockRunTurn.mockRejectedValue(new Error("LLM failed"));

    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({ message: "hi", stream: true }) } as never);

    const text = await res.text();
    const lines = text.trim().split("\n").map((l: string) => JSON.parse(l));

    expect(lines.length).toBeGreaterThanOrEqual(1);
    const errorEvent = lines[lines.length - 1];
    expect(errorEvent.type).toBe("error");
    expect(errorEvent.data.message).toBeTruthy();
  });

  it("streaming events include character_reset when stream fails mid-output", async () => {
    mockRunTurn.mockImplementation(async (_sid: unknown, _world: unknown, _msg: unknown, _cfg: unknown, _lang: unknown, _name: unknown, onEvent?: (e: { type: string; data: unknown }) => void) => {
      onEvent?.({ type: "status", data: { phase: "character_started", characterId: "mira", characterName: "Mira" } });
      onEvent?.({ type: "content", data: { kind: "character_delta", characterId: "mira", characterName: "Mira", text: "partial " } });
      onEvent?.({ type: "content", data: { kind: "character_reset", characterId: "mira" } });
      onEvent?.({ type: "content", data: { kind: "character_delta", characterId: "mira", characterName: "Mira", text: "Complete fallback text." } });
      return { userMessage: { id: "1", content: "hi" }, characterMessages: [{ speakerId: "mira", speakerName: "Mira", content: "Complete fallback text." }] };
    });

    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({ message: "hi", stream: true }) } as never);

    const text = await res.text();
    const lines = text.trim().split("\n").map((l: string) => JSON.parse(l));

    // Find reset event
    const resetEvent = lines.find((l: { type: string; data: { kind?: string; characterId?: string } }) =>
      l.type === "content" && l.data.kind === "character_reset"
    );
    expect(resetEvent).toBeTruthy();
    expect(resetEvent.data.characterId).toBe("mira");

    // Verify reset comes before the fallback delta
    const resetIdx = lines.indexOf(resetEvent);
    const fallbackDelta = lines.find((l: { type: string; data: { kind?: string; characterId?: string; text?: string } }, i: number) =>
      i > resetIdx && l.type === "content" && l.data.kind === "character_delta" && l.data.characterId === "mira"
    );
    expect(fallbackDelta).toBeTruthy();
    expect(fallbackDelta.data.text).toBe("Complete fallback text.");
  });

  it("passes request.signal into runTurn on the streaming branch", async () => {
    let capturedSignal: AbortSignal | undefined;
    mockRunTurn.mockImplementation(async (..._args: unknown[]) => {
      // The streaming route's signature: (sid, world, msg, cfg, lang, name, onEvent, signal)
      // signal is the 8th positional argument
      capturedSignal = _args[7] as AbortSignal | undefined;
      return { userMessage: { id: "1", content: "hi" }, characterMessages: [] };
    });
    const ctrl = new AbortController();
    const { POST } = await import("./route");
    // Pass an AbortSignal through a fake Request
    await POST({
      json: async () => ({ message: "hi", stream: true }),
      signal: ctrl.signal,
    } as never);

    expect(capturedSignal).toBe(ctrl.signal);
  });

  it("aborted request does not produce a content error event", async () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    mockRunTurn.mockRejectedValue(err);
    const { POST } = await import("./route");
    const ctrl = new AbortController();
    const res = await POST({
      json: async () => ({ message: "hi", stream: true }),
      signal: ctrl.signal,
    } as never);
    const text = await res.text();
    // Aborted stream should produce minimal/empty output, not an error event
    expect(text).not.toContain('"type":"error"');
  });
});
