import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Test 2: Re-importing doesn't duplicate data
 *
 * importSessionData should CLEAR existing session data before importing,
 * so calling it twice with the same sessionId must NOT double the entries.
 *
 * Strategy: mock fs so the store module operates on an in-memory
 * JSON object instead of the real data/store.json.
 */

// ── In-memory store backing the mock (module scope, mutable) ──
let memStore: Record<string, unknown[]> = {};

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const path = await import("path");

  const fakeCwd = "/vitest-fake-cwd";
  const storeFilePath = path.join(fakeCwd, "data", "store.json");
  const tmpFilePath = path.join(fakeCwd, "data", "store.json.tmp");
  const dataDirPath = path.join(fakeCwd, "data");

  return {
    ...actual,
    existsSync: (p: string) => {
      if (p === storeFilePath) return Object.keys(memStore).length > 0;
      if (p === dataDirPath) return true;
      return actual.existsSync(p);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readFileSync: (p: any, opts?: any) => {
      if (p === storeFilePath) return JSON.stringify(memStore);
      return actual.readFileSync(p, opts);
    },
    writeFileSync: (p: string, data: string) => {
      if (p === tmpFilePath) {
        memStore = JSON.parse(data);
        return;
      }
      return actual.writeFileSync(p, data);
    },
    renameSync: (oldP: string, newP: string) => {
      if (newP === storeFilePath) return; // tmp -> store.json is a no-op
      return actual.renameSync(oldP, newP);
    },
    mkdirSync: () => undefined,
    copyFileSync: () => undefined,
  };
});

vi.mock("process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("process")>();
  return { ...actual, cwd: () => "/vitest-fake-cwd" };
});

// ── Import the store module AFTER mocks are installed ─────────
import {
  importSessionData,
  getMessages,
  getEvents,
  getWorldFacts,
  getCharacterMemories,
  getRelationships,
  getWorldEvents,
  getClues,
} from "./store";

// ── Tests ─────────────────────────────────────────────────────
beforeEach(() => {
  memStore = {};
});

describe("importSessionData — dedup on re-import", () => {
  it("does not duplicate messages when called twice with the same sessionId", () => {
    const sessionId = "session-dedup-msg";
    const messages = [
      {
        id: "msg-1",
        sessionId: "orig",
        speakerType: "user" as const,
        speakerId: "p1",
        speakerName: "Alice",
        content: "Hello",
        createdAt: "2026-05-23T00:00:00Z",
      },
      {
        id: "msg-2",
        sessionId: "orig",
        speakerType: "character" as const,
        speakerId: "c1",
        speakerName: "Bob",
        content: "Hi",
        createdAt: "2026-05-23T00:01:00Z",
      },
    ];

    importSessionData(sessionId, "w", { messages });
    expect(getMessages(sessionId)).toHaveLength(2);

    // Second import with SAME data — should NOT produce 4
    importSessionData(sessionId, "w", { messages });
    expect(getMessages(sessionId)).toHaveLength(2);
  });

  it("does not duplicate events when called twice", () => {
    const sid = "session-dedup-evt";
    const events = [
      { id: "e1", sessionId: "orig", summary: "Something", turnIndex: 1, createdAt: "2026-05-23T00:00:00Z" },
    ];

    importSessionData(sid, "w", { events });
    importSessionData(sid, "w", { events });

    expect(getEvents(sid)).toHaveLength(1);
  });

  it("does not duplicate worldFacts when called twice", () => {
    const sid = "session-dedup-facts";
    const worldFacts = [
      { id: "f1", sessionId: "orig", fact: "Door locked", turnIndex: 0, createdAt: "2026-05-23T00:00:00Z" },
    ];

    importSessionData(sid, "w", { worldFacts });
    importSessionData(sid, "w", { worldFacts });

    expect(getWorldFacts(sid)).toHaveLength(1);
  });

  it("does not duplicate characterMemories when called twice", () => {
    const sid = "session-dedup-mem";
    const characterMemories = [
      {
        id: "m1", sessionId: "orig", characterId: "c1",
        category: "impression" as const, about: "Alice",
        content: "Nervous", turnIndex: 2, createdAt: "2026-05-23T00:00:00Z",
      },
    ];

    importSessionData(sid, "w", { characterMemories });
    importSessionData(sid, "w", { characterMemories });

    expect(getCharacterMemories(sid)).toHaveLength(1);
  });

  it("does not duplicate relationships when called twice", () => {
    const sid = "session-dedup-rel";
    const relationships = [
      {
        id: "r1", sessionId: "orig", fromId: "c1", toId: "c2",
        trust: 50, hostility: 10, dependency: 20,
        turnIndex: 0, updatedAt: "2026-05-23T00:00:00Z",
      },
    ];

    importSessionData(sid, "w", { relationships });
    importSessionData(sid, "w", { relationships });

    expect(getRelationships(sid)).toHaveLength(1);
  });

  it("does not duplicate worldEvents when called twice", () => {
    const sid = "session-dedup-we";
    const worldEvents = [
      {
        id: "we1", sessionId: "orig", type: "plot_twist" as const,
        description: "Secret passage", impact: "New area",
        turnIndex: 3, createdAt: "2026-05-23T00:00:00Z",
      },
    ];

    importSessionData(sid, "w", { worldEvents });
    importSessionData(sid, "w", { worldEvents });

    expect(getWorldEvents(sid)).toHaveLength(1);
  });

  it("does not duplicate clues when called twice", () => {
    const sid = "session-dedup-clue";
    const clues = [
      {
        id: "c1", sessionId: "orig", name: "Bloody knife",
        description: "Kitchen", source: "examination" as const,
        turnIndex: 1, createdAt: "2026-05-23T00:00:00Z",
      },
    ];

    importSessionData(sid, "w", { clues });
    importSessionData(sid, "w", { clues });

    expect(getClues(sid)).toHaveLength(1);
  });

  it("does not duplicate all field types simultaneously", () => {
    const sid = "session-dedup-all";
    const sessionData = {
      messages: [
        { id: "msg-1", sessionId: "orig", speakerType: "user" as const, speakerId: "p1", speakerName: "A", content: "T", createdAt: "2026-05-23T00:00:00Z" },
      ],
      events: [
        { id: "evt-1", sessionId: "orig", summary: "E", turnIndex: 0, createdAt: "2026-05-23T00:00:00Z" },
      ],
      worldFacts: [
        { id: "fact-1", sessionId: "orig", fact: "F", turnIndex: 0, createdAt: "2026-05-23T00:00:00Z" },
      ],
      characterMemories: [
        { id: "mem-1", sessionId: "orig", characterId: "c1", category: "impression" as const, about: "S", content: "M", turnIndex: 0, createdAt: "2026-05-23T00:00:00Z" },
      ],
      relationships: [
        { id: "rel-1", sessionId: "orig", fromId: "c1", toId: "c2", trust: 50, hostility: 0, dependency: 0, turnIndex: 0, updatedAt: "2026-05-23T00:00:00Z" },
      ],
      worldEvents: [
        { id: "we-1", sessionId: "orig", type: "environment" as const, description: "D", impact: "I", turnIndex: 0, createdAt: "2026-05-23T00:00:00Z" },
      ],
      clues: [
        { id: "clue-1", sessionId: "orig", name: "C", description: "D", source: "dialogue" as const, turnIndex: 0, createdAt: "2026-05-23T00:00:00Z" },
      ],
    };

    importSessionData(sid, "w", sessionData);
    importSessionData(sid, "w", sessionData);

    expect(getMessages(sid)).toHaveLength(1);
    expect(getEvents(sid)).toHaveLength(1);
    expect(getWorldFacts(sid)).toHaveLength(1);
    expect(getCharacterMemories(sid)).toHaveLength(1);
    expect(getRelationships(sid)).toHaveLength(1);
    expect(getWorldEvents(sid)).toHaveLength(1);
    expect(getClues(sid)).toHaveLength(1);
  });

  it("does not affect other sessions when re-importing one session", () => {
    const sidA = "session-a";
    const sidB = "session-b";

    const msgsA = [
      { id: "a1", sessionId: "orig", speakerType: "user" as const, speakerId: "p1", speakerName: "A", content: "From A", createdAt: "2026-05-23T00:00:00Z" },
    ];
    const msgsB = [
      { id: "b1", sessionId: "orig", speakerType: "user" as const, speakerId: "p2", speakerName: "B", content: "From B", createdAt: "2026-05-23T00:00:00Z" },
    ];

    importSessionData(sidA, "w-a", { messages: msgsA });
    importSessionData(sidB, "w-b", { messages: msgsB });

    // Re-import session A
    importSessionData(sidA, "w-a", { messages: msgsA });

    expect(getMessages(sidA)).toHaveLength(1);
    expect(getMessages(sidB)).toHaveLength(1);
    expect(getMessages(sidB)[0].id).toBe("b1");
  });
});
