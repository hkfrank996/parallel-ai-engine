# Parallel

[![CI](https://github.com/hkfrank996/parallel-ai-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/hkfrank996/parallel-ai-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A living narrative world engine for AI-driven murder mysteries, investigative roleplay, and evolving multi-character scenes.
>
> *一个会记忆、会演化、会推动剧情的 AI 剧本杀世界。*

[中文文档 / Chinese Docs](README_ZH.md)

---

## What Is Parallel?

Parallel puts you inside a scene where characters remember, relationships shift, time passes, and the world reacts to your behavior. It is not a chatbot. It is not a visual novel. It is a **living world simulation** — an AI showrunner directs the drama, characters have agency, and the truth itself can change.

Walk into a rainy night market in Neon Harbor. Talk to a street doctor, an information broker, a runaway courier. Ask the wrong question and someone gets nervous. Expose a secret and others adjust their strategy. Ignore a clue and the director hands it to someone else to detonate. Even the main plot can change if you push the story somewhere the author never imagined.

## Why It Is Different

| | Chatbot / Roleplay | Visual Novel | **Parallel** |
|---|---|---|---|
| Script | Fixed or improvised | Pre-written branches | **AI showrunner adapts in real-time** |
| Characters | Single persona | Static sprites | **Multi-character, each with memory and agency** |
| World state | Resets on refresh | Checkpoint-based | **Persistent — relationships, events, emotions all evolve** |
| Player impact | Cosmetic | Branch selection | **Every action reshapes the world** |

## Core Features

- **AI Showrunner** — a director that manages narrative tension, triggers twists, and adapts the plot based on player behavior
- **Multi-Character Scenes** — multiple characters speak in turn, each with their own personality, secrets, and emotional state
- **Persistent Memory** — characters remember what you said across sessions; round 10 naturally references round 2
- **Evolving Relationships** — trust, hostility, and dependency shift with every interaction
- **Dynamic Events** — the world generates new events when tension peaks or stagnation is detected
- **Emotional States** — character mood is computed from relationships, memories, time of day, and personality
- **Character Reflection** — characters form high-level insights from accumulated experiences
- **World Time** — day/night cycle affects atmosphere and character availability
- **Clue System** — clues are auto-extracted from dialogue and tracked in a sidebar
- **Investigation Actions** — look around, listen, organize thoughts for cinematic sensory narration
- **Genre-Agnostic Engine** — supports any genre: cyberpunk mystery, dark fantasy, sci-fi conspiracy, modern urban
- **World Workshop** — create and export/import custom worlds via YAML without writing code

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

Windows PowerShell:

```powershell
docker run --rm -p 3000:3000 --env-file .env.local -v "${PWD}/data:/app/data" parallel
```

The container runs in Mock Mode if no provider is configured.

### Windows (no terminal)

Double-click `start.bat`, then open `http://localhost:3000`.

## Model Configuration

Copy `.env.local.example` to `.env.local` and configure a provider:

```env
# OpenAI (official)
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# OpenRouter
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=your_openrouter_api_key_here
# OPENROUTER_MODEL=openai/gpt-4o-mini

# Ollama (local, no key needed)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434/v1
# OLLAMA_MODEL=llama3

# Custom OpenAI-compatible endpoint (e.g. self-hosted or third-party)
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_custom_api_key_here
# OPENAI_BASE_URL=https://your-custom-endpoint.example.com/v1
# OPENAI_MODEL=your-model-name
```

### Provider Support Matrix

| Provider | Protocol | Requires API Key |
|----------|----------|-----------------|
| **OpenAI-compatible** | `/v1/chat/completions` | No (empty = no auth header) |
| **Anthropic** | `/v1/messages` | **Yes** |
| **OpenRouter** | `/v1/chat/completions` | **Yes** |
| **Ollama** | `/v1/chat/completions` | No |
| **Mock Mode** | — | No (only when no provider is configured at all) |

> Parallel enters Mock Mode **only** when no provider is configured. An OpenAI-compatible provider with an empty key sends requests without an Authorization header — this is not Mock Mode.

## Showcase Worlds

9 demo worlds spanning 4 genres — open the app and pick one:

| World | Genre | Tagline |
|-------|-------|---------|
| **Neon Harbor** | Cyberpunk mystery | A rainy cyberpunk port where everyone owes someone something |
| **Crimson Keep** | Dark fantasy | An ancient castle where the king's advisor is dead and the prophecy demands justice before dawn |
| **Orbital Station Sigma** | Sci-fi conspiracy | A deep-space station where the air is running out and someone just killed the captain |
| **Shadow Realm** | Dark fantasy | A dying magical realm where three mages hold the last light |
| **Jade Sect Summons** | Xianxia dark fantasy | Three cultivators answer a forbidden summons beneath a jade mountain |
| **Hollow Creek** | Modern mystery | A small town where the creek runs red and nobody calls the sheriff |
| **Last Light Station** | Sci-fi survival | A deep-space relay where the rescue ship isn't coming and the air is running out |
| **Glass Tower** | Cyberpunk mystery | A corporate skyscraper where the CEO vanished and every floor has a secret |
| **Vermillion Manor** | Dark fantasy mystery | A dead patriarch, a locked room, and three heirs who all had a reason |

Each world: 3 characters with distinct personalities, relationship webs, secrets, and goals.

## Testing

```bash
npm run test     # 47 vitest tests (SSRF, error sanitization, import safety)
npm run lint     # TypeScript type check
npm run build    # Production build
```

## Import / Export

Export a world and its session data:

```bash
curl "http://localhost:3000/api/world/export?worldId=neon-harbor"
# Returns: { worldId, yaml, sessionData }
```

Import a world from YAML:

```bash
curl -X POST http://localhost:3000/api/world/import \
  -H "Content-Type: application/json" \
  -d '{"yaml": "id: my-world\nname: My World\n..."}'
```

Constraints: max 500 KB YAML, max 10,000 session entries. Import validates before writing — no dirty files on failure.

## Security

- `.env.local` — gitignored, never commit API keys
- `data/store.json` — gitignored, runtime session data
- `CODEX_HANDOFF.md` — gitignored, private handoff notes
- SSRF protection blocks private IPs, cloud metadata, localhost
- Error messages are sanitized (URLs and API keys stripped)
- YAML parsing uses `CORE_SCHEMA` (no code execution)

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Directory structure, request flow, provider system, extension layer
- **[docs/API.md](docs/API.md)** — API endpoint reference
- **[docs/CONFIG.md](docs/CONFIG.md)** — LLM provider configuration guide
- **[docs/WORLD_FORMAT.md](docs/WORLD_FORMAT.md)** — World YAML schema, field reference, common pitfalls
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — Product roadmap
- **[docs/ROADMAP_ZH.md](docs/ROADMAP_ZH.md)** — 产品路线图（中文）
- **[docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)** — Phase 4 + v1.0 release checklist

## Current Status

**Pre-v1.0 — Phase 1 + Phase 2 + Phase 3 completed, Phase 4 pending**

- Phase 1 (Stable Layer): SSRF protection, error sanitization, test suite ✅
- Phase 2 (Showcase Worlds): 9 demo worlds across 4 genres ✅
- Phase 3 (Release Docs): README, docs/, package review ✅
- Phase 4 (Pre-release QA): Pending
- v1.0 Closeout: Pending

## License

MIT
