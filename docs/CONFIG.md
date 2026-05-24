# LLM Provider Configuration

> Parallel supports 5 provider types. Configure one in `.env.local` or via the in-app Settings modal.

## Quick Reference

| Provider | Protocol | Env Prefix | Requires Key |
|----------|----------|------------|-------------|
| OpenAI-compatible | `/v1/chat/completions` | `OPENAI_` | No |
| Anthropic | `/v1/messages` | `ANTHROPIC_` | Yes |
| OpenRouter | `/v1/chat/completions` | `OPENROUTER_` | Yes |
| Ollama | `/v1/chat/completions` | `OLLAMA_` | No |
| Mock | — | — | No (auto) |

---

## Provider Details

### OpenAI-compatible

Works with any OpenAI-compatible endpoint (OpenAI, custom servers).

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

- If `OPENAI_API_KEY` is empty, requests are sent without an Authorization header (not Mock Mode).
- Default base URL: `https://api.openai.com/v1`
- Default model: `gpt-4o-mini`

### Anthropic

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

- Requires an API key.
- Uses `/v1/messages` protocol (not OpenAI-compatible).

### OpenRouter

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
```

- Requires an API key.
- Uses OpenAI-compatible protocol.

### Ollama (local)

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3
```

- No API key needed.
- `allowLocalhost` is automatically enabled for SSRF protection.

---

## Mock Mode

Parallel enters Mock Mode **only** when no provider is configured at all (no `LLM_PROVIDER` set, no keys present).

An OpenAI-compatible provider with an empty key is **not** Mock Mode — it sends real requests without auth.

Mock Mode returns canned responses and is useful for development and testing without API costs.

---

## Timeout

```env
LLM_TIMEOUT_MS=90000
```

Default: 90 seconds. Increase for slow models or large contexts.

---

## In-App Configuration

The Settings modal (gear icon) allows switching providers and testing connections without editing `.env.local`. Settings are saved to browser localStorage.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "No provider configured" | No `LLM_PROVIDER` in `.env.local` | Set `LLM_PROVIDER=openai` (or other) |
| "Invalid API URL" | SSRF protection blocked the URL | Use a public HTTPS endpoint |
| "Requests to localhost are not allowed" | Using localhost with non-Ollama provider | Switch to Ollama or use a public URL |
| Timeout errors | Model is slow or context is large | Increase `LLM_TIMEOUT_MS` |
| "Mock" badge appears | No provider configured | Configure a provider in Settings or `.env.local` |
