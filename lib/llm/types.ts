export interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}
