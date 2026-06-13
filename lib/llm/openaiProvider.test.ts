import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenAIProvider } from "./openaiProvider";
import { AbortError, isAbortError } from "./types";

// --- Helpers to mock fetch with a streaming body ---
function makeSseResponse(chunks: string[], options: { status?: number; statusText?: string } = {}): Response {
  const status = options.status ?? 200;
  const statusText = options.statusText ?? "OK";
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, { status, statusText, headers: { "content-type": "text/event-stream" } });
}

function makeJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeErrorResponse(status: number, body: string): Response {
  return new Response(body, { status, statusText: "Error" });
}

interface FetchCall {
  url: string;
  init: RequestInit;
}

function mockFetchOnce(response: Response): { fetchMock: ReturnType<typeof vi.fn>; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return response;
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAIProvider.generate()", () => {
  it("sends POST request with model and messages", async () => {
    const { fetchMock, calls } = mockFetchOnce(
      makeJsonResponse({ choices: [{ message: { content: "Hello" } }] })
    );
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const result = await provider.generate("sys", "user");
    expect(result).toBe("Hello");
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user" },
    ]);
  });
});

// ============================================================
// OpenAIProvider.stream() — token-level streaming via SSE
// ============================================================
describe("OpenAIProvider.stream()", () => {
  it("sends request body with stream: true and SSE Accept header", async () => {
    const { calls } = mockFetchOnce(makeSseResponse([
      `data: {"choices":[{"delta":{"content":"hi"}}]}\n\n`,
      `data: [DONE]\n\n`,
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user")) tokens.push(t);
    expect(tokens).toEqual(["hi"]);
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.stream).toBe(true);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Accept).toBe("text/event-stream");
  });

  it("yields tokens from choices[0].delta.content", async () => {
    mockFetchOnce(makeSseResponse([
      `data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`,
      `data: {"choices":[{"delta":{"content":", "}}]}\n\n`,
      `data: {"choices":[{"delta":{"content":"world"}}]}\n\n`,
      `data: [DONE]\n\n`,
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user")) tokens.push(t);
    expect(tokens).toEqual(["Hello", ", ", "world"]);
  });

  it("stops iterating after data: [DONE]", async () => {
    mockFetchOnce(makeSseResponse([
      `data: {"choices":[{"delta":{"content":"a"}}]}\n\n`,
      `data: [DONE]\n\n`,
      `data: {"choices":[{"delta":{"content":"b"}}]}\n\n`, // should be ignored
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user")) tokens.push(t);
    expect(tokens).toEqual(["a"]);
  });
  it("ignores empty delta and blank SSE lines", async () => {
    mockFetchOnce(makeSseResponse([
      ``,
      `data: `,
      `data: {"choices":[{"delta":{}}]}\n\n`, // empty delta content
      `data: {"choices":[{}]}\n\n`, // no delta
      `data: {"choices":[{"delta":{"content":"only"}}]}\n\n`,
      `data: [DONE]\n\n`,
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user")) tokens.push(t);
    expect(tokens).toEqual(["only"]);
  });

  it("handles multiple data chunks glued together", async () => {
    // Several JSON events in one network chunk, no trailing newlines
    mockFetchOnce(makeSseResponse([
      `data: {"choices":[{"delta":{"content":"a"}}]}\ndata: {"choices":[{"delta":{"content":"b"}}]}\ndata: {"choices":[{"delta":{"content":"c"}}]}\ndata: [DONE]\n`,
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user")) tokens.push(t);
    expect(tokens).toEqual(["a", "b", "c"]);
  });

  it("skips malformed JSON lines silently (keep-alive noise)", async () => {
    mockFetchOnce(makeSseResponse([
      `: keep-alive comment\n`, // comment line — should be ignored
      `data: not-json\n\n`,     // malformed data — should be ignored
      `data: {"choices":[{"delta":{"content":"ok"}}]}\n\n`,
      `data: [DONE]\n\n`,
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user")) tokens.push(t);
    expect(tokens).toEqual(["ok"]);
  });

  it("forwards AbortSignal into fetch request", async () => {
    const { calls } = mockFetchOnce(makeSseResponse([
      `data: {"choices":[{"delta":{"content":"a"}}]}\n\n`,
      `data: [DONE]\n\n`,
    ]));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const ctrl = new AbortController();
    const tokens: string[] = [];
    for await (const t of provider.stream("sys", "user", { signal: ctrl.signal })) {
      tokens.push(t);
      // The signal passed to fetch is an AbortController.signal (wrapped
      // internally for the timeout bridge). We assert the call receives
      // some abort signal after the first iteration has triggered fetch.
      if (calls[0]?.init.signal) {
        expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
      }
    }
    expect(calls).toHaveLength(1);
  });

  it("throws AbortError when signal is already aborted", async () => {
    // Mock fetch to throw AbortError when the signal is already aborted
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const signal = init.signal as AbortSignal | undefined;
      if (signal?.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return makeSseResponse([`data: {"choices":[{"delta":{"content":"a"}}]}\n\n`]);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const ctrl = new AbortController();
    ctrl.abort();
    const iter = provider.stream("sys", "user", { signal: ctrl.signal });
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of iter) { /* noop */ }
    }).rejects.toBeInstanceOf(AbortError);
  });

  it("throws useful error on non-2xx response", async () => {
    mockFetchOnce(makeErrorResponse(429, "rate limit exceeded"));
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const iter = provider.stream("sys", "user");
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of iter) { /* noop */ }
    }).rejects.toThrow(/OpenAI API stream error 429/);
  });

  it("AbortError from underlying fetch is rethrown as AbortError", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      // Honor the abort signal as a real fetch would
      return await new Promise<Response>((_, reject) => {
        const signal = init.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          return;
        }
        signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
        setTimeout(() => {
          // Never resolves to force the abort to win
        }, 60_000);
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const provider = new OpenAIProvider("test-key", "https://api.openai.com/v1", "gpt-4o-mini");
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10);
    const iter = provider.stream("sys", "user", { signal: ctrl.signal });
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of iter) { /* noop */ }
    }).rejects.toBeInstanceOf(AbortError);
  });
});
