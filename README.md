# Parallel

[![CI](https://github.com/hkfrank996/parallel-ai-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/hkfrank996/parallel-ai-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Parallel is an AI narrative world engine for murder mysteries, investigative roleplay, and multi-character scenes that keep evolving after every turn.

[Chinese docs](README_ZH.md)

## What it is

Parallel is not a single-character chatbot and not a fixed-branch visual novel.

Each player message enters a living scene:

- a director decides who should respond and how the moment should feel
- characters answer from their own personality, memory, and relationships
- the world stores facts, memories, clues, events, and time progression
- the next turn starts from the updated world state, not from scratch

The result is closer to an AI-driven murder mystery engine than a chat UI.

## Why it is interesting

- Multi-character orchestration instead of one assistant persona
- Persistent world state across turns and sessions
- Relationship changes, clue extraction, and event generation
- Provider-agnostic LLM layer with OpenAI-compatible and Anthropic-style support
- World import/export through YAML so new scenarios can be authored without code

## How a turn works

1. The browser sends a message to `POST /api/chat`.
2. `runTurn()` advances world time and loads the active scene state.
3. The director picks speakers and generates narration.
4. Characters reply in sequence with their own memory and emotional context.
5. Post-turn analysis updates facts, memories, relationships, clues, and optional world events.

Architecture details live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requirements:

- Node.js 20+
- npm

Run locally:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Windows users can also double-click `start.bat`.

## LLM setup

Parallel supports OpenAI-compatible, Anthropic-style, OpenRouter, and Ollama endpoints. When no provider is configured, it falls back to mock mode.

There are two places to configure LLM access, and they serve different purposes:

### `.env.local` — local development defaults

This file sits on your machine and is gitignored. It provides defaults for `npm run dev` / `npm run start` so you don't have to configure anything in the browser during development.

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

More configuration examples are in [docs/CONFIG.md](docs/CONFIG.md).

### Settings modal — browser-local configuration

The in-app Settings modal stores provider, API URL, model, and API key in **browser localStorage**. This configuration:

- is per-browser, per-device — it doesn't travel with the code
- is never sent to the server except in the body of `/api/chat` and `/api/llm/test` requests
- overrides `.env.local` when present
- **is not bundled into the build** — if you give a copy of this project to a friend, they get your `.env.local` defaults (if you didn't gitignore it), but NOT your browser localStorage

### Sharing with friends

If you give someone a local copy of this project:

- `.env.local` is gitignored by default — it won't be in the repo unless you explicitly committed it
- Each person needs to create their own `.env.local` or configure Settings in their own browser
- The server never broadcasts your API key to connected browsers
- If you want to share a pre-configured setup, include `.env.local.example` with placeholder values and instructions

## Current status

The project is at a polished prototype stage:

- playable multi-world experience
- test, lint, and build coverage in CI
- recent work on narration cleanup, destructive action confirmation, browser storage fallback, and provider compatibility
- active performance tuning on `/api/chat`, especially director and post-turn analysis latency

## What is in the repo

- `app/`: Next.js pages and API routes
- `components/`: UI for the play surface, settings, sidebar, and timeline
- `lib/engine/`: turn orchestration, director, memory, relationships, events, clues
- `lib/llm/`: provider resolution, API clients, URL validation
- `data/worlds/`: YAML world definitions
- `docs/`: architecture, config, API, roadmap, world format

## Security and local data

These files are intentionally not committed:

- `.env.local`: local provider keys and endpoints
- `data/store.json`: runtime session state
- `CODEX_HANDOFF.md`: private handoff notes

The project also includes:

- SSRF protection for provider URLs
- sanitized error output
- browser-local settings that do not expose server-side keys back to the UI

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API.md](docs/API.md)
- [docs/CONFIG.md](docs/CONFIG.md)
- [docs/WORLD_FORMAT.md](docs/WORLD_FORMAT.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## License

MIT
