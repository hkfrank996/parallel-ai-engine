import { AbortError, LLMGenerateOptions, LLMProvider, isAbortError } from "./types";

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

    // Bridge external signal to internal controller
    const onAbort = () => controller.abort();
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener("abort", onAbort, { once: true });
      }
    }

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
      if (isAbortError(e)) {
        throw new AbortError();
      }
      if ((e as Error).name === "AbortError") {
        throw new AbortError();
      }
      throw e;
    } finally {
      clearTimeout(timeout);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
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

  async *stream(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): AsyncIterable<string> {
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

    // Bridge external signal to internal controller
    const onAbort = () => controller.abort();
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          stream: true,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
      if (isAbortError(e) || (e as Error).name === "AbortError") {
        throw new AbortError();
      }
      throw e;
    }

    if (!res.ok) {
      clearTimeout(timeout);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
      const body = await res.json().catch(() => null);
      const msg = (body as Record<string, unknown>)?.error
        ? ((body as Record<string, unknown>).error as Record<string, string>)?.message
        : (body as Record<string, string>)?.message || `status ${res.status}`;
      throw new Error(`Anthropic API error: ${msg}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const json = line.slice(6);
            if (currentEvent === "content_block_delta") {
              try {
                const parsed = JSON.parse(json);
                if (parsed.delta?.text) {
                  yield parsed.delta.text;
                }
              } catch {
                // Malformed JSON chunk — skip and continue
              }
            } else if (currentEvent === "message_stop") {
              // Stream complete
            }
            // Ignore message_start, ping, content_block_start/stop, message_delta
            currentEvent = "";
          }
        }
      }
    } finally {
      clearTimeout(timeout);
      if (options?.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
      reader.releaseLock();
    }
  }
}
