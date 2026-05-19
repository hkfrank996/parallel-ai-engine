/**
 * Extension point interfaces — v0.6 lightweight extension layer.
 *
 * These define the boundaries for future expansion without requiring
 * a dynamic plugin system. Current implementations remain in-place;
 * new implementations can be swapped in by providing an object that
 * satisfies the interface.
 */

import type { LLMProvider } from "@/lib/llm/types";

// ---------------------------------------------------------------------------
// 1. ModelProviderAdapter
// ---------------------------------------------------------------------------

export interface ModelProviderAdapter {
  /** Unique key (matches ProviderKey in catalog.ts) */
  readonly key: string;
  /** Human-readable label for UI */
  readonly label: string;
  /** Build a concrete LLMProvider from config */
  createProvider(config: {
    apiKey: string;
    baseUrl: string;
    model: string;
  }): LLMProvider;
}

// ---------------------------------------------------------------------------
// 2. MemoryProvider
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  id: string;
  sessionId: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface MemoryProvider {
  readonly key: string;
  /** Store a new memory entry */
  save(entry: Omit<MemoryEntry, "id">): MemoryEntry;
  /** Retrieve memories for a session, optionally filtered */
  query(sessionId: string, filter?: { category?: string; limit?: number }): MemoryEntry[];
}

// ---------------------------------------------------------------------------
// 3. EventGenerator
// ---------------------------------------------------------------------------

export interface WorldEventInput {
  sessionId: string;
  recentMessages: string[];
  relationships: Record<string, number>;
  worldTime: { day: number; timeOfDay: string };
  tension: string;
}

export interface GeneratedEvent {
  type: string;
  description: string;
  involvedCharacterIds: string[];
}

export interface EventGenerator {
  readonly key: string;
  generate(input: WorldEventInput): Promise<GeneratedEvent | null>;
}

// ---------------------------------------------------------------------------
// 4. WorldTemplateProvider
// ---------------------------------------------------------------------------

export interface WorldTemplate {
  id: string;
  name: string;
  description: string;
  genre: string;
  yaml: string;
}

export interface WorldTemplateProvider {
  readonly key: string;
  listTemplates(): WorldTemplate[];
  getTemplate(id: string): WorldTemplate | null;
}
