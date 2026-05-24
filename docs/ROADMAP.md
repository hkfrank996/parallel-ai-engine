# Parallel — Product Roadmap

> AI 剧本杀 / AI-driven murder mystery investigative roleplay

> [中文版 / Chinese version](ROADMAP_ZH.md)

> You walk into an AI-built world where everyone has their own will. You explore, talk, discover — and the world changes in real-time based on your every move.
>
> This is not a scripted game. This is a **living world** — an AI 剧本杀 where characters remember, betray, and evolve.
>
> **Supports any genre**: cyberpunk mystery, dark fantasy, sci-fi conspiracy, modern urban — whatever you create, Parallel runs it.

## Core Concept: A Living AI Narrative World Engine

Traditional interactive fiction = fixed script + fixed characters + fixed truth. The player just "reads the script."

Parallel = **AI Director** + **Dynamic Characters** + **Mutable Truth**. Every player action affects the world:

- Ask someone a question, they get nervous — their lines will be different next time
- Expose a secret, other characters adjust their strategy based on that fact
- Ignore a clue, the director might hand it to another character to "detonate"
- Even the **main plot itself** can change — if you push the story in a direction the author never imagined

**The AI Director's role:**

The director doesn't simply "pick who speaks." It is the world's creator:

1. **Has a main plot, but doesn't cling to it** — the director has a storyline in mind, but is always ready to abandon it
2. **Creates tension** — when the plot is too smooth, the director creates surprises; when too chaotic, the director reins it in
3. **Characters have their own will** — the director lets characters act in their own interest, not "what the script needs"
4. **The world runs on its own** — even if the user does nothing, the world keeps changing

## Development Principles

1. **Living > Static**: The first question for every feature is "does this make the world more alive?"
2. **Player behavior drives the world**: Not scripted — the player's every move drives events
3. **The director is the soul**: The AI director's quality determines the entire product's quality
4. **Playable first, then mutable, then buildable**: Closure over complexity
5. **Every version is demonstrable**: Screenshots, recordings, demos — others need to see "this world is alive"

## Roadmap

```text
Playable → Memorable → Mutable → Buildable → Shareable → Release
```

| Version | Codename | Goal | What You See | Status |
|---------|----------|------|-------------|--------|
| v0.1 | Enter | Enter a scene, characters talk | 3 characters with personality talking to you | ✅ |
| v0.2 | Memory | Characters remember what happened | Round 10 references something from round 2 | ✅ |
| v0.3 | Living World | AI director rewrites the plot in real-time | Characters flip, emotional states, narrative tension, relationship evolution | ✅ |
| v0.4 | World Workshop | Create your own world | Build a world without writing code | ✅ |
| v0.5 | Polish | Player identity + clues + investigation + genre-agnostic engine | From "chat" to "investigation," engine adapts to any genre | ✅ |
| v0.6 | Extensible | Docker, CI, multi-model, extension layer | A new developer runs it in 10 minutes | ✅ |
| v1.0-P1 | Stable Layer | Security hardening, test suite, import safety | SSRF protection, error sanitization, 47 tests | ✅ |
| v1.0-P2 | Showcase Worlds | 9 demo worlds spanning 4 genres | Instant product demonstration | ✅ |
| v1.0-P3 | Release Docs | README, docs/, package review | Handoff-ready documentation | ✅ |
| v1.0-P4 | Pre-release QA | Polish, harden, accessibility | Production-quality validation | ⬜ |
| v1.0 | Release | Polished public release | Complete docs, demo deployment, v1.0 tag | ⬜ |

---

## v0.1 — Enter ✅ Completed

**Goal:** Get the user into a tense scene within 3 minutes.

**Implemented:**
- 3-character default scene (Neon Harbor rainy night market)
- AI director decides who speaks
- Characters have secrets, dodge questions, push back (murder-mystery feel prompts)
- Bilingual (EN/ZH) + API settings + 3-tier fallback
- Pure dialogue output, no narration/action descriptions

**Acceptance Criteria:**
- [x] New user enters a scene within 3 minutes
- [x] Characters don't directly answer questions — they dodge and push back
- [x] Dialogue has tension, feels like a murder mystery, not a chatbot

---

## v0.2 — Memory ✅ Completed

**Goal:** Characters actually remember what happened. Players can't "refresh to restart" — what you said, this world remembers.

**Implemented:**
- Automatic world fact + character memory extraction each turn
- Characters retrieve their own memories before speaking, injected into prompt
- Sidebar memory panel
- Memory persists after restart

**Acceptance Criteria:**
- [x] Round 10 dialogue naturally references something from round 2
- [x] World facts and character memories persist after restart
- [x] UI shows memory writes and hits

---

## v0.3 — Living World ✅ Completed

**Goal:** This world no longer just "remembers what you said" — it **changes because of you**.

### Core Mechanism: Three Layers of the AI Director

```
Layer 1: Reaction (v0.1-v0.2 done)
  → Characters respond based on dialogue context

Layer 2: Change (v0.3 done)
  → Director actively changes world state:
  - Relationships shift (trust→betrayal, hostility→cooperation)
  - New events occur (someone killed, a clue appears, a faction intervenes)
  - Scenes switch (night market→underground casino→abandoned dock)

Layer 3: Narrative (v0.3 foundation, enhanced later)
  → Director has its own narrative intent:
  - "This player deduces too fast — trigger a twist early"
  - "This player went totally off track — give a hint to guide them back, or don't, let them create a new story"
  - "The main plot is boring — have a character suddenly flip the table"
```

### v0.3 Implemented Features

**1. World Time Progression** ✅
- Day counter + time periods (dawn/morning/afternoon/night)
- Advance one period every 8 dialogue turns
- Time affects scene atmosphere (night = "Neon flickers in the rain")
- Character availability affected by time

**2. Relationship System** ✅
- Inter-character relationship dimensions: trust(0-100) / hostility(0-100) / dependency(0-100)
- Player behavior affects relationships (help Mira → Mira trust↑, pay for intel → June hostility↑)
- LLM analyzes dialogue each turn, outputs relationship changes (delta -20~+20)
- Initial relationships loaded from YAML
- UI shows relationship progress bars

**3. Dynamic Event Engine** ✅
- Director generates new events based on player behavior + relationship tension + world state
- Event types: plot_twist / character_action / environment / revelation / escalation
- Trigger conditions: high hostility(60+), trust collapse, narrative stagnation
- Not random events — events with narrative purpose

**4. Director Upgrade** ✅
- Upgraded from "pick who speaks" to "world state manager"
- Receives relationship data + time data + event history
- Narrative tension tracking: calm → simmering → tense → breaking_point
- Stagnation detection: proactively creates conflict when too long without events
- Character state tracking (active/incapacitated)

**5. Emotional State Engine** ✅
- Pure computation (no extra LLM calls), derives character mood from relationships + memories + time + personality
- 7 moods: irritable / uneasy / gentle / alert / down / calm / tense
- Arousal level affects reaction intensity
- Injected into character prompt: "your current mental state — you're wound tight"
- Time period modifier: more alert at night, more relaxed in morning
- Personality bias: suspicious characters naturally lean suspicious, volatile characters naturally lean angry

**6. Character Reflection** ✅
- New `reflection` category in memory extraction
- Characters form high-level insights from accumulated memories ("Ren seems to treat lives as currency")
- Reflection memories prioritized during retrieval
- Characters exhibit "learning" and "growth"

### Theoretical Foundations

| Theory | Application |
|--------|------------|
| Stanford Generative Agents | Memory Stream → Retrieval → Reflection → Planning architecture |
| Drama Management | Narrative tension arc: setup → rising action → climax → resolution |
| Emotional State Machine | Persistent emotional state affects dialogue tone |
| Emergent Narrative | Story emerges from system interaction, not preset scripts |

### Not Doing
- Complex combat systems
- Open-world maps
- Multi-user real-time collaboration

### Acceptance Criteria
- [x] Character relationships change because of dialogue
- [x] Director can create plot twists at key moments
- [x] Director has narrative arc awareness (tension tracking + stagnation detection)
- [x] Characters have persistent emotional states that affect dialogue tone
- [x] Characters form high-level insights from memories (reflection)
- [x] Player leaves for a few turns, world has new events when they return (Wait button + stagnation-triggered events)
- [x] Timeline lets players review "how the world got to this state" (Timeline tab)

### Core Differentiation
Character.AI is chat. SillyTavern is roleplay. Parallel is a **living world simulation** — the AI showrunner adapts the entire story based on player behavior.

---

## v0.4 — World Workshop ✅ Completed

**Goal:** Others can build their own worlds.

### Implemented
- World creation page: set scene, characters, relationships, secrets, rules, opening narration
- YAML storage: world data saved as `data/worlds/{id}.yaml`
- One-click export/import world packages (API: `/api/world/export`, `/api/world/import`)
- World list + switch dropdown
- 4 built-in templates: blank / modern mystery / sci-fi conspiracy / dark fantasy
- Full regression test passed (create→YAML save→list→dialogue→switch)

### Acceptance Criteria
- [x] Build a complete world without writing code
- [x] World packages can be exported, shared, and re-imported
- [x] All 4 templates run the core loop

### Not Implemented (Low Priority)
- Character relationship graph visual editor
- Main plot editor (define initial conflict and key nodes)

---

## v0.5 — Polish ✅ Completed

**Goal:** From "chat" to "game." Based on competitive analysis and immersive player perspective, fill core experience gaps.

### Implemented

**1. Player Identity System** ✅
- Enter name before joining world, overlay immersive entry
- Characters address player by name ("Chen, you've got sharp eyes")
- Name flows through entire chain: page → API → runTurn → director + buildPrompt + message
- Name persisted in localStorage

**2. Opening Narration** ✅
- New session first interaction auto-inserts `world.opening` as narrator message
- First impression changes from "empty chat box" to "movie opening"

**3. Clue/Evidence System** ✅
- LLM auto-extracts clues from dialogue (`clueEngine.ts`)
- Clue data model: name + description + source + relatedCharacterId
- Deduplicated storage (same name not added twice)
- Sidebar clue panel: source tag + related character + description
- New clues shown in turn notifications

**4. Investigation Action System** ✅
- Look around / Listen / Organize thoughts — three investigation action buttons
- Investigation actions skip Director and character dialogue, use dedicated narrator prompt
- Output cinematic sensory descriptions (environment details, character micro-expressions, suggestive clues)
- Normal dialogue still goes through Director + character generation

**5. Genre-Agnostic Engine** ✅
- 7 engine modules + 1 meta file all changed to genre-aware
- Director reads `world.genre` + `world.rules` + `world.tagline` for dynamic adaptation
- Character behavior prompts adjust by genre (mystery→characters with secrets lie; fantasy→supernatural言行)
- Clue engine supports genre-specific discovery types
- Cross-validated: cyberpunk mystery + dark fantasy both tested successfully

### Acceptance Criteria
- [x] Player has identity, characters use their name
- [x] Opening has cinematic narration
- [x] Clues auto-extracted from dialogue
- [x] Investigation actions produce immersive narration
- [x] Engine adapts to any world genre

---

## v0.6 — Extensible ✅ Completed

**Goal:** New developers can run it and extend it.

### Implemented

**1. Docker Support** ✅
- Multi-stage build (deps → builder → runner), Node 20 Alpine
- Default worlds packaged into image via COPY
- `data/store.json` volume-mountable for persistence
- Mock Mode when no API key provided

**2. GitHub Actions CI** ✅
- Push/PR triggers lint + build
- No real API key required

**3. Extensible Provider Architecture** ✅
- Provider registry (`lib/llm/catalog.ts`) as single source of truth
- 5 providers: openai / anthropic / openrouter / ollama / mock
- Two clear API chains: OpenAI-compatible + Anthropic native
- Key fix: explicit provider config without key → no longer silently falls back to Mock

**4. Settings UI** ✅
- 4 provider buttons in settings modal
- Provider selection auto-fills default placeholder/base URL
- Config saved even without key

**5. Extension Interface Layer** ✅
- 4 extension point interfaces: ModelProviderAdapter / MemoryProvider / EventGenerator / WorldTemplateProvider
- Type-safe registration/lookup

**6. Documentation** ✅
- Architecture docs: directory structure, request flow, provider system, extension layer
- API docs: all 7 endpoints with request/response/error documentation

### Acceptance Criteria
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Docker build succeeds
- [x] Docker runs, homepage accessible
- [x] New developer can run it from README alone
- [x] Provider registry works, old config compatible
- [x] Mock Mode not broken

---

## v1.0 Phase 1 — Stable Layer ✅

**Goal:** Stabilize the v0.6 codebase as a maintainable v1.0 baseline. No new features.

### Implemented

- SSRF protection — blocks private IPv4/IPv6, cloud metadata, localhost
- Error sanitization — strips URLs, API keys (sk-/tp-/key-/token-/api-), tokens from error messages
- YAML safety — `CORE_SCHEMA` prevents `!!js/function` code execution
- Import safety — validates session data before writing YAML; no dirty files on failure
- Store deduplication — re-importing clears old data before writing
- Test suite — 47 vitest tests (SSRF, sanitizeError, import dedup, import safety)

### Acceptance Criteria
- [x] `npm run test` passes (47 tests)
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] No real API keys in committed files
- [x] `.env.local`, `store.json`, `CODEX_HANDOFF.md` gitignored

---

## v1.0 Phase 2 — Showcase Worlds ✅

**Goal:** 9 high-quality demo worlds so users can see the product's range immediately.

### Worlds

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

### Acceptance Criteria
- [x] 9 worlds across 4 CSS themes (cyan/purple/blue/gold)
- [x] Each world: 3 characters, 2+ goals each, complete relationship matrix
- [x] All worlds load via API (HTTP 200)
- [x] No secrets, PII, or YAML injection in any file

---

## v1.0 Phase 3 — Release Docs & Package ✅

**Goal:** Make the project publishable, handoff-ready, and runnable by a new user.

### Implemented
- README refresh (bilingual, showcase world list, security notes)
- `docs/` directory: CONFIG, WORLD_FORMAT, ARCHITECTURE, API, ROADMAP, RELEASE_CHECKLIST
- package.json review (scripts, metadata)

### Acceptance Criteria
- [x] README.md lists all 9 showcase worlds
- [x] README.md has import/export, security, and testing sections
- [x] README_ZH.md mirrors English version
- [x] All internal doc links resolve
- [x] No real API keys in any documentation file
- [x] `npm run test` passes (47 tests)
- [x] `npm run lint` passes
- [x] `npm run build` passes

---

## v1.0 Phase 4 — Pre-release QA ⬜

**Goal:** Production-quality hardening without changing core features.

### Scope
- Race condition mitigation for `store.ts` (concurrent write safety)
- API authentication (optional, for multi-user deployments)
- Performance profiling for large sessions (1000+ messages)
- Accessibility audit (ARIA, keyboard navigation, screen reader)
- Mobile responsive polish
- Error boundary components
- Docker Compose for one-command deployment

---

## v1.0 — Closeout ⬜

**Goal:** Tag, release, and ship.

### Scope
- Version bump to `1.0.0` in `package.json`
- GitHub Release with tag `v1.0.0` and changelog
- Demo deployment (Vercel or Docker)
- Community world template submission guide

---

## Feature Priority Rule

**Prioritize features that make "this world alive."**

### High Priority
- AI director's narrative capability
- Dynamic character relationship changes
- World event engine
- Dynamic scene switching
- Character memory
- Timeline

### Low Priority
- Voice, avatars, marketplace
- Digital twin, mobile
- Multi-user online
- Complex permission systems

## Core Technical Challenges

### Challenge 1: Director Narrative Quality
The director must simultaneously manage "who speaks," "how relationships change," "what events should happen," and "where the plot goes." This requires strong LLM capability and prompt engineering. **Solution:** Layered prompts — one for narrative arc, one for character dispatch, one for world state.

### Challenge 2: Story Coherence
In long conversations, world state grows increasingly complex. Characters need to know what they've experienced and how relationships have changed. **Solution:** v0.2's memory system is the foundation. v0.3 implemented structured world state (relationship values, event logs, emotional states, character reflections). Characters maintain coherence through memory retrieval + emotional state injection.

### Challenge 3: Token Cost
Multiple characters + director + memory retrieval + event generation = multiple LLM calls per turn. **Solution:** Director uses a small model for fast decisions, character roleplay uses a large model for quality. Memory retrieval uses simple filtering, not vector search.

### Challenge 4: Unpredictability
A living world means the director will do things the developer didn't expect. This is a feature, not a bug — but needs safety boundaries. **Solution:** World rules (rules in YAML) serve as the director's constraints. Behavior beyond the rules is rejected.

---

## Blog Post Ideas

- Building a Living Narrative World Engine
- How Parallel's AI Showrunner Rewrites the Story in Real-Time
- Not a Chatbot, Not a Game — A Living World
- Dynamic Narrative: When the AI Director Changes the Plot Because of You
- From Chatbot to Living World: Building Parallel
