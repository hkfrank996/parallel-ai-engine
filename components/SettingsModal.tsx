"use client";

import { useState, useEffect } from "react";
import { SETTINGS_PROVIDER_KEYS, getProviderMeta, type ProviderKey } from "@/lib/llm/catalog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "parallel-llm-config";

export interface LLMSettings {
  providerType: ProviderKey;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export function loadSettings(): LLMSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate legacy "openai"|"anthropic" union to ProviderKey
    const key = parsed.providerType || "openai";
    return { ...parsed, providerType: key };
  } catch {
    return null;
  }
}

export function clearSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export default function SettingsModal({ open, onClose }: Props) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [providerType, setProviderType] = useState<ProviderKey>("openai");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const meta = getProviderMeta(providerType);

  useEffect(() => {
    if (open) {
      const s = loadSettings();
      setProviderType(s?.providerType || "openai");
      setApiUrl(s?.apiUrl || "");
      setApiKey(s?.apiKey || "");
      setModel(s?.model || "");
      setSaved(false);
      setTestResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    // Always save — even without apiKey. The user may be configuring a
    // key-less provider (Ollama, local server) or planning to add a key later.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      providerType,
      apiUrl: apiUrl.trim(),
      apiKey: trimmedKey,
      model: model.trim(),
    }));
    setSaved(true);
    setTestResult(null);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiUrl("");
    setApiKey("");
    setModel("");
    setProviderType("openai");
    setSaved(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    const trimmedKey = apiKey.trim();
    // Don't front-block: the backend will decide if a key is required
    // based on the actual provider type. This allows key-less OpenAI-compatible
    // providers (Ollama, local servers) to be tested from the UI.

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmConfig: {
            providerType,
            apiUrl: apiUrl.trim(),
            apiKey: trimmedKey,
            model: model.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Connection test failed");
      }
      setTestResult({
        ok: true,
        message: `Connected${data.model ? ` · ${data.model}` : ""}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult({ ok: false, message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void/80 px-4 py-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="API Settings"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="settings-panel w-full max-w-md rounded-lg border border-edge/60 bg-deep/95 p-5 shadow-2xl shadow-black/70 sm:p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-dim/60">Engine</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-prose">API Settings</h2>
            <p className="mt-1 text-xs leading-relaxed text-prose-muted/68">
              OpenAI-compatible URLs may be plain hosts, /v1 bases, or full /chat/completions endpoints.
            </p>
          </div>
          <button
            onClick={onClose}
            className="settings-close rounded border px-2 py-1 transition"
            aria-label="Close settings"
          >
            <span className="text-sm leading-none">x</span>
          </button>
        </div>

        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prose-muted/68">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SETTINGS_PROVIDER_KEYS.map((key) => {
                const m = getProviderMeta(key)!;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setProviderType(key);
                      setApiUrl("");
                      setModel("");
                    }}
                    className={`settings-provider rounded-md border px-3 py-2 text-xs font-medium transition ${
                      providerType === key
                        ? "settings-provider-active"
                        : "settings-provider-idle"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prose-muted/68">
              API URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={meta?.defaultBaseUrl || "https://api.openai.com/v1"}
              className="settings-field w-full rounded-md border px-3 py-2 text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prose-muted/68">
              API Key
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={meta?.placeholderKey || "sk-..."}
              className="settings-field w-full rounded-md border px-3 py-2 text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-prose-muted/68">
              Model Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={meta?.placeholderModel || "gpt-4o-mini"}
              className="settings-field w-full rounded-md border px-3 py-2 text-sm outline-none transition"
            />
          </div>

          <p className="settings-note rounded-md border px-3 py-2 text-[11px] leading-relaxed">
            {meta?.requiresKey
              ? "Leave API Key empty to use Mock Mode. Settings are saved in your browser only."
              : "No API key required. Settings are saved in your browser only."}
          </p>

          {testResult && (
            <p
              className={`rounded-md border px-3 py-2 text-[11px] leading-relaxed ${
                testResult.ok
                  ? "border-emerald-700/35 bg-emerald-950/20 text-emerald-300/80"
                  : "border-crimson/35 bg-crimson/10 text-crimson-bright/85"
              }`}
            >
              {testResult.message}
            </p>
          )}
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="settings-reset rounded-md px-3 py-1.5 text-xs transition"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-400">Saved!</span>}
            <button
              onClick={handleTest}
              disabled={testing}
              className="settings-secondary rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35"
            >
              {testing ? "Testing..." : "Test"}
            </button>
            <button
              onClick={handleSave}
              className="settings-primary rounded-md px-4 py-2 text-sm font-semibold transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
