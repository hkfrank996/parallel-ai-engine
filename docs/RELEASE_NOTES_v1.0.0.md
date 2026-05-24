# Parallel v1.0.0 Release Notes

> Parallel v1.0 is an **AI-driven murder mystery / AI 剧本杀 world engine**. You walk into an AI-built world where everyone has their own will. You explore, talk, discover — and the world changes in real-time based on your every move.

## What's New

### Living AI Narration

The AI showrunner (Director) doesn't just pick who speaks — it manages the entire story:

- **Dynamic characters** — each character has personality, goals, secrets, and a speaking style
- **Relationship evolution** — trust, hostility, and dependency shift based on your actions
- **World events** — plot twists, revelations, and escalations triggered by narrative tension
- **Emotional states** — characters react differently based on mood, arousal, and accumulated memories
- **Character reflection** — characters form high-level insights from their experiences

### 9 Showcase Worlds

| World | Genre | Hook |
|-------|-------|------|
| Neon Harbor | Cyberpunk mystery | A rainy night market, a missing courier, three people with secrets |
| Crimson Keep | Dark fantasy | A dead advisor, a prophecy, three suspects before dawn |
| Orbital Station Sigma | Sci-fi conspiracy | Air running out, captain dead, station AI always listening |
| Shadow Realm | Dark fantasy | A dying crystal, three mages, the Shadow closing in |
| Jade Sect Summons | Xianxia dark fantasy | Three cultivators answer a forbidden summons beneath a jade mountain |
| Hollow Creek | Modern mystery | A small town where the creek runs red and nobody calls the sheriff |
| Last Light Station | Sci-fi survival | A deep-space relay, dwindling oxygen, a voice on the comm |
| Glass Tower | Cyberpunk mystery | CEO vanished, every floor has a secret, lockdown initiated |
| Vermillion Manor | Dark fantasy mystery | A dead patriarch, a locked room, three heirs with motive |

### World Workshop

Create your own worlds without writing code:

- Set scene, characters, relationships, secrets, rules, and opening narration
- Export/import as YAML packages
- 4 built-in templates to get started

### Provider Support

| Provider | Protocol | Requires Key |
|----------|----------|-------------|
| OpenAI-compatible | `/v1/chat/completions` | No |
| Anthropic | `/v1/messages` | Yes |
| OpenRouter | `/v1/chat/completions` | Yes |
| Ollama (local) | `/v1/chat/completions` | No |
| Mock | — | No (auto) |

### Security

- SSRF protection blocks private IPs, cloud metadata, localhost
- Error sanitization strips URLs, keys, and tokens from all error messages
- YAML CORE_SCHEMA prevents code execution
- Import validates before writing; no dirty files on failure
- 47 vitest tests covering SSRF, error sanitization, import safety

## Quick Start

### npm

```bash
git clone https://github.com/hkfrank996/parallel-ai-engine.git
cd parallel-ai-engine
npm ci
cp .env.local.example .env.local   # configure your LLM provider
npm run dev
```

### Docker

```bash
docker build -t parallel .
docker run --rm -p 3000:3000 \
  --env-file .env.local \
  -v ${PWD}/data:/app/data \
  parallel
```

Open http://localhost:3000, enter your name, and step into a world.

## Documentation

- [README.md](../README.md) — overview and quick start
- [docs/CONFIG.md](CONFIG.md) — LLM provider configuration
- [docs/WORLD_FORMAT.md](WORLD_FORMAT.md) — YAML world format reference
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — system design
- [docs/API.md](API.md) — API endpoints
- [docs/ROADMAP.md](ROADMAP.md) — development roadmap

## Known Limitations

- **Local JSON store** — `data/store.json` is a flat-file store, not suitable for multi-user deployment without replacement
- **No API authentication** — designed for single-user / self-hosted use
- **DNS rebinding** — not fully covered (documented, acceptable for self-host)
- **Store race condition** — concurrent writes possible under multi-user access
- **Browser UI QA** — smoke-level testing, not exhaustive product QA

## Security Note

- No real secrets in the current tree
- Secret-like test fixtures replaced with obvious placeholders
- `.env.local`, `data/store.json`, `CODEX_HANDOFF.md` are gitignored
- See [docs/RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for the full QA checklist
