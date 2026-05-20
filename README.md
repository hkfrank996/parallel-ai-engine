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

| Provider | Protocol | Requires API Key |
|----------|----------|-----------------|
| **OpenAI-compatible** | `/v1/chat/completions` | No (empty = no auth header) |
| **Anthropic** | `/v1/messages` | **Yes** |
| **OpenRouter** | `/v1/chat/completions` | **Yes** |
| **Ollama** | `/v1/chat/completions` | No |
| **Mock Mode** | — | No (only when no provider is configured at all) |

> Parallel enters Mock Mode **only** when no provider is configured. An OpenAI-compatible provider with an empty key sends requests without an Authorization header — this is not Mock Mode.

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Directory structure, request flow, provider system, extension layer
- **[docs/API.md](docs/API.md)** — API endpoint reference
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — Product roadmap
- **[docs/ROADMAP_ZH.md](docs/ROADMAP_ZH.md)** — 产品路线图（中文）

## Current Status

**v0.6 — Foundation Build**

This release adds infrastructure and extensibility: Docker support, GitHub Actions CI, extensible provider registry (5 providers), extension point interfaces, and architecture/API documentation. All product features from v0.5 are fully operational.

Default model: **mimo-v2.5** (OpenAI-compatible).

## License

MIT
