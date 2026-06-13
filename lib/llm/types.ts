export interface LLMGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  characterId?: string;
  signal?: AbortSignal;
}

export interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): Promise<string>;
  stream?(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): AsyncIterable<string>;
}

/** Error class to identify when an LLM call was aborted by the caller. */
export class AbortError extends Error {
  constructor(public reason?: string) {
    super(reason || "aborted");
    this.name = "AbortError";
  }
}

export function isAbortError(err: unknown): err is AbortError {
  if (!err) return false;
  if (err instanceof AbortError) return true;
  if ((err as Error).name === "AbortError") return true;
  return false;
}
