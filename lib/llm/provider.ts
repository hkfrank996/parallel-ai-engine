import { LLMProvider } from "./types";
import { MockProvider } from "./mockProvider";
import { OpenAIProvider } from "./openaiProvider";
import { AnthropicProvider } from "./anthropicProvider";
import { type ProviderKey, getProviderMeta } from "./catalog";

export type { ProviderKey };

export interface LLMConfig {
  providerType?: ProviderKey;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

export function getProvider(config?: LLMConfig): {
  provider: LLMProvider;
  isMock: boolean;
  providerType: ProviderKey;
  model?: string;
  envFallback: LLMProvider | null;
} {
  const configApiKey = config?.apiKey?.trim();
  const requestedProvider = resolveProviderKey(config);
  const envProvider = normalizeProviderKey(process.env.LLM_PROVIDER);

  // --- Config-provided key takes highest priority ---
  if (configApiKey) {
    return buildFromConfig(requestedProvider, configApiKey, config);
  }

  // --- Config-provided provider (even without key) ---
  // If the user explicitly set providerType, apiUrl, or model, they want
  // a specific provider — not Mock Mode. apiKey may be optional (e.g. Ollama).
  const hasExplicitConfig = config?.providerType || config?.apiUrl || config?.model;
  if (hasExplicitConfig) {
    // Pass real empty key — OpenAI-compatible providers handle it correctly
    // (no Authorization header when key is empty). Providers that require
    // a key (anthropic, openrouter) are validated at the API route level.
    return buildFromConfig(requestedProvider, "", config);
  }

  // --- Env-based fallback ---
  if (envProvider && envProvider !== "mock") {
    const envResult = buildFromEnv(envProvider);
    if (envResult) return envResult;
  }

  // --- Auto-detect from env vars ---
  if (process.env.OPENAI_API_KEY) {
    return buildFromEnv("openai")!;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return buildFromEnv("anthropic")!;
  }

  return buildMock();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveProviderKey(config?: LLMConfig): ProviderKey {
  if (config?.providerType) {
    const meta = getProviderMeta(config.providerType);
    if (meta) return config.providerType;
  }
  return inferProviderKey(config);
}

function inferProviderKey(config?: LLMConfig): ProviderKey {
  const url = config?.apiUrl?.toLowerCase() || "";
  const model = config?.model?.toLowerCase() || "";
  if (url.includes("anthropic") || model.includes("claude")) return "anthropic";
  if (url.includes("openrouter")) return "openrouter";
  if (url.includes("localhost:11434") || url.includes("ollama")) return "ollama";
  return "openai";
}

function normalizeProviderKey(value?: string): ProviderKey | undefined {
  if (!value) return undefined;
  const meta = getProviderMeta(value);
  return meta ? (value as ProviderKey) : undefined;
}

function buildFromConfig(
  providerKey: ProviderKey,
  apiKey: string,
  config?: LLMConfig,
): {
  provider: LLMProvider;
  isMock: boolean;
  providerType: ProviderKey;
  model?: string;
  envFallback: LLMProvider | null;
} {
  const meta = getProviderMeta(providerKey)!;

  if (providerKey === "anthropic") {
    const baseUrl = config?.apiUrl || process.env.ANTHROPIC_BASE_URL || meta.defaultBaseUrl;
    const model = config?.model || process.env.ANTHROPIC_MODEL || meta.defaultModel;
    return {
      provider: new AnthropicProvider(apiKey, baseUrl, model),
      isMock: false,
      providerType: "anthropic",
      model,
      envFallback: buildEnvFallback(apiKey),
    };
  }

  // All other providers (openai, openrouter, ollama) use OpenAI-compatible protocol
  const baseUrl = config?.apiUrl || getDefaultBaseUrl(providerKey) || meta.defaultBaseUrl;
  const model = config?.model || getDefaultModel(providerKey) || meta.defaultModel;
  return {
    provider: new OpenAIProvider(apiKey, baseUrl, model),
    isMock: false,
    providerType: providerKey,
    model,
    envFallback: buildEnvFallback(apiKey),
  };
}

function buildFromEnv(providerKey: ProviderKey): {
  provider: LLMProvider;
  isMock: boolean;
  providerType: ProviderKey;
  model?: string;
  envFallback: LLMProvider | null;
} | null {
  if (providerKey === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    return {
      provider: new AnthropicProvider(apiKey, baseUrl, model),
      isMock: false,
      providerType: "anthropic",
      model,
      envFallback: null,
    };
  }

  if (providerKey === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;
    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    return {
      provider: new OpenAIProvider(apiKey, baseUrl, model),
      isMock: false,
      providerType: "openrouter",
      model,
      envFallback: null,
    };
  }

  if (providerKey === "ollama") {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
    const model = process.env.OLLAMA_MODEL || "llama3";
    return {
      provider: new OpenAIProvider("ollama", baseUrl, model),
      isMock: false,
      providerType: "ollama",
      model,
      envFallback: null,
    };
  }

  // Default: openai
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  return {
    provider: new OpenAIProvider(apiKey, baseUrl, model),
    isMock: false,
    providerType: "openai",
    model,
    envFallback: null,
  };
}

function getDefaultBaseUrl(key: ProviderKey): string | undefined {
  const envMap: Partial<Record<ProviderKey, string>> = {
    openai: process.env.OPENAI_BASE_URL,
    openrouter: process.env.OPENROUTER_BASE_URL,
    ollama: process.env.OLLAMA_BASE_URL,
  };
  return envMap[key];
}

function getDefaultModel(key: ProviderKey): string | undefined {
  const envMap: Partial<Record<ProviderKey, string>> = {
    openai: process.env.OPENAI_MODEL,
    openrouter: process.env.OPENROUTER_MODEL,
    ollama: process.env.OLLAMA_MODEL,
  };
  return envMap[key];
}

function buildMock(): {
  provider: LLMProvider;
  isMock: boolean;
  providerType: ProviderKey;
  model?: string;
  envFallback: LLMProvider | null;
} {
  return {
    provider: new MockProvider(),
    isMock: true,
    providerType: "mock",
    envFallback: null,
  };
}

function buildEnvFallback(activeKey: string): LLMProvider | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== activeKey) {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    return new OpenAIProvider(openaiKey, baseUrl, model);
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey !== activeKey) {
    const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    return new AnthropicProvider(anthropicKey, baseUrl, model);
  }

  return null;
}
