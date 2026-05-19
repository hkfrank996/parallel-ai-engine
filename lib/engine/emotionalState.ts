import { Character } from "@/lib/world/types";
import { Relationship, CharacterMemory, TimeOfDay } from "@/lib/storage/store";

export interface EmotionalState {
  mood: string;
  arousal: number; // 0-100, how activated/intense they feel
  description: string;
}

const MOOD_MAP = {
  angry: { en: "irritated", zh: "烦躁" },
  afraid: { en: "on edge", zh: "不安" },
  warm: { en: "relaxed", zh: "温和" },
  suspicious: { en: "guarded", zh: "警惕" },
  sad: { en: "withdrawn", zh: "低落" },
  calm: { en: "neutral", zh: "平静" },
  tense: { en: "tense", zh: "紧绷" },
} as const;

type MoodKey = keyof typeof MOOD_MAP;

export function computeEmotionalState(
  character: Character,
  relationships: Relationship[],
  recentMemories: CharacterMemory[],
  timeOfDay: TimeOfDay,
  language: "zh" | "en" = "en"
): EmotionalState {
  const myRels = relationships.filter((r) => r.fromId === character.id);

  // Baseline from relationships
  const avgHostility = myRels.length > 0
    ? myRels.reduce((s, r) => s + r.hostility, 0) / myRels.length
    : 20;
  const avgTrust = myRels.length > 0
    ? myRels.reduce((s, r) => s + r.trust, 0) / myRels.length
    : 50;
  const maxHostility = myRels.length > 0
    ? Math.max(...myRels.map((r) => r.hostility))
    : 0;

  // Recent memory patterns (last 6)
  const recent = recentMemories.slice(-6);
  const conflictCount = recent.filter((m) => m.category === "conflict").length;
  const secretCount = recent.filter((m) => m.category === "secret").length;
  const affinityCount = recent.filter((m) => m.category === "affinity").length;

  // Score each mood
  const scores: Record<MoodKey, number> = {
    angry: avgHostility * 0.4 + conflictCount * 15,
    afraid: secretCount * 20 + (maxHostility > 60 ? 20 : 0),
    warm: avgTrust * 0.3 + affinityCount * 15,
    suspicious: (100 - avgTrust) * 0.3 + secretCount * 10 + (avgHostility > 30 ? 15 : 0),
    sad: (100 - avgTrust) * 0.2 + conflictCount * 10 - affinityCount * 10,
    calm: 30, // baseline
    tense: avgHostility * 0.3 + conflictCount * 12 + (maxHostility > 50 ? 15 : 0),
  };

  // Time-of-day modifier
  const timeMods: Record<TimeOfDay, Partial<Record<MoodKey, number>>> = {
    dawn: { afraid: 10, tense: 5 },
    morning: { warm: 5, calm: 5 },
    afternoon: { angry: 5, tense: 5 },
    night: { suspicious: 10, afraid: 8, tense: 8 },
  };
  const mods = timeMods[timeOfDay];
  for (const [k, v] of Object.entries(mods)) {
    scores[k as MoodKey] += v;
  }

  // Personality bias
  const traits = character.personality.join(" ");
  if (traits.includes("暴躁") || traits.includes("冲动") || traits.includes("aggressive")) {
    scores.angry += 15;
  }
  if (traits.includes("多疑") || traits.includes("paranoid") || traits.includes("警惕")) {
    scores.suspicious += 15;
  }
  if (traits.includes("温柔") || traits.includes("善良") || traits.includes("kind")) {
    scores.warm += 15;
  }
  if (traits.includes("胆小") || traits.includes("恐惧") || traits.includes("fearful")) {
    scores.afraid += 15;
  }

  // Pick dominant mood
  let dominant: MoodKey = "calm";
  let maxScore = 0;
  for (const [mood, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = mood as MoodKey;
    }
  }

  // Arousal from relationship intensity
  const arousal = Math.min(100, Math.max(10,
    avgHostility * 0.5 +
    conflictCount * 15 +
    (maxHostility > 70 ? 25 : 0) +
    (timeOfDay === "night" ? 10 : 0)
  ));

  const moodLabel = MOOD_MAP[dominant][language];

  // Build a natural description
  const descriptions: Record<MoodKey, Record<string, string>> = {
    angry: {
      zh: `你现在情绪${moodLabel}。有些人让你很不爽，你的耐心快要见底了。你说话会比平时更冲。`,
      en: `You're feeling ${moodLabel}. Someone has been getting on your nerves and your patience is wearing thin.`,
    },
    afraid: {
      zh: `你心里有些${moodLabel}。有些事情你不想被揭开，你感觉有人在逼近你的秘密。你的回应会带着防御性。`,
      en: `You're feeling ${moodLabel}. There are things you don't want exposed, and you sense someone getting close.`,
    },
    warm: {
      zh: `你现在的状态比较${moodLabel}。你愿意多聊几句，但不是什么都愿意说。`,
      en: `You're feeling ${moodLabel}. More willing to engage, but still selective about what you share.`,
    },
    suspicious: {
      zh: `你现在很${moodLabel}。你不确定谁可以信任，每句话你都会多想一层。你的回答会比较谨慎。`,
      en: `You're feeling ${moodLabel}. You're not sure who to trust and you're reading between every line.`,
    },
    sad: {
      zh: `你情绪有些${moodLabel}。你不怎么想说话，如果说话也是比较冷淡的。`,
      en: `You're feeling ${moodLabel}. Not very talkative, and your words carry a colder edge.`,
    },
    calm: {
      zh: `你现在的状态还算${moodLabel}。你在观察，在等待，没有特别的情绪波动。`,
      en: `You're feeling ${moodLabel}. Observing, waiting, no strong emotional push in any direction.`,
    },
    tense: {
      zh: `你现在整个人很${moodLabel}。空气里都是火药味，你随时准备应对突发状况。你的回应会比较短促。`,
      en: `You're feeling ${moodLabel}. The air is thick and you're ready for anything. Your responses are clipped.`,
    },
  };

  const description = descriptions[dominant][language];

  return { mood: moodLabel, arousal, description };
}

export function computeNarrativeTension(
  relationships: Relationship[],
  worldEvents: { turnIndex: number }[],
  turnCount: number
): { tension: number; stagnation: number; label: string } {
  if (relationships.length === 0) {
    return { tension: 20, stagnation: 0, label: "forming" };
  }

  const avgHostility = relationships.reduce((s, r) => s + r.hostility, 0) / relationships.length;
  const avgTrust = relationships.reduce((s, r) => s + r.trust, 0) / relationships.length;
  const maxHostility = Math.max(...relationships.map((r) => r.hostility));

  const tension = Math.min(100,
    avgHostility * 0.4 +
    (100 - avgTrust) * 0.2 +
    (maxHostility > 70 ? 20 : 0)
  );

  const lastEventTurn = worldEvents.length > 0
    ? Math.max(...worldEvents.map((e) => e.turnIndex))
    : 0;
  const turnsSinceEvent = turnCount - lastEventTurn;
  const stagnation = Math.min(100, turnsSinceEvent * 8);

  let label: string;
  if (tension < 25) label = "calm";
  else if (tension < 50) label = "simmering";
  else if (tension < 75) label = "tense";
  else label = "breaking_point";

  return { tension, stagnation, label };
}
