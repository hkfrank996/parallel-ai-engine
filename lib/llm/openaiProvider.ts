import { LLMGenerateOptions, LLMProvider } from "./types";

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 90000);
  }

  async generate(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): Promise<string> {
    const endpoints = buildChatCompletionsUrls(this.baseUrl);
    let lastEndpoint = endpoints[0];
    let lastError = "";
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    const temperature = options?.temperature ?? 0.8;
    const maxTokens = options?.maxTokens ?? 4096;

    for (const endpoint of endpoints) {
      lastEndpoint = endpoint;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (this.apiKey) {
          headers.Authorization = `Bearer ${this.apiKey}`;
        }
        res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`OpenAI API timeout after ${timeoutMs}ms`);
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("OpenAI API error body:", text.slice(0, 1000));
        lastError = `OpenAI API error ${res.status}`;
        if (shouldTryNextEndpoint(res.status)) continue;
        throw new Error(lastError);
      }

      const text = await res.text();
      if (looksLikeHtml(text, res.headers.get("content-type"))) {
        lastError = `OpenAI API endpoint returned HTML (status ${res.status})`;
        continue;
      }

      try {
        const data = parseOpenAIResponse(text);
        const content = extractText(data);
        if (!content) {
          lastError = "OpenAI API empty response";
          continue;
        }
        return content;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastError = message;
        continue;
      }
    }

    throw new Error(lastError || "OpenAI API request failed");
  }
}

function parseOpenAIResponse(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("OpenAI API returned an empty body");
  }

  if (!trimmed.startsWith("data:")) {
    return JSON.parse(trimmed);
  }

  let lastJson: unknown = null;
  const chunks: string[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const payload = line.trim();
    if (!payload.startsWith("data:")) continue;
    const data = payload.slice(5).trim();
    if (!data || data === "[DONE]") continue;

    const parsed = JSON.parse(data);
    lastJson = parsed;

    const delta = (parsed as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
    if (delta) chunks.push(delta);
  }

  if (chunks.length > 0) {
    return { choices: [{ message: { content: chunks.join("") } }] };
  }

  if (lastJson) return lastJson;
  throw new Error("OpenAI API SSE response contained no JSON payload");
}

function extractText(data: unknown): string {
  const body = data as {
    choices?: { message?: { content?: string | { text?: string }[] }; text?: string }[];
    output_text?: string;
    content?: string;
  };

  const content = body.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part) => part.text || "").join("").trim();
  }

  if (typeof body.choices?.[0]?.text === "string") return body.choices[0].text.trim();
  if (typeof body.output_text === "string") return body.output_text.trim();
  if (typeof body.content === "string") return body.content.trim();
  return "";
}

function shouldTryNextEndpoint(status: number): boolean {
  return status === 404 || status === 405;
}

function looksLikeHtml(text: string, contentType: string | null): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return Boolean(contentType?.toLowerCase().includes("text/html")) ||
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html");
}

function buildChatCompletionsUrls(baseUrl: string): string[] {
  const trimmed = (baseUrl || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return [trimmed];
  if (trimmed.endsWith("/v1")) return [`${trimmed}/chat/completions`];

  try {
    const url = new URL(trimmed);
    const cleanPath = url.pathname.replace(/\/+$/, "");
    const origin = url.origin;
    const isOpenAIOrigin = url.hostname === "api.openai.com" && (!cleanPath || cleanPath === "/");

    if (!cleanPath || cleanPath === "/") {
      const noVersion = `${origin}/chat/completions`;
      const v1 = `${origin}/v1/chat/completions`;
      return isOpenAIOrigin ? unique([v1, noVersion]) : unique([noVersion, v1]);
    }

    const base = `${origin}${cleanPath}`;
    return unique([`${base}/chat/completions`, `${base}/v1/chat/completions`]);
  } catch {
    return unique([`${trimmed}/chat/completions`, `${trimmed}/v1/chat/completions`]);
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
