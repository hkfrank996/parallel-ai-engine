import { Character } from "@/lib/world/types";

export function selectSpeakers(characters: Character[]): Character[] {
  return characters.slice(0, 3);
}
