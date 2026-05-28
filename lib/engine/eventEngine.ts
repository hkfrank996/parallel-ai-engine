import { v4 as uuid } from "uuid";
import { World, Character } from "@/lib/world/types";
import { Message, Relationship, WorldTime, WorldEvent } from "@/lib/storage/store";
import { LLMGenerateOptions, LLMProvider } from "@/lib/llm/types";
import { timeAtmosphere } from "./worldTime";

interface DirectorEvent {
  type: "plot_twist" | "character_action" | "environment" | "revelation" | "escalation";
  description: string;
  impact: string;
}

interface EventResult {
  events: DirectorEvent[];
}

function buildEventPrompt(
  world: World,
  characters: Character[],
  recentMessages: Message[],
  userInput: string,
  relationships: Relationship[],
  worldTime: WorldTime,
  language: "zh" | "en" = "en"
): { system: string; user: string } {
  const charList = characters
    .map((c) => `${c.id}: ${c.name} (${c.role})`)
    .join(", ");

  const conversation = recentMessages
    .slice(-6)
    .map((m) => `${m.speakerName}: ${m.content}`)
    .join("\n");

  const relSummary = relationships
    .slice(-6)
    .map((r) => `${r.fromId}→${r.toId}: trust=${r.trust}, hostility=${r.hostility}`)
    .join("\n");

  const atmosphere = timeAtmosphere(worldTime.timeOfDay);

  const langNote = language === "zh"
    ? "\ndescription 和 impact 用中文。"
    : "";

  const system = `You are the narrative engine of a living interactive story "${world.name}" (${world.genre}).

Characters: ${charList}
World rules:
${world.rules.map((r) => `- ${r}`).join("\n")}

Current atmosphere: ${atmosphere}
Day ${worldTime.day}, ${worldTime.timeOfDay}, turn ${worldTime.turnCount}

Relationship tensions:
${relSummary || "Relationships are still forming."}

Your job: Decide if a NEW EVENT should occur based on the interaction. Events make the world feel alive.

Event types:
- plot_twist: A major revelation or reversal (use sparingly — every 8-12 turns)
- character_action: A character does something significant off-screen (arrives, leaves, sends a message)
- environment: The world itself changes (weather, power outage, a scream from somewhere)
- revelation: A hidden truth comes to light (someone's identity, a secret connection)
- escalation: Tensions rise (a threat, a deadline, an ultimatum)

Respond with ONLY JSON:
{"events": [{"type": "event_type", "description": "what happens", "impact": "how this changes things"}]}

Rules:
- Most turns: return {"events": []} — events are special, not constant
- Trigger conditions: high hostility (60+), broken trust, player close to a secret, or narrative stagnation
- Max 1 event per turn. Every event must have CONSEQUENCES that affect future dialogue.
- Description should be 1-2 sentences, vivid and specific to this world.${langNote}`;

  const user = `Conversation:\n${conversation}\n\nUser just said: "${userInput}"\n\nShould an event occur?`;

  return { system, user };
}

function parseResponse(text: string): DirectorEvent[] {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const validTypes = new Set(["plot_twist", "character_action", "environment", "revelation", "escalation"]);

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.events)) {
      return parsed.events.filter(
        (e: DirectorEvent) =>
          validTypes.has(e.type) && e.description && e.impact
      );
    }
  } catch {}

  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.events)) return parsed.events;
    } catch {}
  }

  return [];
}

export async function generateWorldEvents(
  provider: LLMProvider,
  envFallback: LLMProvider | null,
  world: World,
  characters: Character[],
  recentMessages: Message[],
  userInput: string,
  relationships: Relationship[],
  worldTime: WorldTime,
  sessionId: string,
  turnIndex: number,
  language: "zh" | "en" = "en",
  generateOptions?: LLMGenerateOptions
): Promise<WorldEvent[]> {
  const { system, user } = buildEventPrompt(
    world, characters, recentMessages, userInput, relationships, worldTime, language
  );

  let directorEvents: DirectorEvent[];

  try {
    const response = await provider.generate(system, user, generateOptions);
    directorEvents = parseResponse(response);
  } catch {
    if (envFallback) {
      try {
        const response = await envFallback.generate(system, user, generateOptions);
        directorEvents = parseResponse(response);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  const now = new Date().toISOString();
  return directorEvents.slice(0, 1).map((de) => ({
    id: uuid(),
    sessionId,
    type: de.type,
    description: de.description,
    impact: de.impact,
    turnIndex,
    createdAt: now,
  }));
}
