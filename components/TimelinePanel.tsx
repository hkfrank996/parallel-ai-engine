import { SessionEvent, WorldEvent, WorldFact, WorldTime, RelationshipHistory } from "@/lib/storage/store";
import { T, type Lang } from "@/lib/i18n";

const EVENT_TYPE_COLORS: Record<string, string> = {
  plot_twist: "text-crimson-bright",
  character_action: "text-cyan-300/80",
  environment: "text-emerald-300/75",
  revelation: "text-amber-glow",
  escalation: "text-orange-300/80",
};
const EVENT_TYPE_LABELS: Record<string, string> = {
  plot_twist: "Twist",
  character_action: "Action",
  environment: "Scene",
  revelation: "Reveal",
  escalation: "Heat",
};
const TIME_LABELS: Record<string, { zh: string; en: string }> = {
  dawn: { zh: "黎明", en: "Dawn" },
  morning: { zh: "上午", en: "Morning" },
  afternoon: { zh: "下午", en: "Afternoon" },
  night: { zh: "夜晚", en: "Night" },
};

interface TimelineEntry {
  turnIndex: number;
  timestamp: string;
  type: "turn_summary" | "world_event" | "world_fact" | "relationship_change";
  content: string;
  subtext?: string;
  label: string;
  colorClass: string;
}

function buildTimeline(events: SessionEvent[], worldEvents: WorldEvent[], worldFacts: WorldFact[], relationshipHistory: RelationshipHistory[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const evt of events) {
    entries.push({ turnIndex: evt.turnIndex || events.indexOf(evt) + 1, timestamp: evt.createdAt, type: "turn_summary", content: evt.summary, label: "Turn", colorClass: "text-prose-dim" });
  }
  for (const we of worldEvents) {
    entries.push({ turnIndex: we.turnIndex, timestamp: we.createdAt, type: "world_event", content: we.description, subtext: we.impact, label: EVENT_TYPE_LABELS[we.type] || "Event", colorClass: EVENT_TYPE_COLORS[we.type] || "text-prose-dim" });
  }
  for (const f of worldFacts) {
    entries.push({ turnIndex: f.turnIndex, timestamp: f.createdAt, type: "world_fact", content: f.fact, label: "Fact", colorClass: "text-blue-300/60" });
  }
  for (const rh of relationshipHistory) {
    const td = rh.newTrust - rh.previousTrust;
    const hd = rh.newHostility - rh.previousHostility;
    const changes: string[] = [];
    if (td !== 0) changes.push(`trust${td > 0 ? "+" : ""}${td}`);
    if (hd !== 0) changes.push(`hostility${hd > 0 ? "+" : ""}${hd}`);
    entries.push({ turnIndex: rh.turnIndex, timestamp: rh.createdAt, type: "relationship_change", content: `${rh.fromId} -> ${rh.toId}: ${changes.join(", ")}`, subtext: rh.reason || undefined, label: "Rel", colorClass: "text-amber-glow/60" });
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries;
}

interface Props {
  events: SessionEvent[];
  worldEvents: WorldEvent[];
  worldFacts: WorldFact[];
  worldTime: WorldTime;
  relationshipHistory?: RelationshipHistory[];
  language: Lang;
}

export default function TimelinePanel({ events, worldEvents, worldFacts, worldTime, relationshipHistory, language }: Props) {
  const timeline = buildTimeline(events, worldEvents, worldFacts, relationshipHistory || []);
  const timeLabel = TIME_LABELS[worldTime?.timeOfDay]?.[language] || worldTime?.timeOfDay || (language === "zh" ? "夜晚" : "Night");
  const turnCount = worldTime?.turnCount || 0;
  const turnLabel = language === "zh" ? `回合 ${turnCount}` : `Turn ${turnCount}`;

  return (
    <div className="flex h-full flex-col desk-rail">
      <div className="flex items-center justify-between border-b border-edge/30 px-4 py-3">
        <h3 className="panel-label text-amber-dim/70">{T("timeline.title", language)}</h3>
        <span className="text-[10px] text-prose-muted/72">{T("world.day", language, { d: worldTime?.day || 1 })} · {timeLabel} · {turnLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {timeline.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xs text-prose-muted/72 italic font-serif">{T("timeline.empty", language)}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-amber-dim/15 via-edge/70 to-edge/10" />
            <div className="space-y-3.5">
              {timeline.map((entry, i) => {
                const isWE = entry.type === "world_event";
                const isRel = entry.type === "relationship_change";
                return (
                  <div key={`${entry.type}-${i}`} className="relative pl-8">
                    <div
                      className={`absolute left-1 top-1.5 h-[13px] w-[13px] rounded-full border ${
                        isWE
                          ? "border-amber-glow/60 bg-amber-glow/20"
                          : entry.type === "world_fact"
                            ? "border-blue-400/40 bg-blue-500/15"
                            : isRel
                              ? "border-amber-dim/50 bg-amber-dim/15"
                              : "border-edge bg-mist/20"
                      }`}
                    />
                    <div className={`case-card-muted px-3 py-2 text-xs ${entry.colorClass}`}>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-edge/35 bg-abyss/68 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-prose-muted/62">
                          {entry.label}
                        </span>
                        <div className="min-w-0">
                          <p className="leading-relaxed">
                            {(isWE || isRel) && <span className="font-semibold uppercase text-[9px] tracking-wider mr-1">[{isWE ? "EVENT" : "REL"}]</span>}
                            {entry.content}
                          </p>
                          {entry.subtext && <p className="text-[10px] text-prose-muted/68 mt-0.5">{"-> "}{entry.subtext}</p>}
                          <span className="text-[9px] text-prose-muted/56 mt-0.5 block">Turn {entry.turnIndex} · {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
