import { v4 as uuid } from "uuid";
import { World, Character } from "@/lib/world/types";
import { Message } from "@/lib/storage/store";
import { LLMProvider } from "@/lib/llm/types";

interface RawClue {
  name: string;
  description: string;
  source: "dialogue" | "examination" | "deduction" | "document";
  relatedCharacterId?: string;
}

export async function extractClues(
  provider: LLMProvider,
  envFallback: LLMProvider | null,
  world: World,
  characters: Character[],
  turnMessages: Message[],
  sessionId: string,
  turnIndex: number,
  language: "zh" | "en" = "en"
): Promise<RawClue[]> {
  const charList = characters.map((c) => `${c.id}: ${c.name}`).join(", ");
  const conversation = turnMessages
    .map((m) => `${m.speakerName}: ${m.content}`)
    .join("\n");

  const langNote = language === "zh"
    ? "所有 name 和 description 必须用中文。"
    : "All names and descriptions must be in English.";

  const system = `You are a discovery extraction system for an interactive story game. Analyze the conversation and identify any NEW discoveries, evidence, or important information that was revealed.

A discovery can be:
- A physical object or piece of evidence mentioned (a broken watch, a hidden letter, a magical artifact)
- A factual revelation (someone was at a specific place at a specific time)
- A contradiction (someone's story doesn't match the facts)
- A behavioral clue (someone flinched when a topic was mentioned)
- A secret that was partially or fully revealed
- A connection between people or events
- World-specific information appropriate to the genre (magical phenomena, technological capabilities, supernatural events, etc.)

Characters: ${charList}
World genre: ${world.genre}
${langNote}

Return JSON array (no markdown):
[
  {
    "name": "short discovery name (2-5 words)",
    "description": "what was discovered, including who said/revealed it",
    "source": "dialogue",
    "relatedCharacterId": "character_id or null"
  }
]

Rules:
- Only extract discoveries that are NEW information, not restatements of known facts
- Max 3 discoveries per turn
- If no new discoveries were revealed, return empty array []
- Be specific and factual
- Include WHO revealed or implied the discovery in the description`;

  const user = `Conversation:\n${conversation}\n\nExtract new clues from this conversation.`;

  const tryExtract = async (p: LLMProvider): Promise<RawClue[]> => {
    const response = await p.generate(system, user);
    return parseClueResponse(response, characters);
  };

  try {
    return await tryExtract(provider);
  } catch {}

  if (envFallback) {
    try {
      return await tryExtract(envFallback);
    } catch {}
  }

  return [];
}

function parseClueResponse(text: string, characters: Character[]): RawClue[] {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const tryParse = (s: string): RawClue[] | null => {
    try {
      const parsed = JSON.parse(s);
      if (!Array.isArray(parsed)) return null;
      const charIds = new Set(characters.map((c) => c.id));
      return parsed.filter((c: RawClue) =>
        c.name && c.description &&
        (!c.relatedCharacterId || charIds.has(c.relatedCharacterId))
      ).map((c: RawClue) => ({
        name: String(c.name).slice(0, 80),
        description: String(c.description).slice(0, 300),
        source: ["dialogue", "examination", "deduction", "document"].includes(c.source)
          ? c.source : "dialogue",
        relatedCharacterId: c.relatedCharacterId || undefined,
      }));
    } catch {
      return null;
    }
  };

  const direct = tryParse(jsonStr);
  if (direct) return direct;

  const match = jsonStr.match(/\[[\s\S]*\]/);
  if (match) {
    const extracted = tryParse(match[0]);
    if (extracted) return extracted;
  }

  return [];
}
