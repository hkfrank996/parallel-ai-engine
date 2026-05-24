# Changelog

## v1.0.0 — 2026-05-24

First public release.

### Highlights

- **AI 剧本杀 world engine** — AI-driven murder mystery investigative roleplay with a living AI showrunner that adapts the story based on player behavior
- **9 showcase worlds** — cyberpunk mystery, dark fantasy, sci-fi conspiracy, modern mystery, xianxia dark fantasy, sci-fi survival
- **Multi-character AI showrunner** — Director manages who speaks, relationship shifts, world events, narrative tension, and emotional states
- **Persistent memory** — characters remember what happened, form reflections, and evolve over time
- **Relationship system** — trust/hostility/dependency dimensions shift based on player actions
- **Clue/evidence system** — LLM auto-extracts clues from dialogue
- **Investigation actions** — look around, listen, organize thoughts for immersive narration
- **World Workshop** — create, export, and import worlds via YAML without writing code
- **Provider support** — OpenAI-compatible, Anthropic, OpenRouter, Ollama, Mock Mode
- **Security hardening** — SSRF protection, YAML CORE_SCHEMA, error sanitization, import safety, test suite (47 tests)
- **Docker + CI** — multi-stage Dockerfile, GitHub Actions (lint + build)

### Security

- SSRF protection blocks private IPv4/IPv6, cloud metadata, localhost
- Error sanitization strips URLs, API keys, tokens from all error messages
- YAML parsing uses CORE_SCHEMA to prevent code execution
- Import validates before writing; no dirty files on failure
- No real secrets in committed files; `.env.local`, `data/store.json`, `CODEX_HANDOFF.md` gitignored
- Secret-like test fixtures replaced with obvious placeholders

### Documentation

- Bilingual README (EN/ZH)
- docs/CONFIG.md — LLM provider configuration guide
- docs/WORLD_FORMAT.md — YAML schema reference
- docs/ARCHITECTURE.md — system design and request flow
- docs/API.md — all 7 endpoints documented
- docs/ROADMAP.md / ROADMAP_ZH.md — development history
- docs/RELEASE_CHECKLIST.md — pre-release QA checklist

### Known Limitations

- Local JSON file store (`data/store.json`) — not suitable for multi-user deployment without replacement
- Single-user / self-hosted orientation — no API authentication layer
- DNS rebinding not fully covered (documented, acceptable for self-host)
- Store write race possible under concurrent access
- Browser UI QA was smoke-level, not exhaustive product QA
- No voice, avatars, or marketplace features

### Upgrade Notes

- Fresh install: `npm ci && npm run dev`
- Docker: `docker build -t parallel . && docker run --rm -p 3000:3000 --env-file .env.local -v ${PWD}/data:/app/data parallel`
- Configure LLM provider in `.env.local` or via in-app Settings modal
