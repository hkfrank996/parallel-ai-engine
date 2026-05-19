import { v4 as uuid } from "uuid";
import { World, Character } from "@/lib/world/types";
import { Message, Relationship } from "@/lib/storage/store";
import { LLMProvider } from "@/lib/llm/types";

interface RelationshipChange {
  fromId: string;
  toId: string;
  trustDelta: number;
  hostilityDelta: number;
  dependencyDelta: number;
  reason: string;
}

interface ExtractionResult {
  changes: RelationshipChange[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function buildExtractionPrompt(
  world: World,
  characters: Character[],
  recentMessages: Message[],
  userInput: string,
  existingRelationships: Relationship[],
  language: "zh" | "en" = "en"
): { system: string; user: string } {
  const charList = characters
    .map((c) => `${c.id}: ${c.name} (${c.role})`)
    .join(", ");

  const relSummary = existingRelationships
    .map((r) => `${r.fromId}→${r.toId}: trust=${r.trust}, hostility=${r.hostility}, dependency=${r.dependency}`)
    .join("\n");

  const conversation = recentMessages
    .slice(-6)
    .map((m) => `${m.speakerName}: ${m.content}`)
    .join("\n");

  const system = `You are analyzing relationships in an interactive story "${world.name}" (${world.genre}).

Characters: ${charList}

Current relationships (0-100 scale):
${relSummary || "No relationships yet — use initial values."}

Analyze the latest interaction and determine if any relationships changed.

Relationship dimensions:
- trust (0-100): How much X believes and relies on Y
- hostility (0-100): How much X resents or opposes Y
- dependency (0-100): How much X needs Y for their goals

Respond with ONLY a JSON object:
{"changes": [{"fromId": "char_id", "toId": "char_id", "trustDelta": 0, "hostilityDelta": 0, "dependencyDelta": 0, "reason": "why"}]}

Rules:
- Each delta should be -20 to +20. Most turns: small deltas (0, ±5, ±10). Big shifts only for dramatic moments.
- Include the "user" as a fromId when the player's words affected a relationship
- If nothing significant changed, return {"changes": []}
- Max 3 changes per turn. Quality over quantity.${language === "zh" ? "\nreason 用中文。" : ""}`;

  const user = `Conversation:\n${conversation}\n\nLatest user input: "${userInput}"\n\nWhat relationships changed?`;

  return { system, user };
}

function parseResponse(text: string): RelationshipChange[] {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.changes)) {
      return parsed.changes.filter(
        (c: RelationshipChange) =>
          c.fromId && c.toId &&
          typeof c.trustDelta === "number" &&
          typeof c.hostilityDelta === "number" &&
          typeof c.dependencyDelta === "number"
      );
    }
  } catch {}

  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.changes)) return parsed.changes;
    } catch {}
  }

  return [];
}

export async function analyzeRelationships(
  provider: LLMProvider,
  envFallback: LLMProvider | null,
  world: World,
  characters: Character[],
  recentMessages: Message[],
  userInput: string,
  existingRelationships: Relationship[],
  sessionId: string,
  turnIndex: number,
  language: "zh" | "en" = "en"
): Promise<Relationship[]> {
  const { system, user } = buildExtractionPrompt(
    world, characters, recentMessages, userInput, existingRelationships, language
  );

  let rawChanges: RelationshipChange[];

  try {
    const response = await provider.generate(system, user);
    rawChanges = parseResponse(response);
  } catch {
    if (envFallback) {
      try {
        const response = await envFallback.generate(system, user);
        rawChanges = parseResponse(response);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  const now = new Date().toISOString();
  const updated: Relationship[] = [];

  for (const change of rawChanges.slice(0, 3)) {
    const existing = existingRelationships.find(
      (r) => r.fromId === change.fromId && r.toId === change.toId
    );

    if (existing) {
      const updatedRel: Relationship = {
        ...existing,
        trust: clamp(existing.trust + change.trustDelta),
        hostility: clamp(existing.hostility + change.hostilityDelta),
        dependency: clamp(existing.dependency + change.dependencyDelta),
        reason: change.reason,
        turnIndex,
        updatedAt: now,
      };
      updated.push(updatedRel);
    } else {
      updated.push({
        id: uuid(),
        sessionId,
        fromId: change.fromId,
        toId: change.toId,
        trust: clamp(50 + change.trustDelta),
        hostility: clamp(20 + change.hostilityDelta),
        dependency: clamp(30 + change.dependencyDelta),
        reason: change.reason,
        turnIndex,
        updatedAt: now,
      });
    }
  }

  return updated;
}

export function initializeRelationships(
  world: World,
  sessionId: string
): Relationship[] {
  const now = new Date().toISOString();
  const rels: Relationship[] = [];

  for (const char of world.characters) {
    const initials = char.initial_relationships;
    if (!initials) continue;

    for (const [targetId, values] of Object.entries(initials)) {
      rels.push({
        id: uuid(),
        sessionId,
        fromId: char.id,
        toId: targetId,
        trust: values.trust,
        hostility: values.hostility,
        dependency: values.dependency,
        turnIndex: 0,
        updatedAt: now,
      });
    }
  }

  return rels;
}
