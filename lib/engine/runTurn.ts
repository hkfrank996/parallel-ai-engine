import { v4 as uuid } from "uuid";
import { World, Character } from "@/lib/world/types";
import {
  getRecentMessages, addMessage, addEvent,
  getWorldFacts, getCharacterMemories,
  addWorldFacts, addCharacterMemories,
  getWorldTime, updateWorldTime,
  getRelationships, updateRelationship,
  addWorldEvent, getWorldEvents,
  addClue, Clue,
  WorldFact, CharacterMemory, Relationship, WorldEvent, Message,
} from "@/lib/storage/store";
import { getProvider, LLMConfig } from "@/lib/llm/provider";
import { buildSystemPrompt, buildUserPrompt } from "./buildPrompt";
import { runDirector } from "./director";
import { extractMemories } from "./memoryExtractor";
import { retrieveMemories, formatMemoriesForPrompt } from "./memoryRetriever";
import { advanceTime, formatWorldTime, timeAtmosphere } from "./worldTime";
import { analyzeRelationships, initializeRelationships } from "./relationshipEngine";
import { generateWorldEvents } from "./eventEngine";
import { computeEmotionalState } from "./emotionalState";
import { extractClues } from "./clueEngine";
import { MockProvider } from "@/lib/llm/mockProvider";
import { AbortError, isAbortError, type LLMGenerateOptions } from "@/lib/llm/types";

export interface TurnResult {
  userMessage: { id: string; content: string };
  narration?: string;
  characterMessages: { speakerId: string; speakerName: string; content: string }[];
  event: { summary: string };
  sceneUpdate?: string;
  degraded?: boolean;
  memoriesExtracted?: {
    worldFacts: string[];
    characterMemories: { characterId: string; category: string; content: string }[];
  };
  worldTime?: { day: number; timeOfDay: string; label: string };
  relationshipChanges?: { fromId: string; toId: string; trust: number; hostility: number; reason: string }[];
  worldEvents?: { type: string; description: string; impact: string }[];
  clues?: { name: string; description: string; source: string; relatedCharacterId?: string }[];
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Wrap options to inject AbortSignal for the current runTurn call. */
function withSignal(opts: LLMGenerateOptions | undefined, signal?: AbortSignal): LLMGenerateOptions | undefined {
  if (!signal) return opts;
  return { ...(opts || {}), signal };
}

const GENERATION_OPTIONS = {
  director: {
    maxTokens: envInt("LLM_DIRECTOR_MAX_TOKENS", 260),
    temperature: 0.35,
    timeoutMs: envInt("LLM_DIRECTOR_TIMEOUT_MS", 18000),
  } satisfies LLMGenerateOptions,
  character: {
    maxTokens: envInt("LLM_CHARACTER_MAX_TOKENS", 220),
    temperature: 0.8,
    timeoutMs: envInt("LLM_CHARACTER_TIMEOUT_MS", 12000),
  } satisfies LLMGenerateOptions,
  characterRetry: {
    maxTokens: envInt("LLM_CHARACTER_RETRY_MAX_TOKENS", 160),
    temperature: 0.4,
    timeoutMs: envInt("LLM_CHARACTER_RETRY_TIMEOUT_MS", 8000),
  } satisfies LLMGenerateOptions,
  narration: {
    maxTokens: envInt("LLM_NARRATION_MAX_TOKENS", 260),
    temperature: 0.6,
    timeoutMs: envInt("LLM_NARRATION_TIMEOUT_MS", 12000),
  } satisfies LLMGenerateOptions,
  extraction: {
    maxTokens: envInt("LLM_EXTRACTION_MAX_TOKENS", 260),
    temperature: 0.2,
    timeoutMs: envInt("LLM_EXTRACTION_TIMEOUT_MS", 9000),
  } satisfies LLMGenerateOptions,
};

type StreamEvent = { kind: "delta"; text: string } | { kind: "reset" };

async function generateWithFallback(
  char: Character,
  sys: string,
  user: string,
  provider: ReturnType<typeof getProvider>["provider"],
  envFallback: ReturnType<typeof getProvider>["envFallback"],
  isMock: boolean,
  language: "zh" | "en",
  onStreamEvent?: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<{ content: string; degraded: boolean }> {
  let raw: string;
  let degraded = false;
  let streamed = false;

  const generateRaw = async (): Promise<string> => {
    if (isMock && provider instanceof MockProvider) {
      return provider.generate(sys, user, { characterId: char.id });
    }

    // Try token streaming if callback provided and provider supports it
    if (onStreamEvent && provider.stream) {
      try {
        let accumulated = "";
        for await (const delta of provider.stream(sys, user, {
          ...GENERATION_OPTIONS.character,
          characterId: char.id,
          signal,
        })) {
          accumulated += delta;
          onStreamEvent({ kind: "delta", text: delta });
        }
        streamed = true;
        return accumulated;
      } catch (streamError) {
        // Streaming failed after partial output — signal frontend to reset accumulated text
        if (onStreamEvent) onStreamEvent({ kind: "reset" });
        logProviderFailure("character:stream", char.id, streamError);
        if (isAbortError(streamError) || signal?.aborted) {
          throw new AbortError("aborted during character stream");
        }
      }
    }

    try {
      return await provider.generate(sys, user, {
        ...GENERATION_OPTIONS.character,
        characterId: char.id,
        signal,
      });
    } catch (error) {
      logProviderFailure("character", char.id, error);
      if (envFallback) {
        try {
          degraded = true;
          return await envFallback.generate(sys, user, {
            ...GENERATION_OPTIONS.character,
            characterId: char.id,
            signal,
          });
        } catch (fallbackError) {
          logProviderFailure("envFallback", char.id, fallbackError);
          // Use a deterministic in-language fallback below instead of leaking
          // mock dialogue into real API mode.
        }
      }

      degraded = true;
      return fallbackLineForCharacter(char.id, language);
    }
  };

  raw = await generateRaw();
  let content = cleanCharacterOutput(raw);

  // If streaming wasn't used but callback was provided, emit full content as single delta
  if (!streamed && onStreamEvent && content) {
    onStreamEvent({ kind: "delta", text: content });
  }

  if (isBadCharacterOutput(content) && !(isMock && provider instanceof MockProvider)) {
    try {
      raw = await provider.generate(
        `${sys}\n\nYour previous answer was invalid because it was empty, pure punctuation, or contained action narration. Answer again with one spoken line only.`,
        user,
        {
          ...GENERATION_OPTIONS.characterRetry,
          characterId: char.id,
        }
      );
      content = cleanCharacterOutput(raw);
    } catch (error) {
      logProviderFailure("retry", char.id, error);
      // Keep the original fallback path below.
    }
  }

  if (isBadCharacterOutput(content)) {
    content = fallbackLineForCharacter(char.id, language);
    degraded = true;
  }

  return { content, degraded };
}

async function generateInvestigationNarration(
  provider: ReturnType<typeof getProvider>["provider"],
  envFallback: ReturnType<typeof getProvider>["envFallback"],
  world: World,
  recent: Message[],
  userInput: string,
  worldTime: { day: number; timeOfDay: string; turnCount: number },
  relationships: Relationship[],
  language: "zh" | "en",
  signal?: AbortSignal
): Promise<string> {
  const actionType = /^\[Look Around\]|^\[环顾四周\]/.test(userInput) ? "look"
    : /^\[Listen\]|^\[竖耳倾听\]/.test(userInput) ? "listen"
    : "think";

  const langNote = language === "zh"
    ? "用中文写。第三人称。2-4句话。"
    : "Write in English. Third person. 2-4 sentences.";

  const actionPrompts: Record<string, string> = {
    look: language === "zh"
      ? "玩家仔细观察周围环境。描述：物理空间、光线、物体、隐藏的细节、角色不经意的动作。暗示可能的线索但不要直接揭示答案。"
      : "The player carefully observes the surroundings. Describe: the physical space, lighting, objects, hidden details, characters' unconscious gestures. Hint at possible clues without revealing answers.",
    listen: language === "zh"
      ? "玩家安静下来倾听周围的声音。描述：环境音、远处的对话片段、金属碰撞声、低语、某个角色说的话被风吹来只听到一半。"
      : "The player goes quiet and listens. Describe: ambient sounds, fragments of distant conversation, metallic clinks, whispers, a character's words carried by the wind only half-heard.",
    think: language === "zh"
      ? "玩家在心里整理目前掌握的线索。根据最近的对话和已知事实，用旁白的口吻暗示：矛盾之处、未被追问的疑点、角色之间的暗流。"
      : "The player mentally organizes everything learned so far. Using narrator voice, hint at: contradictions, unexplored suspicions, undercurrents between characters.",
  };

  const relHint = relationships.length > 0
    ? `\nRelationship tensions: ${relationships.slice(-4).map(r => `${r.fromId}→${r.toId} (trust:${r.trust}, hostility:${r.hostility})`).join("; ")}`
    : "";

  const recentContext = recent.slice(-6).map(m => `${m.speakerName}: ${m.content.slice(0, 150)}`).join("\n");

  const system = `You are the narrator of an immersive interactive story "${world.name}" (${world.genre}). ${actionPrompts[actionType]}

Scene: ${world.scene.name} — ${world.scene.description}
World: Day ${worldTime.day}, ${worldTime.timeOfDay}, Turn ${worldTime.turnCount}
Characters present: ${world.characters.map(c => `${c.name} (${c.role})`).join(", ")}
${relHint}
${langNote}

Rules:
- Write like a novel, not stage directions
- Use sensory details (sight, sound, smell, texture, temperature)
- Hint at secrets and lies without revealing them
- Make the player feel like they're discovering something
- Keep it tight: 2-4 sentences`;

  const user = `${recentContext ? `Recent conversation:\n${recentContext}\n\n` : ""}Action: ${userInput}

Describe what the player perceives.`;

  try {
    return await provider.generate(system, user, withSignal(GENERATION_OPTIONS.narration, signal));
  } catch {}

  if (envFallback) {
    try {
      return await envFallback.generate(system, user, withSignal(GENERATION_OPTIONS.narration, signal));
    } catch {}
  }

  return actionType === "look"
    ? "The scene unfolds before you, every shadow hiding a potential truth."
    : actionType === "listen"
    ? "The sounds around you form a tapestry of half-truths and hidden meanings."
    : "Pieces of the puzzle float in your mind, waiting to connect.";
}

function logProviderFailure(stage: string, characterId: string, error: unknown) {
  if (process.env.NODE_ENV === "production" && process.env.LLM_DEBUG !== "1") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[LLM:${stage}:${characterId}] ${message.slice(0, 500)}`);
}

const PERF = process.env.LLM_DEBUG === "1";
function timing(stage: string, label: string, ms: number) {
  if (PERF) console.log(`[PERF:${stage}] ${label}: ${ms}ms`);
}
async function timed<T>(stage: string, label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try { return await fn(); }
  finally { timing(stage, label, Date.now() - t0); }
}

/**
 * Scrubs narration output of character dialogue that shouldn't be there.
 * Defends against director LLM occasionally putting character speech in the narrator block.
 * Returns the cleaned text, or a fallback string if the content is unrecoverable.
 *
 * Strategy: be CONSERVATIVE — only remove patterns that are unambiguously character speech.
 * Ambient description ("The air is still.", "月光从高窗倾泻而下") must NEVER be removed.
 */
function cleanNarrationOutput(raw: string, language: "zh" | "en"): string {
  let text = raw.trim();

  // ── Stage 1: Remove quoted dialogue in all forms ──────────────────────────
  const quotesToStrip: [string, string][] = [
    ["“", "”"], ["‘", "’"], // "" ''
    ["「", "」"], ["『", "』"], // 「」『』
    ['"', '"'], ["'", "'"],
  ];
  for (const [open, close] of quotesToStrip) {
    const quoted = new RegExp(`${escapeRe(open)}([^${escapeRe(close)}]+)${escapeRe(close)}`, "g");
    text = text.replace(quoted, "");
  }

  // ── Stage 2: Remove character-colon dialogue lines ────────────────────────
  // e.g. "Zhang: "Hello""  or "Zhang said: "Hello""
  text = text.replace(/^[^，,\n]{1,40}[:：][^\n]{2,200}$/gm, "");

  // ── Stage 3: Remove English dialogue-action attribution ───────────────────
  // e.g.  "Don't worry," she said.   or  "Are you sure?" he asked.
  text = text.replace(/\s+[""'][A-Za-z]{3,20}\s+(said|asked|replied|whispered|muttered|exclaimed|cried|snapped|laughed|sighed)\b[^""'']*$/gim, "");

  // ── Stage 4: Remove Chinese dialogue attribution (说、道、问、答 etc.) ─────
  text = text.replace(/\s+[^\n，。、！？]{1,20}[说问道答嚷叹叫吼怒骂哼赞祝祈]道?[。，]?[""']?[^\n]{0,200}$/gm, "");
  text = text.replace(/\s+[""'][^\n""'']{1,20}[说问道答嚷叹]道?[。，]?[^\n]{0,200}$/gm, "");

  // ── Stage 5: Conservative line-level pass ──────────────────────────────────
  // Only drop a line if it is VERY clearly a spoken sentence — not atmospheric description.
  // Criteria: contains a speech-quote pair OR explicitly starts with a character name + attribution.
  const lines = text.split("\n").filter((l) => {
    const trimmed = l.trim();
    if (!trimmed) return false;

    // If the line itself contains an opening quote without closing (mid-quote), drop it —
    // this means the director left an unfinished quote mid-line, which is dialogue.
    if (/^[^""'']*[""'][^\n]*$/.test(trimmed) && /[,.。?？!！]$/.test(trimmed)) return false;

    return true;
  });

  text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  if (text.length < (language === "zh" ? 4 : 6)) {
    return language === "zh"
      ? "空气凝滞，沉默比任何声音都更沉重。"
      : "The air is still. Silence hangs heavier than any word.";
  }

  return text;
}

/** Escapes special regex characters in a string */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanCharacterOutput(raw: string): string {
  let content = raw.trim();
  if (content.startsWith('"') && content.endsWith('"')) {
    content = content.slice(1, -1);
  }
  if (content.startsWith("'") && content.endsWith("'")) {
    content = content.slice(1, -1);
  }
  if (content.startsWith("\u201c") && content.endsWith("\u201d")) {
    content = content.slice(1, -1);
  }

  content = content
    .replace(/[（(][^（）()]*[）)]/g, "")
    .replace(/\*[^*]{0,120}\*/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return content;
}

function isBadCharacterOutput(content: string): boolean {
  const compact = content.replace(/\s/g, "");
  if (!compact) return true;
  if (/^[.…。！？!?、，,；;：:"'“”‘’\-—_~]+$/.test(compact)) return true;
  return compact.length < 2;
}

function fallbackLineForCharacter(characterId: string, language: "zh" | "en"): string {
  if (language === "zh") {
    switch (characterId) {
      case "mira":
        return "把声音压低。这个名字现在不该被大声说出来。";
      case "ren":
        return "别逼我在这里明说。有些答案会让整条雨棚都转头看你。";
      case "june":
        return "如果你真的知道线索，就别绕了。现在每一句废话都可能害死人。";
      default:
        return "再说一遍，但这次把话说清楚。";
    }
  }

  switch (characterId) {
    case "mira":
      return "Keep your voice down. Some questions get people hurt in this market.";
    case "ren":
      return "Careful. The right answer costs more than most people can pay.";
    case "june":
      return "Stop circling it. If you know something, say it before someone else disappears.";
    default:
      return "Say that again, but choose your words carefully.";
  }
}

export async function runTurn(
  sessionId: string,
  world: World,
  userInput: string,
  llmConfig?: LLMConfig,
  language: "zh" | "en" = "en",
  playerName?: string,
  onEvent?: (event: { type: string; data: unknown }) => void,
  signal?: AbortSignal
): Promise<TurnResult> {
  const { provider, isMock, envFallback } = getProvider(llmConfig);
  const _turnStart = Date.now();
  const recent = getRecentMessages(sessionId, 30);

  const isAborted = () => signal?.aborted === true;
  if (isAborted()) {
    throw new AbortError("request aborted before runTurn started");
  }
  const isFirstTurn = recent.length === 0;

  const isInvestigationAction = /^\[Look Around\]|^\[Listen\]|^\[Think\]|^\[环顾四周\]|^\[竖耳倾听\]|^\[整理思路\]/.test(userInput);

  // --- World Time ---
  let wt = getWorldTime(sessionId);
  wt = advanceTime(wt);
  updateWorldTime(wt);

  // --- Initialize relationships if needed ---
  let relationships = getRelationships(sessionId);
  if (relationships.length === 0) {
    const initial = initializeRelationships(world, sessionId);
    for (const rel of initial) {
      updateRelationship(rel);
    }
    relationships = initial;
  }

  // Auto-insert opening narrative on first turn
  if (isFirstTurn && world.opening) {
    addMessage({
      id: uuid(),
      sessionId,
      speakerType: "narrator",
      speakerId: null,
      speakerName: language === "zh" ? "旁白" : "Narrator",
      content: world.opening,
      createdAt: new Date().toISOString(),
    });
  }

  // Save user message
  const userMsgId = uuid();
  const speakerName = playerName || "You";
  addMessage({
    id: userMsgId,
    sessionId,
    speakerType: "user",
    speakerId: null,
    speakerName,
    content: userInput,
    createdAt: new Date().toISOString(),
  });

  let degraded = false;
  let selectedCharacters: Character[];
  let sceneUpdate: string | undefined;

  // --- Director decides who speaks ---
  const existingWorldEvents = getWorldEvents(sessionId);
  let narration: string | undefined;

  if (isInvestigationAction && !isMock) {
    // Investigation actions: generate narration only, skip character dialogue
    selectedCharacters = [];
    narration = await timed("narration", "investigation", () =>
      generateInvestigationNarration(provider, envFallback, world, recent, userInput, wt, relationships, language, signal)
    );
    addMessage({
      id: uuid(),
      sessionId,
      speakerType: "narrator",
      speakerId: null,
      speakerName: language === "zh" ? "旁白" : "Narrator",
      content: narration,
      createdAt: new Date().toISOString(),
    });
  } else if (!isMock) {
    const directorResult = await timed("director", "director", () =>
      runDirector(provider, envFallback, world, world.characters, recent, userInput,
        relationships, wt, existingWorldEvents, language, playerName, withSignal(GENERATION_OPTIONS.director, signal))
    );
    selectedCharacters = world.characters.filter((c) =>
      directorResult.speakerIds.includes(c.id)
    );
    sceneUpdate = directorResult.sceneUpdate;

    if (directorResult.narration) {
      narration = cleanNarrationOutput(directorResult.narration, language);
      addMessage({
        id: uuid(),
        sessionId,
        speakerType: "narrator",
        speakerId: null,
        speakerName: language === "zh" ? "旁白" : "Narrator",
        content: narration,
        createdAt: new Date().toISOString(),
      });
      onEvent?.({ type: "content", data: { kind: "narration_done", text: narration } });
    }
  } else {
    selectedCharacters = world.characters.slice(0, 3);
  }

  // --- Load memories for prompt injection ---
  const allFacts = getWorldFacts(sessionId);
  const allMems = getCharacterMemories(sessionId);

  // --- Inject time atmosphere into character prompts ---
  const atmosphere = timeAtmosphere(wt.timeOfDay);

  // --- Early extraction: start relationship + world-event analysis NOW ---
  // These don't need current-turn character messages, so they can run in parallel
  // with the character generation loop below.
  const earlyExtractionPromise: Promise<[Relationship[], WorldEvent[]]> =
    !isMock
      ? timed("extraction", "early-rel+events", () => Promise.all([
          timed("extraction:relationship", "relationships", () =>
            analyzeRelationships(
              provider, envFallback, world, world.characters, recent, userInput,
              relationships, sessionId, wt.turnCount, language, withSignal(GENERATION_OPTIONS.extraction, signal)
            )
          ),
          timed("extraction:event", "world-events", () =>
            generateWorldEvents(
              provider, envFallback, world, world.characters, recent, userInput,
              relationships, wt, sessionId, wt.turnCount, language, withSignal(GENERATION_OPTIONS.extraction, signal)
            )
          ),
        ]))
      : Promise.resolve([[], []] as [Relationship[], WorldEvent[]]);

  // Sequential generation — each character sees what others already said this turn.
  const characterMessages: { speakerId: string; speakerName: string; content: string }[] = [];

  for (const char of selectedCharacters) {
    if (isAborted()) {
      throw new AbortError("aborted before character generation");
    }
    const { facts, personalMemories } = retrieveMemories(allFacts, allMems, char.id);
    const memoryBlock = formatMemoriesForPrompt(facts, personalMemories);
    const emotionalState = computeEmotionalState(char, relationships, personalMemories, wt.timeOfDay, language);
    const sys = buildSystemPrompt(world, char, language, memoryBlock || undefined, emotionalState, playerName)
      + `\n\nCURRENT ATMOSPHERE: ${atmosphere}`;
    const user = buildUserPrompt(recent, userInput, char.id, characterMessages, playerName);

    onEvent?.({ type: "status", data: { phase: "character_started", characterId: char.id, characterName: char.name } });

    const { content, degraded: charDegraded } = await timed("character", char.id, () =>
      generateWithFallback(char, sys, user, provider, envFallback, isMock, language,
        onEvent ? (event) => {
          if (event.kind === "reset") {
            onEvent({ type: "content", data: { kind: "character_reset", characterId: char.id } });
          } else {
            onEvent({ type: "content", data: { kind: "character_delta", characterId: char.id, characterName: char.name, text: event.text } });
          }
        } : undefined,
        signal
      )
    );
    if (isAborted()) {
      throw new AbortError("aborted during character generation");
    }
    if (charDegraded) degraded = true;

    const msgId = uuid();
    addMessage({
      id: msgId,
      sessionId,
      speakerType: "character",
      speakerId: char.id,
      speakerName: char.name,
      content,
      createdAt: new Date().toISOString(),
    });

    characterMessages.push({ speakerId: char.id, speakerName: char.name, content });
  }

  // --- Event summary ---
  const speakerNames = characterMessages.map((m) => m.speakerName).join(
    language === "zh" ? " 和 " : " and "
  );
  const eventSummary = sceneUpdate
    ? `${sceneUpdate} — ${speakerNames}${language === "zh" ? "回应了。" : " responded."}`
    : language === "zh"
    ? `在${world.scene.name}，${speakerNames}回应了用户。`
    : `In ${world.scene.name}, ${speakerNames} responded to the user.`;

  const eventId = uuid();
  addEvent({
    id: eventId,
    sessionId,
    summary: eventSummary,
    turnIndex: wt.turnCount,
    createdAt: new Date().toISOString(),
  });

  // --- Late extraction: memory + clues (needs current turn messages) ---
  let memoriesExtracted: TurnResult["memoriesExtracted"];

  if (!isMock) {
    if (isAborted()) {
      throw new AbortError("aborted before late extraction");
    }
    const turnMessages = [
      { id: "", sessionId, speakerType: "user" as const, speakerId: null, speakerName: playerName || "You", content: userInput, createdAt: "" },
      ...characterMessages.map((m) => ({
        id: "", sessionId, speakerType: "character" as const, speakerId: m.speakerId, speakerName: m.speakerName, content: m.content, createdAt: "",
      })),
    ];

    const turnIndex = allFacts.length + 1;

    // Memory + clues extraction (needs turn messages, so must run after character loop)
    onEvent?.({ type: "status", data: { phase: "extraction_started" } });
    const [lateExtracted, rawClues] = await timed("extraction", "late-mem+clues", () => Promise.all([
      timed("extraction:memory", "memories", () =>
        extractMemories(
          provider, envFallback, world, world.characters, turnMessages, sessionId, turnIndex, language, withSignal(GENERATION_OPTIONS.extraction, signal)
        )
      ),
      timed("extraction:clue", "clues", () =>
        extractClues(
          provider, envFallback, world, world.characters, turnMessages, sessionId, wt.turnCount, language, withSignal(GENERATION_OPTIONS.extraction, signal)
        )
      ),
    ]));

    // Await early extraction results (may have already finished during character loop)
    const [relChanges, worldEvts] = await earlyExtractionPromise;

    if (lateExtracted.worldFacts.length > 0 || lateExtracted.characterMemories.length > 0) {
      const now = new Date().toISOString();
      const factsToSave: WorldFact[] = lateExtracted.worldFacts.map((f) => ({
        ...f, id: uuid(), createdAt: now,
      }));
      const memsToSave: CharacterMemory[] = lateExtracted.characterMemories.map((m) => ({
        ...m, id: uuid(), createdAt: now,
      }));

      if (factsToSave.length > 0) addWorldFacts(factsToSave);
      if (memsToSave.length > 0) addCharacterMemories(memsToSave);

      memoriesExtracted = {
        worldFacts: factsToSave.map((f) => f.fact),
        characterMemories: memsToSave.map((m) => ({
          characterId: m.characterId,
          category: m.category,
          content: m.content,
        })),
      };
    }

    // --- Relationship analysis results ---
    const relationshipChanges: TurnResult["relationshipChanges"] = [];
    for (const rel of relChanges) {
      updateRelationship(rel);
      relationshipChanges.push({
        fromId: rel.fromId,
        toId: rel.toId,
        trust: rel.trust,
        hostility: rel.hostility,
        reason: rel.reason || "",
      });
    }

    // --- Dynamic event generation results ---
    const worldEventResults: TurnResult["worldEvents"] = [];
    for (const evt of worldEvts) {
      addWorldEvent(evt);
      worldEventResults.push({
        type: evt.type,
        description: evt.description,
        impact: evt.impact,
      });
    }

    // --- Clue extraction results ---
    const clueResults: TurnResult["clues"] = [];
    for (const rc of rawClues) {
      const clue: Clue = {
        id: uuid(),
        sessionId,
        name: rc.name,
        description: rc.description,
        source: rc.source,
        relatedCharacterId: rc.relatedCharacterId,
        turnIndex: wt.turnCount,
        createdAt: new Date().toISOString(),
      };
      const added = addClue(clue);
      if (added) {
        clueResults.push({
          name: clue.name,
          description: clue.description,
          source: clue.source,
          relatedCharacterId: clue.relatedCharacterId,
        });
      }
    }

    timing("turn", "total", Date.now() - _turnStart);
    return {
      userMessage: { id: userMsgId, content: userInput },
      narration,
      characterMessages,
      event: { summary: eventSummary },
      sceneUpdate,
      degraded,
      memoriesExtracted,
      worldTime: { day: wt.day, timeOfDay: wt.timeOfDay, label: formatWorldTime(wt, language) },
      relationshipChanges: relationshipChanges.length > 0 ? relationshipChanges : undefined,
      worldEvents: worldEventResults.length > 0 ? worldEventResults : undefined,
      clues: clueResults.length > 0 ? clueResults : undefined,
    };
  }

  timing("turn", "total", Date.now() - _turnStart);
  return {
    userMessage: { id: userMsgId, content: userInput },
    narration,
    characterMessages,
    event: { summary: eventSummary },
    sceneUpdate,
    degraded,
    worldTime: { day: wt.day, timeOfDay: wt.timeOfDay, label: formatWorldTime(wt, language) },
  };
}
