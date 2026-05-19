import { CharacterMemory, WorldFact } from "@/lib/storage/store";

export function retrieveMemories(
  allFacts: WorldFact[],
  allMemories: CharacterMemory[],
  characterId: string,
  limit = 10
): { facts: WorldFact[]; personalMemories: CharacterMemory[] } {
  const facts = allFacts.slice(-5);

  const personal = allMemories
    .filter((m) => m.characterId === characterId);

  // Prioritize reflections (higher-level insights) then recent memories
  const reflections = personal.filter((m) => m.category === "reflection").slice(-3);
  const others = personal.filter((m) => m.category !== "reflection").slice(-(limit - reflections.length));

  return { facts, personalMemories: [...reflections, ...others] };
}

export function formatMemoriesForPrompt(
  facts: WorldFact[],
  memories: CharacterMemory[]
): string {
  const parts: string[] = [];

  if (facts.length > 0) {
    parts.push("WORLD FACTS (things that happened):");
    facts.forEach((f, i) => parts.push(`  ${i + 1}. ${truncateForPrompt(f.fact, 140)}`));
  }

  if (memories.length > 0) {
    parts.push("\nYOUR MEMORIES:");
    memories.forEach((m) => {
      const label = m.about ? `about ${m.about}` : "";
      parts.push(`  [${m.category}] ${label}: ${truncateForPrompt(m.content, 160)}`);
    });
  }

  return parts.length > 0 ? parts.join("\n") : "";
}

function truncateForPrompt(value: string, max: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}
