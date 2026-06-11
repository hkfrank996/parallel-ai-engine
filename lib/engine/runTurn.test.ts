import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Call-order tracking ---
let callOrder: string[] = [];
function recordCall(name: string) {
  callOrder.push(name);
}

// --- Deferred promise factory (for controlling async timing) ---
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

// --- Storage mocks ---
const storeMocks = {
  getRecentMessages: vi.fn(() => []),
  addMessage: vi.fn(),
  addEvent: vi.fn(),
  getWorldFacts: vi.fn(() => []),
  getCharacterMemories: vi.fn(() => []),
  addWorldFacts: vi.fn(),
  addCharacterMemories: vi.fn(),
  getWorldTime: vi.fn(() => ({ day: 1, timeOfDay: "night" as const, turnCount: 1 })),
  updateWorldTime: vi.fn(),
  getRelationships: vi.fn(() => []),
  updateRelationship: vi.fn(),
  addWorldEvent: vi.fn(),
  getWorldEvents: vi.fn(() => []),
  addClue: vi.fn(() => true),
};
vi.mock("@/lib/storage/store", () => storeMocks);

// --- LLM provider mock (character generation is controllable) ---
let characterDeferred = deferred<string>();
const mockGenerate = vi.fn(async () => {
  recordCall("character:start");
  const result = await characterDeferred.promise;
  recordCall("character:end");
  return result;
});
const providerMocks = {
  getProvider: vi.fn(() => ({
    provider: { generate: mockGenerate },
    isMock: false,
    envFallback: null,
  })),
};
vi.mock("@/lib/llm/provider", () => providerMocks);

// --- Engine module mocks with call tracking ---
const mockAnalyzeRelationships = vi.fn(async () => {
  recordCall("early:relationship");
  return [];
});
const mockInitializeRelationships = vi.fn(() => []);
vi.mock("./relationshipEngine", () => ({
  analyzeRelationships: mockAnalyzeRelationships,
  initializeRelationships: mockInitializeRelationships,
}));

const mockGenerateWorldEvents = vi.fn(async () => {
  recordCall("early:worldEvents");
  return [];
});
vi.mock("./eventEngine", () => ({
  generateWorldEvents: mockGenerateWorldEvents,
}));

const mockRunDirector = vi.fn(async () => {
  recordCall("director");
  return {
    speakerIds: ["mira"],
    sceneUpdate: "Scene update",
    narration: "Narration text",
  };
});
vi.mock("./director", () => ({
  runDirector: mockRunDirector,
}));

const mockExtractMemories = vi.fn(async () => {
  recordCall("late:memories");
  return { worldFacts: [], characterMemories: [] };
});
vi.mock("./memoryExtractor", () => ({
  extractMemories: mockExtractMemories,
}));

const mockExtractClues = vi.fn(async () => {
  recordCall("late:clues");
  return [];
});
vi.mock("./clueEngine", () => ({
  extractClues: mockExtractClues,
}));

vi.mock("./buildPrompt", () => ({
  buildSystemPrompt: vi.fn(() => "system"),
  buildUserPrompt: vi.fn(() => "user"),
}));

vi.mock("./memoryRetriever", () => ({
  retrieveMemories: vi.fn(() => ({ facts: [], personalMemories: [] })),
  formatMemoriesForPrompt: vi.fn(() => ""),
}));

vi.mock("./worldTime", () => ({
  advanceTime: vi.fn((wt: unknown) => wt),
  formatWorldTime: vi.fn(() => "Day 1, Night"),
  timeAtmosphere: vi.fn(() => "Dark"),
}));

vi.mock("./emotionalState", () => ({
  computeEmotionalState: vi.fn(() => ({ mood: "calm", arousal: 30, description: "neutral" })),
}));

// --- World fixture ---
function makeWorld() {
  return {
    id: "test-world",
    name: "Test World",
    genre: "mystery",
    scene: { name: "Test Scene", description: "A test scene" },
    characters: [
      {
        id: "mira",
        name: "Mira",
        role: "doctor",
        personality: "cautious",
        secrets: [],
        speech_style: "terse",
        backstory: "A doctor",
        initial_relationships: {},
      },
    ],
    rules: ["Rule 1"],
    opening: "The story begins.",
  } as any;
}

// --- Reset before each test ---
beforeEach(() => {
  vi.clearAllMocks();
  callOrder = [];
  characterDeferred = deferred<string>();
  providerMocks.getProvider.mockReturnValue({
    provider: { generate: mockGenerate },
    isMock: false,
    envFallback: null,
  });
  storeMocks.getRelationships.mockReturnValue([]);
  storeMocks.getRecentMessages.mockReturnValue([]);
  storeMocks.getWorldFacts.mockReturnValue([]);
  storeMocks.getCharacterMemories.mockReturnValue([]);
  storeMocks.getWorldEvents.mockReturnValue([]);
  storeMocks.getWorldTime.mockReturnValue({ day: 1, timeOfDay: "night", turnCount: 1 });
  mockInitializeRelationships.mockReturnValue([]);
});

// Helper: resolve character generation after a tick, allowing early extraction to start
function resolveCharacterAfterTick() {
  // Resolve on next microtask — this gives early extraction a chance to start
  // but character generation completes before late extraction can begin
  Promise.resolve().then(() => {
    characterDeferred.resolve("Mira's dialogue");
  });
}

// ============================================================
// Group 1: Timing / ordering tests
// ============================================================
describe("runTurn extraction ordering", () => {
  it("early extraction (relationship + events) is invoked before late extraction in the turn flow", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    // Both early extractions should have been invoked
    expect(mockAnalyzeRelationships).toHaveBeenCalledTimes(1);
    expect(mockGenerateWorldEvents).toHaveBeenCalledTimes(1);

    // Verify they appear in callOrder before late extraction entries.
    // Note: this proves invocation order (early before late), not wall-clock
    // completion order relative to character:end — that is proven by the
    // dedicated "late extraction starts after character generation ends" test below.
    const earlyRelIdx = callOrder.indexOf("early:relationship");
    const earlyEvtIdx = callOrder.indexOf("early:worldEvents");
    const lateMemIdx = callOrder.indexOf("late:memories");

    expect(earlyRelIdx).toBeGreaterThanOrEqual(0);
    expect(earlyEvtIdx).toBeGreaterThanOrEqual(0);
    expect(lateMemIdx).toBeGreaterThan(earlyRelIdx);
    expect(lateMemIdx).toBeGreaterThan(earlyEvtIdx);
  });

  it("late extraction (memories + clues) starts after character generation ends", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    // Late extractions should have run
    expect(mockExtractMemories).toHaveBeenCalledTimes(1);
    expect(mockExtractClues).toHaveBeenCalledTimes(1);

    // Key assertion: character:end must come BEFORE late:memories and late:clues
    const charEndIdx = callOrder.indexOf("character:end");
    const lateMemIdx = callOrder.indexOf("late:memories");
    const lateClueIdx = callOrder.indexOf("late:clues");

    expect(charEndIdx).toBeGreaterThanOrEqual(0);
    expect(lateMemIdx).toBeGreaterThan(charEndIdx);
    expect(lateClueIdx).toBeGreaterThan(charEndIdx);
  });

  it("turnMessages dependency is not broken by early/late split — late extraction receives character messages", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    // extractMemories should have been called with turnMessages that include
    // the character's response. The 5th argument (index 4) is turnMessages.
    const memCall = mockExtractMemories.mock.calls[0] as any[];
    const turnMessages = memCall[4];
    // turnMessages should contain the user message + at least 1 character message
    expect(turnMessages.length).toBeGreaterThanOrEqual(2);
    expect(turnMessages.some((m: any) => m.speakerType === "character")).toBe(true);
  });

  it("director runs before character generation", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    const directorIdx = callOrder.indexOf("director");
    const charStartIdx = callOrder.indexOf("character:start");
    expect(directorIdx).toBeGreaterThanOrEqual(0);
    expect(charStartIdx).toBeGreaterThan(directorIdx);
  });
});

// ============================================================
// Group 2: Investigation action semantics
// ============================================================
describe("runTurn investigation action semantics", () => {
  it("[Look Around] still executes relationship analysis", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "[Look Around] I examine the room", undefined, "en", "Player");
    expect(mockAnalyzeRelationships).toHaveBeenCalledTimes(1);
  });

  it("[Look Around] still executes world event analysis", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "[Look Around] I examine the room", undefined, "en", "Player");
    expect(mockGenerateWorldEvents).toHaveBeenCalledTimes(1);
  });

  it("[Listen] still executes both early extractions", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "[Listen] I listen carefully", undefined, "en", "Player");
    expect(mockAnalyzeRelationships).toHaveBeenCalledTimes(1);
    expect(mockGenerateWorldEvents).toHaveBeenCalledTimes(1);
  });

  it("[Think] still executes both early extractions", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "[Think] I organize my thoughts", undefined, "en", "Player");
    expect(mockAnalyzeRelationships).toHaveBeenCalledTimes(1);
    expect(mockGenerateWorldEvents).toHaveBeenCalledTimes(1);
  });

  it("investigation action still executes late extractions", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "[Look Around] I examine the room", undefined, "en", "Player");
    expect(mockExtractMemories).toHaveBeenCalledTimes(1);
    expect(mockExtractClues).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Group 3: Empty relationships semantics
// ============================================================
describe("runTurn empty relationships semantics", () => {
  it("world event analysis runs even when getRelationships returns empty", async () => {
    storeMocks.getRelationships.mockReturnValue([]);
    mockInitializeRelationships.mockReturnValue([]);
    resolveCharacterAfterTick();

    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");
    expect(mockGenerateWorldEvents).toHaveBeenCalledTimes(1);
  });

  it("world event analysis runs on first turn (no existing relationships)", async () => {
    storeMocks.getRelationships.mockReturnValue([]);
    mockInitializeRelationships.mockReturnValue([]);
    storeMocks.getRecentMessages.mockReturnValue([]); // first turn
    resolveCharacterAfterTick();

    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");
    expect(mockGenerateWorldEvents).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Group 4: Mock provider skips
// ============================================================
describe("runTurn mock provider", () => {
  it("skips all 4 extractions for mock provider", async () => {
    // In mock mode, character generation uses MockProvider which doesn't
    // go through the deferred mockGenerate. Use a simple non-blocking mock.
    const mockGenSimple = vi.fn(async () => "mock dialogue");
    providerMocks.getProvider.mockReturnValue({
      provider: { generate: mockGenSimple },
      isMock: true,
      envFallback: null,
    });

    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");
    expect(mockAnalyzeRelationships).not.toHaveBeenCalled();
    expect(mockGenerateWorldEvents).not.toHaveBeenCalled();
    expect(mockExtractMemories).not.toHaveBeenCalled();
    expect(mockExtractClues).not.toHaveBeenCalled();
  });
});

// ============================================================
// Group 5: GENERATION_OPTIONS passthrough
// ============================================================
describe("GENERATION_OPTIONS passthrough", () => {
  it("passes extraction options to analyzeRelationships", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    const optionsArg = mockAnalyzeRelationships.mock.calls[0][mockAnalyzeRelationships.mock.calls[0].length - 1];
    expect(optionsArg).toMatchObject({ maxTokens: 260, temperature: 0.2, timeoutMs: 9000 });
  });

  it("passes extraction options to generateWorldEvents", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    const optionsArg = mockGenerateWorldEvents.mock.calls[0][mockGenerateWorldEvents.mock.calls[0].length - 1];
    expect(optionsArg).toMatchObject({ maxTokens: 260, temperature: 0.2, timeoutMs: 9000 });
  });

  it("passes extraction options to extractMemories", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    const optionsArg = mockExtractMemories.mock.calls[0][mockExtractMemories.mock.calls[0].length - 1];
    expect(optionsArg).toMatchObject({ maxTokens: 260, temperature: 0.2, timeoutMs: 9000 });
  });

  it("passes extraction options to extractClues", async () => {
    resolveCharacterAfterTick();
    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player");

    const optionsArg = mockExtractClues.mock.calls[0][mockExtractClues.mock.calls[0].length - 1];
    expect(optionsArg).toMatchObject({ maxTokens: 260, temperature: 0.2, timeoutMs: 9000 });
  });
});

// ============================================================
// Group 6: Stream fallback — partial delta + reset
// ============================================================
describe("runTurn stream fallback", () => {
  it("emits character_reset before fallback content when stream fails after partial output", async () => {
    // Set up a provider with stream() that yields partial content then throws
    let callCount = 0;
    async function* mockStream() {
      callCount++;
      yield "partial ";
      throw new Error("stream connection lost");
    }
    const mockGenerateSimple = vi.fn(async () => "Fallback complete text");
    providerMocks.getProvider.mockReturnValue({
      provider: { generate: mockGenerateSimple, stream: mockStream } as any,
      isMock: false,
      envFallback: null,
    });

    const events: { type: string; data: unknown }[] = [];
    const mockOnEvent = vi.fn((event: { type: string; data: unknown }) => events.push(event));

    const { runTurn } = await import("./runTurn");
    await runTurn("session-1", makeWorld(), "Hello", undefined, "en", "Player", mockOnEvent);

    // Find character_reset and character_delta events for the same character
    const resetEvents = events.filter((e) =>
      e.type === "content" && (e.data as { kind: string }).kind === "character_reset"
    );
    const deltaEvents = events.filter((e) =>
      e.type === "content" && (e.data as { kind: string }).kind === "character_delta"
    );

    // A reset event must have been emitted
    expect(resetEvents.length).toBeGreaterThanOrEqual(1);

    // For the character that had partial stream, verify ordering:
    // 1. partial deltas, 2. reset, 3. fallback full text
    const charId = (resetEvents[0].data as { characterId: string }).characterId;
    const charDeltas = deltaEvents.filter(
      (e) => (e.data as { characterId: string }).characterId === charId
    );
    const resetIdx = events.findIndex(
      (e) => e.type === "content" && (e.data as { kind: string; characterId: string }).kind === "character_reset" && (e.data as { characterId: string }).characterId === charId
    );

    // There should be deltas before the reset (from partial stream)
    const deltasBeforeReset = events.filter(
      (e, i) => i < resetIdx && e.type === "content" && (e.data as { kind: string }).kind === "character_delta" && (e.data as { characterId: string }).characterId === charId
    );
    expect(deltasBeforeReset.length).toBeGreaterThanOrEqual(1);

    // There should be a delta after the reset (from fallback)
    const deltasAfterReset = events.filter(
      (e, i) => i > resetIdx && e.type === "content" && (e.data as { kind: string }).kind === "character_delta" && (e.data as { characterId: string }).characterId === charId
    );
    expect(deltasAfterReset.length).toBe(1);
    // The fallback delta should contain the full text, not the partial prefix
    expect((deltasAfterReset[0].data as { text: string }).text).toBe("Fallback complete text");
  });
});
