# World YAML Format

> Each world is a single YAML file in `data/worlds/`. The schema is validated by Zod at load time.

## Minimal Example

```yaml
id: my-world
name: My World
tagline: A one-line description.
genre: modern mystery

rules:
  - Clues always cost something
  - Trust changes every time you lie

opening: >
  A foggy night. Three people stand in a circle.
  No one wants to speak first.

scene:
  id: lobby
  name: The Lobby
  description: >
    A dimly lit hotel lobby with cracked marble floors.

characters:
  - id: alice
    name: Alice
    role: Detective
    personality:
      - observant
      - cautious
      - persistent
    goals:
      - Find the missing evidence
      - Keep her own secret hidden
    speaking_style: Terse, asks more questions than she answers.
    relationship_notes:
      bob: She suspects he knows more than he says.
    initial_relationships:
      bob: { trust: 30, hostility: 20, dependency: 40 }

  - id: bob
    name: Bob
    role: Hotel manager
    personality:
      - nervous
      - helpful
      - evasive
    goals:
      - Protect the hotel's reputation
      - Figure out who called the police
    speaking_style: Over-explains, deflects with hospitality.
    relationship_notes:
      alice: She's asking the right questions. That's dangerous.
    initial_relationships:
      alice: { trust: 25, hostility: 35, dependency: 50 }
```

---

## Schema Reference

### Top-level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier. Lowercase alphanumeric + hyphens only (`[a-z0-9-]+`). |
| `name` | string | Yes | Display name shown in the UI. |
| `tagline` | string | Yes | One-line hook shown in the world list. |
| `genre` | string | Yes | Free text (e.g. `"cyberpunk mystery"`, `"dark fantasy"`). Affects CSS theme. |
| `rules` | string[] | Yes | World-level constraints the AI showrunner enforces. |
| `opening` | string | Yes | Scene-setting text shown when the world loads. |
| `scene` | object | Yes | Initial scene with `id`, `name`, `description`. |
| `characters` | object[] | Yes | At least 1 character required. |

### Scene Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Scene identifier. |
| `name` | string | Display name. |
| `description` | string | Where the scene takes place. |

### Character Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique within the world. Used as key in relationship maps. |
| `name` | string | Yes | Display name. |
| `role` | string | Yes | Character's role in the story. |
| `personality` | string[] | Yes | 2+ personality traits. |
| `goals` | string[] | Yes | 2+ goals the character pursues. |
| `speaking_style` | string | Yes | How the character talks. |
| `relationship_notes` | object | Yes | Keyed by other character `id`. Each value is a note about that relationship. |
| `initial_relationships` | object | No | Keyed by other character `id`. Each value has `trust`, `hostility`, `dependency` (0-100). |

### Relationship Values

Each entry in `initial_relationships`:

| Field | Range | Description |
|-------|-------|-------------|
| `trust` | 0-100 | How much this character trusts the other. |
| `hostility` | 0-100 | How much hostility they feel. |
| `dependency` | 0-100 | How much they depend on the other. |

---

## Common Pitfalls

### 1. Unquoted colons in values

A YAML string containing `: ` (colon followed by space) will be parsed as an object if not quoted.

```yaml
# BROKEN — parsed as {Truth spreads like flood water: fast, dirty, and destructive}
rules:
  - Truth spreads like flood water: fast, dirty, and destructive

# FIXED — quoted string
rules:
  - "Truth spreads like flood water: fast, dirty, and destructive"
```

**Safe:** Block scalars (`>` and `|`) are immune to this issue.

### 2. Missing required fields

All top-level fields (`id`, `name`, `tagline`, `genre`, `rules`, `opening`, `scene`, `characters`) are required. The load will fail with a Zod validation error.

### 3. Character id mismatch

`relationship_notes` and `initial_relationships` keys must match other character `id` values in the same world.

### 4. Values out of range

`trust`, `hostility`, `dependency` must be 0-100 integers.

### 5. Empty characters array

At least 1 character is required.

---

## YAML Tips

| Syntax | Use Case |
|--------|----------|
| `>` | Folded block scalar — newlines become spaces. Good for paragraphs. |
| `\|` | Literal block scalar — preserves newlines. Good for poetry/formatted text. |
| `"..."` | Double-quoted — use when value contains `:` or `#`. |
| `'...'` | Single-quoted — use for literal strings with no escape sequences. |

---

## Export / Import

### Export

```
GET /api/world/export?worldId=<id>
```

Returns JSON: `{ worldId, yaml, sessionData }`

- `yaml`: the world definition as a YAML string
- `sessionData`: all runtime data (messages, events, memories, relationships, clues)

### Import

```
POST /api/world/import
Content-Type: application/json
Body: { yaml: string, sessionData?: object }
```

**Constraints:**
- Max YAML size: 500 KB
- Max session entries: 10,000 total across all collections
- YAML is validated against the world schema before any file is written
- `sessionData` fields are type-checked (arrays must be arrays)
- On validation failure, no files are created (no dirty state)
- Re-importing clears existing session data before writing (dedup)

### Genre → CSS Theme

The `genre` field maps to a UI color theme:

| Pattern | Theme |
|---------|-------|
| `cyberpunk`, `neon` | Cyan |
| `fantasy`, `dark` | Purple |
| `sci`, `science`, `space` | Blue |
| `modern`, `mystery` | Gold |
