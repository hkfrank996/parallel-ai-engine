import { LLMProvider } from "./types";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private useBearer: boolean;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
    const lower = baseUrl.toLowerCase();
    this.useBearer = !lower.includes("anthropic.com") && !lower.includes("bigmodel.cn");
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    let base = this.baseUrl;
    if (!base.includes("/v1")) {
      base = base.replace(/\/$/, "") + "/v1";
    }
    const url = `${base}/messages`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (this.useBearer) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else {
      headers["x-api-key"] = this.apiKey;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: 800,
        temperature: 0.8,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${JSON.stringify(body)}`);
    }

    if (body.code && !body.content) {
      throw new Error(`API error: ${body.msg || body.message || JSON.stringify(body)}`);
    }

    const text = body.content?.[0]?.text?.trim();
    if (!text) {
      throw new Error(`Empty response: ${JSON.stringify(body).slice(0, 300)}`);
    }
    return text;
  }
}
