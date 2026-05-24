/**
 * Safe wrappers around localStorage that never throw.
 * In storage-disabled environments (Codex in-app browser, private mode
 * in some browsers, embedded WebViews) the localStorage getter itself
 * can throw SecurityError. Every access — including the getter — must
 * be inside try/catch so React render / useEffect chains are never broken.
 */

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

// Cache the probe result once per page load — avoids repeated try/catch.
let _available: boolean | null = null;
function available(): boolean {
  if (_available !== null) return _available;
  const s = getStorage();
  if (!s) {
    _available = false;
    return false;
  }
  try {
    const probe = "__storage_probe__";
    s.setItem(probe, probe);
    s.removeItem(probe);
    _available = true;
    return true;
  } catch {
    _available = false;
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  if (!available()) return null;
  try {
    const s = getStorage();
    return s ? s.getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  if (!available()) return;
  try {
    const s = getStorage();
    if (s) s.setItem(key, value);
  } catch {
    // QuotaExceededError or SecurityError — silent ignore
  }
}

export function safeRemoveItem(key: string): void {
  if (!available()) return;
  try {
    const s = getStorage();
    if (s) s.removeItem(key);
  } catch {
    // ignore
  }
}

/** @internal Reset the cached availability probe. For tests only. */
export function _resetForTesting(): void {
  _available = null;
}
