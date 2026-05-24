import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AnthropicProvider } from "./anthropicProvider";

/**
 * Unit tests for AnthropicProvider response parsing.
 * Tests content block handling for both native Anthropic and
 * extended content format endpoints (e.g. thinking blocks).
 */

function makeFakeResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("AnthropicProvider.generate", () => {
  // Shared timeout mock
  const origEnv = process.env.LLM_TIMEOUT_MS;
  beforeEach(() => { process.env.LLM_TIMEOUT_MS = "1000"; });
  afterEach(() => { process.env.LLM_TIMEOUT_MS = origEnv ?? "90000"; });

  async function callGenerate(provider: AnthropicProvider, responseBody: unknown, ok = true): Promise<string> {
    global.fetch = async () => makeFakeResponse(responseBody, ok) as Response;
    return provider.generate("sys", "user");
  }

  it("returns text from content[0] when it is a text block (native Anthropic)", async () => {
    const p = new AnthropicProvider("key", "https://api.anthropic.com/v1", "claude-sonnet");
    const text = await callGenerate(p, {
      content: [{ type: "text", text: "Hello world" }],
    });
    expect(text).toBe("Hello world");
  });

  it("skips thinking block and returns first text block (extended content format)", async () => {
    const p = new AnthropicProvider("key", "https://example-anthropic-compatible.test/anthropic", "extended-model-v1");
    const text = await callGenerate(p, {
      content: [
        { type: "thinking", thinking: "Let me respond with a greeting." },
        { type: "text", text: "Hello world" },
      ],
    });
    expect(text).toBe("Hello world");
  });

  it("returns first text block even when text is not the last block", async () => {
    const p = new AnthropicProvider("key", "https://example-anthropic-compatible.test/anthropic", "extended-model-v1");
    const text = await callGenerate(p, {
      content: [
        { type: "text", text: "First text block" },
        { type: "thinking", thinking: "ignored" },
        { type: "text", text: "Second text block" },
      ],
    });
    expect(text).toBe("First text block");
  });

  it("throws empty response error when no text block is present", async () => {
    const p = new AnthropicProvider("key", "https://api.anthropic.com/v1", "claude-sonnet");
    await expect(callGenerate(p, {
      content: [{ type: "thinking", thinking: "only thinking here" }],
    })).rejects.toThrow("Anthropic API returned an empty response");
  });

  it("throws empty response error when all text blocks are empty strings", async () => {
    const p = new AnthropicProvider("key", "https://api.anthropic.com/v1", "claude-sonnet");
    await expect(callGenerate(p, {
      content: [{ type: "text", text: "   " }],
    })).rejects.toThrow("Anthropic API returned an empty response");
  });

  it("throws on HTTP error with sanitized message", async () => {
    const p = new AnthropicProvider("key", "https://api.anthropic.com/v1", "claude-sonnet");
    global.fetch = async () => makeFakeResponse({ error: { message: "rate_limit_exceeded" } }, false) as Response;
    await expect(p.generate("sys", "user")).rejects.toThrow("Anthropic API error: rate_limit_exceeded");
  });

  it("throws on HTTP error without leaking response body", async () => {
    const p = new AnthropicProvider("key", "https://api.anthropic.com/v1", "claude-sonnet");
    global.fetch = async () => makeFakeResponse({ error: { message: "quota exceeded" } }, false) as Response;
    await expect(p.generate("sys", "user")).rejects.toThrow("Anthropic API error: quota exceeded");
  });

  it("uses Bearer auth for non-anthropic.com base URLs", async () => {
    let capturedHeaders: Record<string, string> = {};
    const p = new AnthropicProvider("secret-key", "https://example-anthropic-compatible.test/anthropic", "model");
    global.fetch = async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return makeFakeResponse({ content: [{ type: "text", text: "ok" }] }) as Response;
    };
    await p.generate("sys", "user");
    expect(capturedHeaders["Authorization"]).toBe("Bearer secret-key");
    expect(capturedHeaders["x-api-key"]).toBeUndefined();
  });

  it("uses x-api-key auth for anthropic.com base URL", async () => {
    let capturedHeaders: Record<string, string> = {};
    const p = new AnthropicProvider("sk-ant-...", "https://api.anthropic.com/v1", "claude-sonnet");
    global.fetch = async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return makeFakeResponse({ content: [{ type: "text", text: "ok" }] }) as Response;
    };
    await p.generate("sys", "user");
    expect(capturedHeaders["x-api-key"]).toBe("sk-ant-...");
    expect(capturedHeaders["Authorization"]).toBeUndefined();
  });
});