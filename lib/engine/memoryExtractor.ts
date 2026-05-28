import { World, Character } from "@/lib/world/types";
import { Message, WorldFact, CharacterMemory } from "@/lib/storage/store";
import { LLMGenerateOptions, LLMProvider } from "@/lib/llm/types";

export interface ExtractedMemories {
  worldFacts: Omit<WorldFact, "id" | "createdAt">[];
  characterMemories: Omit<CharacterMemory, "id" | "createdAt">[];
}

function buildExtractionPrompt(
  world: World,
  characters: Character[],
  turnMessages: Message[],
  turnIndex: number,
  language: "zh" | "en" = "en"
): { system: string; user: string } {
  const charList = characters
    .map((c) => `${c.id} (${c.name})`)
    .join(", ");

  const conversation = turnMessages
    .map((m) => {
      const speaker = m.speakerType === "user" ? "【玩家/USER】You" : `${m.speakerName} [character:${m.speakerId}]`;
      return `${speaker}: ${m.content}`;
    })
    .join("\n");

  const langNote = language === "zh"
    ? "\n所有 content 用中文。\n\n⚠️ 归因规则（最重要）:\n- 「玩家/USER」是外部玩家，不是角色。如果玩家打了角色 A，归因是「玩家打了 A」，不是「A 打了谁」\n- 角色之间的事要归因到发起者：如果 Ren 威胁了 June，characterMemories 应记为 June 被威胁（about: ren），不是反过来\n- 检查每条 characterMemory 的 about 和 content：谁做的动作、谁承受的后果，不能搞反"
    : "\n\n⚠️ Attribution rules (CRITICAL):\n- 【玩家/USER】is the external PLAYER, not a character. If the player threatens Ren, the memory is about Ren being threatened BY the player, not Ren threatening someone\n- Between characters: attribute actions to the DOER. If Ren threatens June, June's memory should say 'Ren threatened me', not 'I threatened Ren'\n- Double-check each characterMemory: who did the action vs who was affected";

  const system = `You are a memory extraction engine for an interactive story in "${world.name}".

Given a conversation turn, extract:
1. WORLD FACTS: objective facts about what happened (events, actions, changes to the world)
2. CHARACTER MEMORIES: subjective observations from each character's perspective
3. REFLECTIONS: higher-level insights — patterns a character would notice about themselves or others after reflecting on recent events

Characters: ${charList}

Respond with ONLY a JSON object, no markdown:
{
  "worldFacts": ["fact 1", "fact 2"],
  "characterMemories": [
    {"characterId": "id", "category": "impression|conflict|affinity|secret|promise|event|reflection", "about": "who/what", "content": "what they remember"}
  ]
}

Rules:
- worldFacts: objective events that happened (max 3)
- characterMemories: what each character would personally remember or feel (max 2 per character)
- category guide:
  - impression: what a character thinks/feels about someone
  - conflict: tension or disagreement between characters
  - affinity: trust, friendship, or positive feeling
  - secret: hidden information a character learned
  - promise: commitment or deal made
  - event: significant occurrence a character witnessed
  - reflection: a pattern or insight a character would form — e.g. "June seems to be hiding something" or "The visitor is getting too close to the truth"
- reflection rules: ONLY add 1 reflection per character if there are enough data points (3+ previous memories suggesting a pattern). Reflections are abstracted conclusions, not raw observations.
- Only extract meaningful, non-obvious information
- If nothing significant happened, return empty arrays${langNote}`;

  const user = `Turn #${turnIndex} conversation:\n${conversation}\n\nExtract memories.`;

  return { system, user };
}

function parseExtractionResponse(text: string): ExtractedMemories {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const tryParse = (s: string): ExtractedMemories | null => {
    try {
      const parsed = JSON.parse(s);
      return {
        worldFacts: Array.isArray(parsed.worldFacts)
          ? parsed.worldFacts.map((f: string) => ({ fact: String(f), sessionId: "", turnIndex: 0 }))
          : [],
        characterMemories: Array.isArray(parsed.characterMemories)
          ? parsed.characterMemories.filter(
              (m: Record<string, string>) => m.characterId && m.category && m.content
            ).map((m: Record<string, string>) => ({
              sessionId: "",
              characterId: m.characterId,
              category: m.category as CharacterMemory["category"],
              about: m.about || "",
              content: m.content,
              turnIndex: 0,
            }))
          : [],
      };
    } catch {
      return null;
    }
  };

  const direct = tryParse(jsonStr);
  if (direct) return direct;

  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) {
    const extracted = tryParse(match[0]);
    if (extracted) return extracted;
  }

  return { worldFacts: [], characterMemories: [] };
}

export async function extractMemories(
  provider: LLMProvider,
  envFallback: LLMProvider | null,
  world: World,
  characters: Character[],
  turnMessages: Message[],
  sessionId: string,
  turnIndex: number,
  language: "zh" | "en" = "en",
  generateOptions?: LLMGenerateOptions
): Promise<ExtractedMemories> {
  const { system, user } = buildExtractionPrompt(world, characters, turnMessages, turnIndex, language);

  let response: string;
  try {
    response = await provider.generate(system, user, generateOptions);
  } catch {
    if (envFallback) {
      try {
        response = await envFallback.generate(system, user, generateOptions);
      } catch {
        return { worldFacts: [], characterMemories: [] };
      }
    } else {
      return { worldFacts: [], characterMemories: [] };
    }
  }

  const result = parseExtractionResponse(response);

  const validIds = new Set(characters.map((c) => c.id));
  result.worldFacts = result.worldFacts.map((f) => ({ ...f, sessionId, turnIndex }));
  result.characterMemories = result.characterMemories
    .filter((m) => validIds.has(m.characterId))
    .map((m) => ({ ...m, sessionId, turnIndex }));

  return result;
}
