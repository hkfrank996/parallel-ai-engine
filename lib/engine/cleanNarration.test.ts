import { describe, it, expect } from "vitest";

// Minimal implementation matching the actual function signature
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanNarrationOutput(raw: string, language: "zh" | "en"): string {
  let text = raw.trim();

  const quotesToStrip: [string, string][] = [
    ["“", "”"], ["‘", "’"], // "" ''
    ["「", "」"], ["『", "』"], // 「」『』
    ['"', '"'], ["'", "'"],
  ];
  for (const [open, close] of quotesToStrip) {
    const quoted = new RegExp(`${escapeRe(open)}([^${escapeRe(close)}]+)${escapeRe(close)}`, "g");
    text = text.replace(quoted, "");
  }

  text = text.replace(/^[^，,\n]{1,40}[:：][^\n]{2,200}$/gm, "");

  text = text.replace(/\s+[""'][A-Za-z]{3,20}\s+(said|asked|replied|whispered|muttered|exclaimed|cried|snapped|laughed|sighed)\b[^""'']*$/gim, "");

  text = text.replace(/\s+[^\n，。、！？]{1,20}[说问道答嚷叹叫吼怒骂哼赞祝祈]道?[。，]?[""']?[^\n]{0,200}$/gm, "");
  text = text.replace(/\s+[""'][^\n""'']{1,20}[说问道答嚷叹]道?[。，]?[^\n]{0,200}$/gm, "");

  const lines = text.split("\n").filter((l) => {
    const trimmed = l.trim();
    if (!trimmed) return false;
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

describe("cleanNarrationOutput", () => {
  // ── Atmospheric description must NEVER be removed ───────────────────────────

  it("preserves English atmospheric sentence", () => {
    const input = "The air is still. Silence hangs heavier than any word.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  it("preserves short atmospheric sentence", () => {
    const input = "He walked away.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  it("preserves Chinese atmospheric description", () => {
    const input = "月光从高窗倾泻而下，在大理石地板上切割出冰冷的矩形光斑。";
    expect(cleanNarrationOutput(input, "zh")).toBe(input);
  });

  it("preserves short Chinese atmospheric line", () => {
    const input = "她没有回答。";
    expect(cleanNarrationOutput(input, "zh")).toBe(input);
  });

  it("preserves multi-sentence English paragraph", () => {
    const input = "Rain battered the windows. The old house groaned in the wind. No one moved.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  it("preserves lines with ellipsis (not dialogue)", () => {
    const input = "She stared at the letter... then put it down.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  // ── Quoted dialogue must be removed ────────────────────────────────────────

  it("removes Chinese double-quoted dialogue", () => {
    const input = "她没有回答。\"我不是凶手。\"他转身离开。";
    expect(cleanNarrationOutput(input, "zh")).not.toContain("我不是凶手");
  });

  it("removes Chinese book-corner quoted dialogue", () => {
    const input = "「别跟来。」他冷冷地说。";
    const result = cleanNarrationOutput(input, "zh");
    expect(result).not.toContain("别跟来");
  });

  it("removes English double-quoted dialogue", () => {
    const input = "The door creaked. \"Leave now,\" she said, \"or you will regret it.\"";
    expect(cleanNarrationOutput(input, "en")).not.toContain("Leave now");
  });

  it("removes single-quoted English dialogue", () => {
    const input = "He smiled faintly. 'I knew you'd come.'";
    expect(cleanNarrationOutput(input, "en")).not.toContain("I knew you'd come");
  });

  // ── Character name + colon must be removed ──────────────────────────────────

  it("removes character-colon dialogue", () => {
    const input = "Zhang San: \"I didn't do it.\"";
    expect(cleanNarrationOutput(input, "zh")).not.toContain("I didn't do it");
  });

  it("removes character-colon dialogue without quotes", () => {
    const input = "Zhang San：我知道真相。";
    expect(cleanNarrationOutput(input, "zh")).not.toContain("我知道真相");
  });

  // ── Attribution patterns must be removed ───────────────────────────────────

  it("removes English said-attribution", () => {
    const input = "She turned away. \"Don't follow me,\" she said.";
    expect(cleanNarrationOutput(input, "en")).not.toContain("Don't follow me");
  });

  it("removes asked-attribution", () => {
    const input = "He paused. \"Are you sure?\" he asked.";
    expect(cleanNarrationOutput(input, "en")).not.toContain("Are you sure");
  });

  it("removes whispered-attribution", () => {
    const input = "He leaned close. \"Trust no one,\" he whispered.";
    expect(cleanNarrationOutput(input, "en")).not.toContain("Trust no one");
  });

  it("removes Chinese 说-attribution", () => {
    const input = "他沉默片刻，然后说：「我不知道。」";
    expect(cleanNarrationOutput(input, "zh")).not.toContain("我不知道");
  });

  it("removes Chinese 道-attribution", () => {
    const input = "「小心。」他低声地道。";
    expect(cleanNarrationOutput(input, "zh")).not.toContain("小心");
  });

  // ── Mixed content: dialogue removed, atmosphere preserved ──────────────────

  it("removes dialogue but preserves surrounding atmosphere (zh)", () => {
    const input = "月光从高窗倾泻而下。「我不是凶手。」空气凝滞，沉默比任何声音都更沉重。";
    const result = cleanNarrationOutput(input, "zh");
    expect(result).not.toContain("我不是凶手");
    expect(result).toContain("月光从高窗倾泻而下");
    expect(result).toContain("空气凝滞");
  });

  it("removes dialogue but preserves surrounding atmosphere (en)", () => {
    const input = "Rain battered the windows. \"I didn't do it.\" He turned away. The air was still.";
    const result = cleanNarrationOutput(input, "en");
    expect(result).not.toContain("I didn't do it");
    expect(result).toContain("Rain battered");
    expect(result).toContain("The air was still");
  });

  // ── Empty / minimal input → fallback ──────────────────────────────────────

  it("returns fallback for empty input", () => {
    const result = cleanNarrationOutput("", "zh");
    expect(result).toBe("空气凝滞，沉默比任何声音都更沉重。");
  });

  it("returns fallback for input with only removed content", () => {
    const result = cleanNarrationOutput('"I did it."', "en");
    expect(result).toBe("The air is still. Silence hangs heavier than any word.");
  });

  // ── Fallback strings themselves must not be removed ─────────────────────────

  it("fallback strings survive the cleaner intact", () => {
    const zhFallback = "空气凝滞，沉默比任何声音都更沉重。";
    const enFallback = "The air is still. Silence hangs heavier than any word.";
    expect(cleanNarrationOutput(zhFallback, "zh")).toBe(zhFallback);
    expect(cleanNarrationOutput(enFallback, "en")).toBe(enFallback);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("handles text with no Chinese punctuation at all", () => {
    const input = "A sudden knock at the door";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  it("handles text that is only a few characters", () => {
    const input = "Silence.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  it("does not remove lines that are only action (no speech)", () => {
    const input = "She put the gun down.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });

  it("does not remove em-dash-prefixed character names", () => {
    const input = "The clock struck midnight. —— Zhang Wei entered the room.";
    expect(cleanNarrationOutput(input, "zh")).toContain("Zhang Wei entered");
  });

  it("preserves dialogue that is part of an ongoing scene description (not quoted)", () => {
    // This is a narrator voice describing someone who is speaking, not actual dialogue
    const input = "She paused mid-sentence, then continued her story.";
    expect(cleanNarrationOutput(input, "en")).toBe(input);
  });
});