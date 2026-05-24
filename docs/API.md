# API Reference — Parallel

Base URL: `http://localhost:3000`

All responses are JSON. Error responses have the shape `{ "error": "..." }`.

---

## `GET /api/world`

Load a world and its full session state.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `worldId` | string | No | World ID. Omit to load the default world (`neon-harbor`). |
| `action` | string | No | Set to `list` to list all worlds instead. |

**Response (200) — load world:**

```json
{
  "world": {
    "id": "neon-harbor",
    "name": "Neon Harbor",
    "genre": "cyberpunk",
    "tagline": "...",
    "opening": "...",
    "scene": { "id": "...", "name": "...", "description": "..." },
    "characters": [
      {
        "id": "mira",
        "name": "Mira Voss",
        "role": "street doctor",
        "personality": ["guarded", "compassionate"],
        "goals": ["protect patients"],
        "speaking_style": "terse",
        "relationship_notes": {}
      }
    ],
    "relationships": [],
    "rules": []
  },
  "session": { "id": "session-neon-harbor", "worldId": "neon-harbor" },
  "messages": [
    {
      "id": "uuid",
      "sessionId": "session-neon-harbor",
      "speakerType": "user",
      "speakerId": null,
      "speakerName": "Chen",
      "content": "What happened?",
      "createdAt": "2026-05-19T12:00:00.000Z"
    },
    {
      "id": "uuid",
      "sessionId": "session-neon-harbor",
      "speakerType": "character",
      "speakerId": "mira",
      "speakerName": "Mira Voss",
      "content": "Keep your voice down.",
      "createdAt": "2026-05-19T12:00:01.000Z"
    },
    {
      "id": "uuid",
      "sessionId": "session-neon-harbor",
      "speakerType": "narrator",
      "speakerId": null,
      "speakerName": "Narrator",
      "content": "The rain drums on the plastic awning...",
      "createdAt": "2026-05-19T12:00:02.000Z"
    }
  ],
  "events": [
    { "id": "uuid", "sessionId": "...", "turnIndex": 0, "summary": "...", "createdAt": "..." }
  ],
  "worldFacts": [
    { "id": "uuid", "sessionId": "...", "content": "A courier is missing", "createdAt": "..." }
  ],
  "characterMemories": [
    { "id": "uuid", "sessionId": "...", "characterId": "mira", "category": "impression", "content": "...", "createdAt": "..." }
  ],
  "worldTime": { "sessionId": "...", "day": 1, "timeOfDay": "night", "turnCount": 3, "turnsThisPeriod": 3 },
  "relationships": [
    { "sessionId": "...", "fromId": "mira", "toId": "ren", "trust": 40, "hostility": 20, "dependency": 10 }
  ],
  "worldEvents": [
    { "id": "uuid", "sessionId": "...", "type": "revelation", "description": "...", "impact": "...", "createdAt": "..." }
  ],
  "relationshipHistory": [
    { "sessionId": "...", "fromId": "mira", "toId": "ren", "trust": 40, "hostility": 20, "reason": "...", "turnIndex": 2, "createdAt": "..." }
  ],
  "clues": [
    { "id": "uuid", "sessionId": "...", "name": "Missing Courier", "description": "...", "source": "ren", "relatedCharacterId": "ren", "createdAt": "..." }
  ],
  "isMock": false,
  "providerType": "openai"
}
```

**`speakerType` values:** `"user"`, `"character"`, `"narrator"`

---

## `GET /api/world?action=list`

List all available worlds.

**Response (200):**

```json
{
  "worlds": [
    { "id": "neon-harbor", "name": "Neon Harbor", "genre": "cyberpunk" },
    { "id": "dark-fantasy", "name": "The Obsidian Tower", "genre": "dark-fantasy" }
  ]
}
```

---

## `POST /api/world/create`

Create a new world.

**Request Body:** Full world object matching `worldSchema` (`lib/world/types.ts`).

Required fields:

```json
{
  "id": "my-world",
  "name": "My World",
  "genre": "mystery",
  "tagline": "A short description",
  "opening": "Opening narration text",
  "scene": { "id": "scene1", "name": "Main Scene", "description": "..." },
  "characters": [
    {
      "id": "char1",
      "name": "Alice",
      "role": "detective",
      "personality": ["observant"],
      "goals": ["solve the case"],
      "speaking_style": "concise",
      "relationship_notes": {}
    }
  ],
  "relationships": [],
  "rules": ["No magic"]
}
```

**Validation:**
- Every character must have non-empty `name` and `role` (enforced by the route, not the schema).
- `id` is sanitized to `[a-z0-9-]`.

**Response (200):**

```json
{ "success": true, "worldId": "my-world" }
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Schema validation failed, or character missing name/role |

---

## `GET /api/world/export`

Export a world as YAML with optional session data.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `worldId` | string | Yes | World ID to export |

**Response (200):**

```json
{
  "worldId": "neon-harbor",
  "yaml": "id: neon-harbor\nname: Neon Harbor\n...",
  "sessionData": {
    "messages": [...],
    "worldFacts": [...],
    "characterMemories": [...],
    "worldEvents": [...],
    "worldTime": { "day": 1, "timeOfDay": "night", ... },
    "relationships": [...],
    "relationshipHistory": [...]
  },
  "exportedAt": "2026-05-19T12:00:00.000Z"
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing `worldId` |
| 404 | World YAML not found |

---

## `POST /api/world/import`

Import a world from YAML.

**Request Body:**

```json
{
  "yaml": "id: my-world\nname: My World\n...",
  "sessionData": { ... }
}
```

- `yaml` (required): Full world YAML
- `sessionData` (optional): Previously exported session data

**Response (200):**

```json
{ "success": true, "worldId": "my-world" }
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Missing YAML, invalid YAML, or schema validation failed |

---

## `POST /api/llm/test`

Test an LLM provider connection.

**Request Body:**

```json
{
  "llmConfig": {
    "providerType": "openai",
    "apiUrl": "https://api.openai.com/v1",
    "apiKey": "your_openai_api_key_here",
    "model": "gpt-4o-mini"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providerType` | string | No | `openai` / `anthropic` / `openrouter` / `ollama`. Defaults to `openai`. |
| `apiUrl` | string | No | Provider base URL |
| `apiKey` | string | Conditional | Required for `anthropic` and `openrouter`. Optional for `openai`/`ollama`. |
| `model` | string | No | Model name |

**Key behavior:**
- **Anthropic / OpenRouter:** `apiKey` is required. Returns 400 if missing.
- **OpenAI-compatible (openai/ollama):** `apiKey` is optional. If omitted, the request is sent without an `Authorization` header (no fake token).
- **Mock Mode:** Only when no provider is configured at all. Not triggered by an empty key.

**Response (200):**

```json
{
  "ok": true,
  "providerType": "openai",
  "model": "gpt-4o-mini",
  "preview": "Parallel API settings are connected."
}
```

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | `anthropic` or `openrouter` without API key, or provider resolved to Mock |
| 502 | Connection failed, timeout, or provider returned an error |

---

## `POST /api/chat`

Send a message and receive the world's response.

**Request Body:**

```json
{
  "sessionId": "session-neon-harbor",
  "message": "What happened to the courier?",
  "worldId": "neon-harbor",
  "playerName": "Chen",
  "language": "en",
  "llmConfig": {
    "providerType": "openai",
    "apiUrl": "https://api.openai.com/v1",
    "apiKey": "your_openai_api_key_here",
    "model": "gpt-4o-mini"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Player's message |
| `sessionId` | string | No | Existing session ID. Omit to auto-create/load. |
| `worldId` | string | No | World ID. Defaults to `neon-harbor`. |
| `playerName` | string | No | Player's in-world name |
| `language` | string | No | `"en"` or `"zh"`. Default `"en"`. |
| `llmConfig` | object | No | Provider override. If omitted, uses server env or Mock. |

**`llmConfig` behavior:**
- If provided with `apiKey`: uses that key.
- If provided without `apiKey` but with `providerType`/`apiUrl`/`model`: uses those settings (for key-less providers like Ollama).
- If omitted entirely: uses server env vars, or Mock Mode if none set.

**Response (200) — `TurnResult`:**

```json
{
  "userMessage": { "id": "uuid", "content": "What happened?" },
  "narration": "The rain picks up...",
  "characterMessages": [
    { "speakerId": "mira", "speakerName": "Mira Voss", "content": "Keep your voice down." }
  ],
  "event": { "summary": "Player asked about the courier" },
  "sceneUpdate": "Tension rises in the market",
  "degraded": false,
  "memoriesExtracted": {
    "worldFacts": ["The player is investigating the courier"],
    "characterMemories": [
      { "characterId": "mira", "category": "impression", "content": "The player asks too many questions" }
    ]
  },
  "worldTime": { "day": 1, "timeOfDay": "night", "label": "Day 1 · Night" },
  "relationshipChanges": [
    { "fromId": "mira", "toId": "player", "trust": -5, "hostility": 5, "reason": "Asked about sensitive topic" }
  ],
  "worldEvents": [
    { "type": "revelation", "description": "A shadow moves in the alley", "impact": "New lead" }
  ],
  "clues": [
    { "name": "Suspicious Figure", "description": "Someone was watching from the alley", "source": "narrator", "relatedCharacterId": "ren" }
  ]
}
```

All fields except `userMessage` and `characterMessages` are optional — they appear only when relevant.

**`degraded: true`** means the response used a fallback provider or fallback台词 (the real provider failed).

**Errors:**

| Status | Cause |
|--------|-------|
| 400 | Empty or missing `message` |
| 500 | Engine error |
