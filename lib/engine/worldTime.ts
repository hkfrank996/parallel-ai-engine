import { WorldTime, TimeOfDay } from "@/lib/storage/store";

const TIME_SEQUENCE: TimeOfDay[] = ["dawn", "morning", "afternoon", "night"];

const TIME_LABELS: Record<TimeOfDay, { en: string; zh: string; emoji: string }> = {
  dawn: { en: "Dawn", zh: "黎明", emoji: "🌅" },
  morning: { en: "Morning", zh: "上午", emoji: "☀️" },
  afternoon: { en: "Afternoon", zh: "下午", emoji: "🌤" },
  night: { en: "Night", zh: "夜晚", emoji: "🌙" },
};

export function advanceTime(current: WorldTime): WorldTime {
  const newTurnCount = current.turnCount + 1;
  // Advance time of day every 8 turns — a full conversation shouldn't skip through a day
  const shouldAdvance = newTurnCount % 8 === 0;
  if (!shouldAdvance) {
    return { ...current, turnCount: newTurnCount };
  }
  const idx = TIME_SEQUENCE.indexOf(current.timeOfDay);
  const nextIdx = (idx + 1) % TIME_SEQUENCE.length;
  const newDay = nextIdx === 0 ? current.day + 1 : current.day;

  return {
    ...current,
    day: newDay,
    timeOfDay: TIME_SEQUENCE[nextIdx],
    turnCount: newTurnCount,
  };
}

export function getTimeLabel(timeOfDay: TimeOfDay, language: "zh" | "en" = "en"): string {
  const label = TIME_LABELS[timeOfDay];
  return language === "zh" ? label.zh : label.en;
}

export function getTimeEmoji(timeOfDay: TimeOfDay): string {
  return TIME_LABELS[timeOfDay].emoji;
}

export function formatWorldTime(wt: WorldTime, language: "zh" | "en" = "en"): string {
  const label = getTimeLabel(wt.timeOfDay, language);
  const emoji = getTimeEmoji(wt.timeOfDay);
  if (language === "zh") {
    return `${emoji} 第${wt.day}天 · ${label}`;
  }
  return `${emoji} Day ${wt.day} · ${label}`;
}

export function timeAtmosphere(timeOfDay: TimeOfDay, language: "zh" | "en" = "en"): string {
  if (language === "zh") {
    switch (timeOfDay) {
      case "dawn": return "第一缕光穿过黑暗。世界安静得令人不安。阴影在退去，但危险仍在。";
      case "morning": return "晨雾低垂，万物苏醒。但有些眼睛正在暗处注视着一切。";
      case "afternoon": return "阳光刺眼，一切无处遁形。在光天化日之下，很难隐藏秘密。";
      case "night": return "夜色降临，霓虹在雨中闪烁。黑暗既是庇护也是陷阱，所有人都在警惕。";
    }
  }
  switch (timeOfDay) {
    case "dawn": return "The first light breaks through. The world is quiet — too quiet. Shadows retreat but danger lingers.";
    case "morning": return "Morning fog hangs low. Everything stirs to life, but unseen eyes watch from every corner.";
    case "afternoon": return "The sun is harsh, exposing everything. Hard to keep secrets in broad daylight.";
    case "night": return "Darkness falls. Flickering lights cast long shadows. Darkness is both a shield and a trap.";
  }
}
