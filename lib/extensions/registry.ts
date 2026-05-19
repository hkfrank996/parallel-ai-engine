/**
 * Extension registry — maps extension point keys to their default implementations.
 *
 * This is NOT a dynamic plugin loader. It's a typed lookup table that makes it
 * clear where each extension point lives and how to swap in a new implementation.
 */

import type {
  ModelProviderAdapter,
  MemoryProvider,
  EventGenerator,
  WorldTemplateProvider,
} from "./types";

// ---------------------------------------------------------------------------
// Default registrations (wired at build time)
// ---------------------------------------------------------------------------

const modelAdapters = new Map<string, ModelProviderAdapter>();
const memoryProviders = new Map<string, MemoryProvider>();
const eventGenerators = new Map<string, EventGenerator>();
const worldTemplateProviders = new Map<string, WorldTemplateProvider>();

// ---------------------------------------------------------------------------
// Registration helpers
// ---------------------------------------------------------------------------

export function registerModelAdapter(adapter: ModelProviderAdapter) {
  modelAdapters.set(adapter.key, adapter);
}

export function registerMemoryProvider(provider: MemoryProvider) {
  memoryProviders.set(provider.key, provider);
}

export function registerEventGenerator(generator: EventGenerator) {
  eventGenerators.set(generator.key, generator);
}

export function registerWorldTemplateProvider(provider: WorldTemplateProvider) {
  worldTemplateProviders.set(provider.key, provider);
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getModelAdapter(key: string): ModelProviderAdapter | undefined {
  return modelAdapters.get(key);
}

export function getMemoryProvider(key: string): MemoryProvider | undefined {
  return memoryProviders.get(key);
}

export function getEventGenerator(key: string): EventGenerator | undefined {
  return eventGenerators.get(key);
}

export function getWorldTemplateProvider(key: string): WorldTemplateProvider | undefined {
  return worldTemplateProviders.get(key);
}

// ---------------------------------------------------------------------------
// List all registered keys (useful for UI / docs)
// ---------------------------------------------------------------------------

export function listModelAdapterKeys(): string[] {
  return [...modelAdapters.keys()];
}

export function listMemoryProviderKeys(): string[] {
  return [...memoryProviders.keys()];
}

export function listEventGeneratorKeys(): string[] {
  return [...eventGenerators.keys()];
}

export function listWorldTemplateProviderKeys(): string[] {
  return [...worldTemplateProviders.keys()];
}
