import { LLMGenerateOptions, LLMProvider } from "./types";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private useBearer: boolean;
  private timeoutMs: number;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 90000);
    const lower = baseUrl.toLowerCase();
    this.useBearer = !lower.includes("anthropic.com") && !lower.includes("bigmodel.cn");
  }

  async generate(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): Promise<string> {
    let base = this.baseUrl;
    if (!base.includes("/v1")) {
      base = base.replace(/\/$/, "") + "/v1";
    }
    const url = `${base}/messages`;
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    const temperature = options?.temperature ?? 0.8;
    const maxTokens = options?.maxTokens ?? 800;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (this.useBearer) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else {
      headers["x-api-key"] = this.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        throw new Error(`Anthropic API timeout after ${timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    const body = await res.json();

    if (!res.ok) {
      const msg = body?.error?.message || body?.message || `status ${res.status}`;
      throw new Error(`Anthropic API error: ${msg}`);
    }

    if (body.code && !body.content) {
      throw new Error(`API error: ${body.msg || body.message || "unknown error"}`);
    }

    const text = body.content?.find((c: {type: string; text?: string}) => c.type === "text")?.text?.trim();
    if (!text) {
      throw new Error("Anthropic API returned an empty response");
    }
    return text;
  }
}
