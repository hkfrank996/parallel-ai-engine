import { describe, it, expect } from "vitest";
import { assertSafeApiUrl, sanitizeError } from "./validateUrl";

describe("assertSafeApiUrl", () => {
  it("allows public HTTPS URLs", () => {
    expect(() => assertSafeApiUrl("https://api.openai.com/v1")).not.toThrow();
  });

  it("allows public HTTP URLs", () => {
    expect(() => assertSafeApiUrl("http://example.com")).not.toThrow();
  });

  it("blocks ftp protocol", () => {
    expect(() => assertSafeApiUrl("ftp://example.com")).toThrow("http or https");
  });

  it("blocks invalid URLs", () => {
    expect(() => assertSafeApiUrl("not-a-url")).toThrow("Invalid API URL");
  });

  // Cloud metadata
  it("blocks cloud metadata endpoint", () => {
    expect(() => assertSafeApiUrl("http://169.254.169.254/latest/meta-data")).toThrow(
      "cloud metadata"
    );
  });

  it("blocks cloud metadata IPv6", () => {
    expect(() => assertSafeApiUrl("http://[fd00:ec2::254]/latest")).toThrow();
  });

  // Localhost
  it("blocks localhost by default", () => {
    expect(() => assertSafeApiUrl("http://localhost:3000")).toThrow("localhost");
  });

  it("allows localhost when allowLocalhost=true", () => {
    expect(() => assertSafeApiUrl("http://localhost:11434", true)).not.toThrow();
  });

  it("blocks 127.0.0.1 by default", () => {
    expect(() => assertSafeApiUrl("http://127.0.0.1:3000")).toThrow("localhost");
  });

  it("blocks 0.0.0.0", () => {
    expect(() => assertSafeApiUrl("http://0.0.0.0:3000")).toThrow("localhost");
  });

  // IPv4 private ranges
  it("blocks 10.x.x.x", () => {
    expect(() => assertSafeApiUrl("http://10.0.0.1")).toThrow("private IP");
  });

  it("blocks 172.16.x.x", () => {
    expect(() => assertSafeApiUrl("http://172.16.0.1")).toThrow("private IP");
  });

  it("blocks 172.31.x.x", () => {
    expect(() => assertSafeApiUrl("http://172.31.255.255")).toThrow("private IP");
  });

  it("allows 172.15.x.x (not in private range)", () => {
    expect(() => assertSafeApiUrl("http://172.15.0.1")).not.toThrow();
  });

  it("blocks 192.168.x.x", () => {
    expect(() => assertSafeApiUrl("http://192.168.1.1")).toThrow("private IP");
  });

  it("allows public IP", () => {
    expect(() => assertSafeApiUrl("http://8.8.8.8")).not.toThrow();
  });

  // IPv6
  it("blocks IPv6 loopback", () => {
    expect(() => assertSafeApiUrl("http://[::1]:3000")).toThrow("localhost");
  });

  it("blocks IPv6 mapped localhost", () => {
    expect(() => assertSafeApiUrl("http://[::ffff:127.0.0.1]")).toThrow();
  });

  it("blocks IPv6 mapped private", () => {
    expect(() => assertSafeApiUrl("http://[::ffff:10.0.0.1]")).toThrow();
  });

  it("blocks IPv6 ULA (fd00::)", () => {
    expect(() => assertSafeApiUrl("http://[fd00::1]")).toThrow();
  });

  it("blocks IPv6 ULA (fc00::)", () => {
    expect(() => assertSafeApiUrl("http://[fc00::1]")).toThrow();
  });

  it("blocks IPv6 link-local", () => {
    expect(() => assertSafeApiUrl("http://[fe80::1]")).toThrow();
  });
});

describe("sanitizeError", () => {
  it("strips URLs", () => {
    const result = sanitizeError(new Error("fetch https://api.openai.com/v1 failed"));
    expect(result).not.toContain("https://api.openai.com");
    expect(result).toContain("[url]");
  });

  it("strips sk- API keys", () => {
    const result = sanitizeError(new Error("invalid key sk-abc123def456ghi"));
    expect(result).not.toContain("sk-abc123def456ghi");
    expect(result).toContain("[redacted]");
  });

  it("strips tp- API keys without bearer prefix", () => {
    const result = sanitizeError(new Error("Authentication failed for key tp-cl4iew1f1xj0mel9ai1dq2i8ejz6190vbb0g7i7ii068l4dx"));
    expect(result).not.toContain("tp-cl4iew1f1xj0mel9ai1dq2i8ejz6190vbb0g7i7ii068l4dx");
    expect(result).toContain("[redacted]");
  });

  it("strips tp- API keys in various contexts", () => {
    const result = sanitizeError(new Error("error with key tp-abcdefghijklmnopqrstuvwxyz1234567890abcdef in message"));
    expect(result).not.toContain("tp-abcdefghijklmnopqrstuvwxyz1234567890abcdef");
    expect(result).toContain("[redacted]");
  });

  it("strips bearer tokens", () => {
    const result = sanitizeError(new Error("auth failed: bearer abcdefghijklmnopqrstuvwxyz"));
    expect(result).not.toContain("bearer abcdefghijklmnopqrs");
    expect(result).toContain("bearer [redacted]");
  });

  it("preserves normal error messages", () => {
    const result = sanitizeError(new Error("World not found: test-id"));
    expect(result).toBe("World not found: test-id");
  });

  it("handles non-Error inputs", () => {
    const result = sanitizeError("string error");
    expect(result).toBe("string error");
  });
});
