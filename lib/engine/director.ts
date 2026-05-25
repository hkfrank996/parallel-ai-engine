import { World, Character } from "@/lib/world/types";
import { Message, Relationship, WorldTime, WorldEvent } from "@/lib/storage/store";
import { LLMProvider } from "@/lib/llm/types";
import { computeNarrativeTension } from "./emotionalState";

interface DirectorResult {
  speakerIds: string[];
  sceneUpdate?: string;
  characterStatuses?: { characterId: string; status: string }[];
  narration?: string;
}

function buildDirectorPrompt(
  world: World,
  characters: Character[],
  recentMessages: Message[],
  userInput: string,
  relationships: Relationship[],
  worldTime: WorldTime,
  worldEvents: WorldEvent[],
  language: "zh" | "en" = "en",
  playerName?: string
): { system: string; user: string } {
  const charList = characters
    .map((c) => `${c.id}: ${c.name} (${c.role}) — ${c.personality.join("、")}`)
    .join("\n");

  const conversation = recentMessages
    .slice(-8)
    .map((m) => `${m.speakerName}: ${m.content}`)
    .join("\n");

  const relSummary = relationships.length > 0
    ? relationships.slice(-8).map((r) => `${r.fromId}→${r.toId}: trust=${r.trust} hostility=${r.hostility}`).join("\n")
    : "No relationships established yet.";

  const { tension, stagnation, label: tensionLabel } = computeNarrativeTension(relationships, worldEvents, worldTime.turnCount);

  const tensionNote = stagnation > 60
    ? `⚠️ STAGNATION! No events for ${Math.round(stagnation / 8)} turns. You must create conflict or surprise — someone must do the unexpected.`
    : tension > 70
    ? `🔥 Peak tension (${tensionLabel})! This is the breaking point — let emotions erupt. Do NOT add more tension, let something happen.`
    : tension > 40
    ? `🌊 Medium tension (${tensionLabel}). Let the scene develop naturally, observe who emerges.`
    : `😴 Low tension (${tensionLabel}). Someone needs to spark conflict or intrigue to move the story forward.`;

  const langNote = language === "zh"
    ? "\nsceneUpdate, narration, and reason must be in Chinese."
    : "\nsceneUpdate, narration, and reason must be in English.";

  const narratorGuide = language === "zh"
    ? `narration 是一段第三人称旁白（2-3句话），描写当前场景的氛围、环境细节、角色的肢体语言或微表情。
规则：
- 用小说旁白的风格，不是舞台指示
- 描写感官细节：光线、声音、气味、温度、质感
- 暗示角色未说出口的情绪（握紧拳头、移开目光、嘴角微颤）
- 可以写角色"停顿"、"没有回答"、"转向别处"等反应，但不要写角色说出的具体台词
- 绝对禁止在 narration 中出现角色的完整对白，不要出现角色名+冒号+台词的格式
- 绝对禁止用引号包围的台词，即使是半句也不可以
- 绝对禁止在 narration 中写"XX说：xxx"或"XX低声道：xxx"等格式
- narration 不是角色对话，是摄像机镜头外的叙事者声音
- 简洁有力，2-3句话，不要超过60字`
    : `narration is a third-person atmospheric description (2-3 sentences) of the current moment.
Rules:
- Write like a novel's narration, not stage directions
- Describe sensory details: light, sound, smell, temperature, texture
- Hint at unspoken emotions (clenched fists, averted gaze, trembling lips)
- You MAY write that a character pauses, turns away, or doesn't answer — but NEVER write their actual spoken words
- NEVER include character dialogue in narration: no quotes, no "Character Name: speech", no "she whispered:", no complete sentences in quotation marks
- NEVER put spoken words in a character's mouth in narration — that's the character's own dialogue, handled separately
- Keep it tight: 2-3 sentences, max 60 words`;

  const rulesBlock = world.rules.length > 0
    ? `\n## World Rules\n${world.rules.map(r => `- ${r}`).join("\n")}`
    : "";

  const system = `You are the Drama Manager of this interactive story. Your job has TWO parts:

## The World
"${world.name}" — ${world.tagline}
Genre: ${world.genre}
Scene: ${world.scene.name} — ${world.scene.description}
${rulesBlock}

## Part 1: Direct the Scene
Choose who speaks and manage the narrative arc. Adapt your directing style to the genre:
- EXPOSITION → RISING ACTION → CLIMAX → RESOLUTION — always know where you are in the arc
- Every scene needs a GOAL (what should be revealed?), CONFLICT (what's at stake?), and SHIFT (what changes?)
- Pacing: alternate between tension and relief. Too much tension exhausts; too much calm bores
- Character agency: characters should pursue their OWN goals, not just react to the user
- When stagnation is high, force an event appropriate to the genre: a revelation, a confrontation, an unexpected arrival, a twist of fate, a magical phenomenon, etc.
- Respect the world's rules — if a rule says "magic has a cost", characters should act accordingly

## Characters
${charList}

## Relationships
${relSummary}

## World State
Day ${worldTime.day} · ${worldTime.timeOfDay} · Turn ${worldTime.turnCount}
${world.scene.name}: ${world.scene.description}
Narrative tension: ${Math.round(tension)}/100 (${tensionLabel}) ${tensionNote}

## Part 2: Narrate the Atmosphere
${narratorGuide}

## Investigation Actions
If the player's message starts with [Look Around], [Listen], or [Think], this is an INVESTIGATION ACTION — not dialogue.
- Do NOT have characters speak in response
- Return empty speakers array: []
- Write a rich, detailed narration (3-5 sentences) describing what the player discovers through this action
- For [Look Around]: describe the physical environment, objects, lighting, details that might be clues
- For [Listen]: describe sounds, overheard conversations, ambient noise, whispers
- For [Think]: summarize what the player might deduce from what they've seen and heard so far

## Your Instincts
- Who has the most at stake in this conversation? Who wants to stay silent?
- If someone is attacked, do they fight back or withdraw?
- What's the emotional temperature — escalating or cooling?
- Where is the biggest interpersonal tension? Let it surface in dialogue
- What sensory details would make this moment visceral?

## Character Status
If a character is incapacitated (knocked out, trapped, etc.), mark them. They cannot speak.

Return JSON (no markdown code blocks):
{
  "speakers": ["character_id"],
  "sceneUpdate": "how the scene changes, or null",
  "characterStatuses": [{"characterId": "id", "status": "active/incapacitated", "reason": "why"}],
  "narration": "2-3 sentence atmospheric description"
}

Pick 1-2 speakers, max 3. characterStatuses only when status changes. ${langNote}`;

  const user = `${conversation ? `Conversation so far:\n${conversation}\n\n` : ""}${playerName || "User"} says: "${userInput}"

Who responds? What does the moment feel like?`;

  return { system, user };
}

function parseDirectorResponse(text: string): DirectorResult {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const tryParse = (s: string): DirectorResult | null => {
    try {
      const parsed = JSON.parse(s);
      return {
        speakerIds: Array.isArray(parsed.speakers) ? parsed.speakers.map(String) : [],
        sceneUpdate: parsed.sceneUpdate || undefined,
        characterStatuses: parsed.characterStatuses || undefined,
        narration: parsed.narration || undefined,
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

  return { speakerIds: [] };
}

export async function runDirector(
  provider: LLMProvider,
  envFallback: LLMProvider | null,
  world: World,
  characters: Character[],
  recentMessages: Message[],
  userInput: string,
  relationships: Relationship[],
  worldTime: WorldTime,
  worldEvents: WorldEvent[],
  language: "zh" | "en" = "en",
  playerName?: string
): Promise<DirectorResult> {
  const { system, user } = buildDirectorPrompt(
    world, characters, recentMessages, userInput, relationships, worldTime, worldEvents, language, playerName
  );

  const tryRun = async (p: LLMProvider): Promise<DirectorResult> => {
    const response = await p.generate(system, user);
    const result = parseDirectorResponse(response);
    const activeIds = new Set(characters.map((c) => c.id));

    const incapacitated = new Set(
      (result.characterStatuses || [])
        .filter((s) => s.status === "incapacitated")
        .map((s) => s.characterId)
    );

    result.speakerIds = result.speakerIds
      .filter((id) => activeIds.has(id) && !incapacitated.has(id));

    if (result.speakerIds.length === 0 && incapacitated.size < characters.length) {
      const available = characters.filter((c) => !incapacitated.has(c.id));
      if (available.length > 0) {
        result.speakerIds = [available[0].id];
      }
    }

    return result;
  };

  try {
    return await tryRun(provider);
  } catch {}

  if (envFallback) {
    try {
      return await tryRun(envFallback);
    } catch {}
  }

  return { speakerIds: characters.slice(0, 2).map((c) => c.id) };
}
