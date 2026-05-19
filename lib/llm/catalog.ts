/**
 * Provider registry — single source of truth for provider metadata.
 *
 * To add a new provider:
 *  1. Add an entry here
 *  2. Handle it in provider.ts (if not OpenAI-compatible) or let the
 *     generic OpenAI path handle it
 *  3. Add a button in SettingsModal.tsx
 */

export type ProviderKey = "openai" | "anthropic" | "openrouter" | "ollama" | "mock";

export interface ProviderMeta {
  key: ProviderKey;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresKey: boolean;
  /** true = uses /v1/chat/completions (OpenAI protocol) */
  openaiCompatible: boolean;
  placeholderKey: string;
  placeholderModel: string;
}

export const PROVIDER_CATALOG: Record<ProviderKey, ProviderMeta> = {
  openai: {
    key: "openai",
    label: "OpenAI-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresKey: false, // Generic OpenAI-compatible — key may be optional (local servers, etc.)
    openaiCompatible: true,
    placeholderKey: "sk-... (optional for local servers)",
    placeholderModel: "gpt-4o-mini",
  },
  anthropic: {
    key: "anthropic",
    label: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
    requiresKey: true,
    openaiCompatible: false,
    placeholderKey: "sk-ant-...",
    placeholderModel: "claude-sonnet-4-20250514",
  },
  openrouter: {
    key: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    requiresKey: true,
    openaiCompatible: true,
    placeholderKey: "sk-or-...",
    placeholderModel: "openai/gpt-4o-mini",
  },
  ollama: {
    key: "ollama",
    label: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3",
    requiresKey: false,
    openaiCompatible: true,
    placeholderKey: "(not needed)",
    placeholderModel: "llama3",
  },
  mock: {
    key: "mock",
    label: "Mock Mode",
    defaultBaseUrl: "",
    defaultModel: "",
    requiresKey: false,
    openaiCompatible: false,
    placeholderKey: "",
    placeholderModel: "",
  },
};

export const PROVIDER_KEYS = Object.keys(PROVIDER_CATALOG) as ProviderKey[];

export const SETTINGS_PROVIDER_KEYS: ProviderKey[] = ["openai", "openrouter", "ollama", "anthropic"];

export function getProviderMeta(key: string): ProviderMeta | undefined {
  return PROVIDER_CATALOG[key as ProviderKey];
}
