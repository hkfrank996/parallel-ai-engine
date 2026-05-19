# Parallel

> A living murder-mystery world engine: AI showrunner, dynamic characters, mutable truth.

Parallel puts the player inside a scene where characters remember, relationships shift, time passes, and the world reacts to player behavior. It is not a single-character chatbot. It is a small living world.

## Current Version

**v0.6 — Foundation Build**

This release focuses on infrastructure and extensibility:

- Docker support for one-command startup
- GitHub Actions CI (lint + build)
- Extensible provider registry (OpenAI / Anthropic / OpenRouter / Ollama / Mock)
- Architecture and API documentation

Product capability: v0.5 feature-complete (world creation, multi-character turns, AI director, memory, relationships, events, clues, investigation actions). v0.6 adds the infrastructure layer.

Default model: **mimo-v2.5** (OpenAI-compatible).

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Docker

```bash
docker build -t parallel .
docker run --rm -p 3000:3000 --env-file .env.local -v ${PWD}/data:/app/data parallel
```

On Windows PowerShell:

```powershell
docker run --rm -p 3000:3000 --env-file .env.local -v "${PWD}/data:/app/data" parallel
```

The container runs in Mock Mode if no API key is provided.

### Windows (no terminal)

Double-click `start.bat` or `启动Parallel.bat`, then open `http://localhost:3000`.

---

## Model Configuration

Parallel works without an API key by using Mock Mode.

Copy `.env.local.example` to `.env.local` and configure one provider:

```env
LLM_PROVIDER=openai

OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=mimo-v2.5

# Or use another provider:
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=openai/gpt-4o-mini

# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434/v1
# OLLAMA_MODEL=llama3
```

### Provider Support Matrix

| Provider | Protocol | Config Key | Requires API Key |
|----------|----------|-----------|-----------------|
| **OpenAI-compatible** | `/v1/chat/completions` | `OPENAI_API_KEY` | Yes |
| **Anthropic** | `/v1/messages` | `ANTHROPIC_API_KEY` | Yes |
| **OpenRouter** | `/v1/chat/completions` | `OPENROUTER_API_KEY` | Yes |
| **Ollama** | `/v1/chat/completions` | — | No |
| **Mock Mode** | — | — | No |

The in-app Settings modal also supports provider selection and connection testing.

---

## Validation

```bash
npm run lint      # TypeScript type-check
npm run build     # Production build
```

### Smoke Tests (after starting dev server)

```bash
curl http://localhost:3000/
curl http://localhost:3000/create
curl http://localhost:3000/api/world?action=list
curl http://localhost:3000/api/world?worldId=neon-harbor
```

---

## Demo World

The default world is **Neon Harbor**, a cyberpunk mystery in a rainy night market.

- **Mira Voss**: guarded street doctor
- **Ren Kaito**: charming information broker
- **June**: runaway courier apprentice

A data courier is missing. Everyone knows more than they admit.

---

## Core Features

- YAML world definitions
- Multi-character turn engine
- AI director / showrunner
- Character-specific memory retrieval
- World facts and character memories
- Relationship values: trust, hostility, dependency
- World time progression
- Dynamic event generation
- Emotional-state injection
- Timeline panel
- Wait action for letting the world move without speaking
- Fallback warning when a turn uses backup provider or Mock

---

## Project Structure

See `docs/ARCHITECTURE.md` for the full directory layout, request flow, and provider system.

```text
app/          Next.js pages & API routes
components/   React UI components
data/         World YAML files + runtime store
lib/engine/   Core world engine (director, memory, relationships, events)
lib/llm/      LLM provider layer (registry, OpenAI, Anthropic, Mock)
lib/extensions/ Extension point interfaces
docs/         ARCHITECTURE.md, API.md
```

---

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Directory structure, request flow, provider system, extension layer
- **[docs/API.md](docs/API.md)** — API endpoint reference
- **[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)** — Product vision and version history

---

## Known Limits

- Runtime data is stored in `data/store.json` (not a database).
- Relationship history is not stored separately yet.
- Multi-world save management is not implemented.

---

## License

MIT
