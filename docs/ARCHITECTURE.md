# Architecture — Parallel v0.6

## Directory Structure

```text
parallel/
├── app/                        # Next.js App Router pages & API routes
│   ├── page.tsx                # Main game page
│   ├── create/page.tsx         # World creation page
│   └── api/
│       ├── chat/route.ts       # POST — send a message, get AI response
│       ├── llm/test/route.ts   # POST — test LLM connection
│       └── world/
│           ├── route.ts        # GET — load world / list worlds
│           ├── create/route.ts # POST — create a new world
│           ├── export/route.ts # GET — export world as YAML+session
│           └── import/route.ts # POST — import world from YAML
├── components/                 # React UI components
│   ├── SettingsModal.tsx       # API provider configuration
│   ├── MessageList.tsx         # Chat message display
│   ├── MessageComposer.tsx     # Input + investigation actions
│   ├── WorldSidebar.tsx        # Characters, relationships, clues
│   └── TimelinePanel.tsx       # World event timeline
├── data/
│   ├── worlds/*.yaml           # World definitions (YAML)
│   └── store.json              # Runtime session data (messages, facts, memories, events)
├── lib/
│   ├── engine/                 # Core world engine
│   │   ├── runTurn.ts          # Main turn orchestrator
│   │   ├── director.ts         # AI showrunner / director
│   │   ├── memoryExtractor.ts  # Fact & memory extraction
│   │   ├── relationshipEngine.ts
│   │   ├── eventEngine.ts
│   │   ├── emotionalState.ts
│   │   └── clueEngine.ts
│   ├── llm/                    # LLM provider layer
│   │   ├── types.ts            # LLMProvider interface
│   │   ├── catalog.ts          # Provider registry (metadata, defaults)
│   │   ├── provider.ts         # Provider resolution logic
│   │   ├── openaiProvider.ts   # OpenAI-compatible implementation
│   │   ├── anthropicProvider.ts# Anthropic implementation
│   │   └── mockProvider.ts     # Mock implementation
│   ├── extensions/             # Extension point definitions
│   │   ├── types.ts            # Extension interfaces
│   │   └── registry.ts         # Extension registration
│   ├── storage/                # Data persistence
│   │   └── store.ts            # JSON file storage
│   └── world/                  # World loading & types
│       ├── loadWorld.ts
│       └── types.ts
├── Dockerfile
├── .github/workflows/ci.yml
└── docs/
    ├── ARCHITECTURE.md         # ← this file
    └── API.md                  # API reference
```

## Request Flow

```text
Browser
  → Next.js page (app/page.tsx)
  → POST /api/chat
  → lib/engine/runTurn.ts
  → lib/llm/provider.ts (resolves provider from config)
  → LLMProvider.generate() (OpenAI / Anthropic / Mock)
  → Director decides next action
  → Character generates response
  → Memory extraction + relationship update + event generation
  → Response returned to browser
```

## World Data Sources

- **`data/worlds/*.yaml`** — Static world definitions (characters, relationships, rules, opening narration)
- **`data/store.json`** — Runtime state (sessions, messages, world facts, character memories, relationships, world events, clues)

## Provider System

### Resolution Order

1. **Config with apiKey** → use that provider directly
2. **Config without apiKey but with explicit providerType/apiUrl/model** → use that provider (key-less providers like Ollama, or will fail at API call time)
3. **Env `LLM_PROVIDER`** → build from env vars
4. **Auto-detect env vars** → `OPENAI_API_KEY` > `ANTHROPIC_API_KEY`
5. **Nothing configured** → Mock Mode

Key principle: **"no key" ≠ Mock Mode**. Only "no configuration at all" = Mock Mode.

### Two API Chains

| Chain | Protocol | Providers | Key Required |
|-------|----------|-----------|-------------|
| **OpenAI-compatible** | `/v1/chat/completions` | openai, openrouter, ollama | Optional (depends on server) |
| **Anthropic native** | `/v1/messages` | anthropic | Always required |

### Provider Registry (`lib/llm/catalog.ts`)

Single source of truth for provider metadata:

| Provider | Protocol | Default Base URL | Requires Key |
|----------|----------|-----------------|--------------|
| openai | OpenAI-compatible | `https://api.openai.com/v1` | No* |
| anthropic | Anthropic native | `https://api.anthropic.com/v1` | Yes |
| openrouter | OpenAI-compatible | `https://openrouter.ai/api/v1` | Yes |
| ollama | OpenAI-compatible | `http://localhost:11434/v1` | No |
| mock | N/A | — | No |

*OpenAI-compatible is marked `requiresKey: false` because the protocol supports key-less servers (local Ollama, self-hosted). OpenAI's official API does require a key, but the registry doesn't enforce that.

### Mock Mode

Only activated when **no configuration exists at all** — no browser config, no env vars. If the user explicitly configured a provider (even without a key), the system will attempt to use that provider, not silently fall back to Mock.

### Extension Layer (`lib/extensions/`)

Four extension point interfaces are defined for future expansion:

1. **ModelProviderAdapter** — Swap in new LLM providers
2. **MemoryProvider** — Alternative memory storage (e.g., vector DB)
3. **EventGenerator** — Custom event generation logic
4. **WorldTemplateProvider** — Additional world templates

These are currently interface-only; existing implementations remain in-place. No runtime plugin loading is implemented.
