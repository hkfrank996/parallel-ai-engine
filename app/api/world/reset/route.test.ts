import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for POST /api/world/reset
 *
 * Validates input, session lookup, and clearSessionData invocation.
 */

// ── Mock store module ────────────────────────────────────────
const mockClearSessionData = vi.fn();
const mockFindSessionByWorldId = vi.fn();

vi.mock("@/lib/storage/store", () => ({
  findSessionByWorldId: (...args: unknown[]) => mockFindSessionByWorldId(...args),
  clearSessionData: (...args: unknown[]) => mockClearSessionData(...args),
}));

// ── Mock loadWorld (assertSafeWorldId) ───────────────────────
vi.mock("@/lib/world/loadWorld", () => ({
  assertSafeWorldId: (id: string) => {
    if (id.includes("..") || id.includes("/") || id.includes("\\")) {
      throw new Error("Unsafe world id");
    }
    return id;
  },
}));

function mockRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    nextUrl: new URL("http://localhost/api/world/reset"),
  } as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/world/reset", () => {
  it("returns 400 when worldId is missing", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());

    const response = await POST(mockRequest({}));
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(400);
    expect(body.error).toContain("worldId");
  });

  it("returns 404 when no session exists for the world", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());
    mockFindSessionByWorldId.mockReturnValue(undefined);

    const response = await POST(mockRequest({ worldId: "neon-harbor" }));
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(404);
    expect(body.error).toContain("No session");
    expect(mockClearSessionData).not.toHaveBeenCalled();
  });

  it("calls clearSessionData and returns success when session exists", async () => {
    const { POST } = await import("./route.ts?t=" + Date.now());
    mockFindSessionByWorldId.mockReturnValue({ id: "session-abc", worldId: "neon-harbor" });

    const response = await POST(mockRequest({ worldId: "neon-harbor" }));
    const body = await (response as Response).json();

    expect((response as Response).status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.worldId).toBe("neon-harbor");
    expect(mockClearSessionData).toHaveBeenCalledWith("session-abc");
  });
});
