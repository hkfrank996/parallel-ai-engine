/**
 * Basic SSRF mitigation — block requests to private/reserved IP ranges.
 * Covers: private IPv4, loopback, cloud metadata, IPv6 ULA/link-local/mapped.
 * NOT covered: DNS rebinding, octal/decimal IP encoding, URL parser edge cases.
 * Allows localhost only for explicitly local providers (ollama).
 */
export function assertSafeApiUrl(urlStr: string, allowLocalhost = false): void {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error("Invalid API URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API URL must use http or https protocol");
  }

  // url.hostname keeps brackets for IPv6 (e.g. "[::1]"), strip them for checks
  const rawHost = url.hostname;
  const host = rawHost.replace(/^\[|\]$/g, "");

  // Block cloud metadata endpoints
  if (host === "169.254.169.254" || host === "fd00:ec2::254") {
    throw new Error("Requests to cloud metadata endpoints are not allowed");
  }

  // Block localhost/loopback unless explicitly allowed (ollama)
  if (!allowLocalhost) {
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0"
    ) {
      throw new Error("Requests to localhost are not allowed for this provider");
    }

    // Block private IP ranges (10.x, 172.16-31.x, 192.168.x) and IPv6 private
    if (isPrivateIP(host)) {
      throw new Error("Requests to private IP addresses are not allowed");
    }
  }
}

function isPrivateIP(host: string): boolean {
  // IPv4 private ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    // 0.0.0.0/8 — "this network"
    if (a === 0) return true;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
  }

  // IPv6 checks
  const h = host.toLowerCase();

  // IPv6 mapped IPv4 — block all ::ffff: (covers both dotted-quad and normalized hex forms)
  if (h.startsWith("::ffff:")) return true;

  // IPv6 ULA (fc00::/7 — fc00:: to fdff::)
  if (h.startsWith("fc") || h.startsWith("fd")) return true;

  // IPv6 link-local (fe80::/10)
  if (h.startsWith("fe80")) return true;

  return false;
}

/**
 * Sanitize error messages for client response.
 * Strips URLs, potential API keys, and long opaque tokens.
 * Returns a safe, generic error string.
 */
export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    // Strip URLs
    .replace(/https?:\/\/[^\s"')\]]+/g, "[url]")
    // Strip hex-encoded URLs (e.g. from fetch errors)
    .replace(/\\x68\\x74\\x74\\x70[^\s"')\]]+/gi, "[url]")
    // Strip bearer tokens and API key patterns
    .replace(/bearer\s+[A-Za-z0-9._\-]{20,}/gi, "bearer [redacted]")
    .replace(/\b(?:sk-|tp-|key-|token-|api-)[A-Za-z0-9_\-]{10,}\b/g, "[redacted]")
    // Strip long opaque tokens (likely keys/tokens, not error text)
    .replace(/\b[A-Za-z0-9+/]{60,}={0,2}\b/g, "[redacted]")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
