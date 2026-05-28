export interface LLMGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  characterId?: string;
}

export interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): Promise<string>;
}
