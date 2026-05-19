import { LLMProvider } from "./types";

const mockResponses: Record<string, string[]> = {
  mira: [
    "I don't have time for questions. If you're here about the courier, keep your voice down.",
    "People disappear in this market every week. Why do you care about this one?",
    "I've seen worse. But this... this feels different. Watch yourself.",
    "You're asking the wrong person. Try the broker — he sells secrets for breakfast.",
    "I patch people up. That's all. Whatever you think I know, you're wrong.",
  ],
  ren: [
    "Interesting question! The answer might cost you, but let's say I'm feeling generous today.",
    "Ah, the courier situation. Everyone's asking, nobody's paying. You know how this works?",
    "Look, I deal in information, not trouble. And right now, trouble is all over that courier story.",
    "My lips are sealed... unless you have something worth trading. What do you bring to the table?",
    "Between you and me? Someone's been asking dangerous questions. And now you are too.",
  ],
  june: [
    "I know what happened. Or... I think I do. Just — let me think for a second.",
    "Everyone keeps talking in circles! Just tell me — did you see the courier or not?",
    "I'm not scared. I'm not. I just... I need to find them before the wrong people do.",
    "Mira told me to stay out of it. But how can I? They were my mentor.",
    "You want the truth? Fine. But you better not be working for the corps.",
  ],
};

export class MockProvider implements LLMProvider {
  async generate(_systemPrompt: string, _userPrompt: string, characterId?: string): Promise<string> {
    const id = characterId || "mira";
    const pool = mockResponses[id] || mockResponses.mira;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
