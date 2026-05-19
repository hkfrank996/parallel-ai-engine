import type { Relationship, WorldEvent, WorldTime, Clue } from "@/lib/storage/store";
import type { World } from "@/lib/world/types";
import { T, type Lang } from "@/lib/i18n";

interface Props {
  world: World;
  worldTime: WorldTime;
  relationships: Relationship[];
  worldEvents: WorldEvent[];
  clues: Clue[];
  language: Lang;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const TIME_LABELS: Record<string, { zh: string; en: string }> = {
  dawn: { zh: "榛庢槑", en: "Dawn" },
  morning: { zh: "涓婂崍", en: "Morning" },
  afternoon: { zh: "涓嬪崍", en: "Afternoon" },
  night: { zh: "澶滄櫄", en: "Night" },
};

function calcTension(relationships: Relationship[], worldEvents: WorldEvent[], turnCount: number) {
  if (relationships.length === 0) {
    return { score: 18, label: "forming" };
  }

  const avgHostility = relationships.reduce((sum, rel) => sum + rel.hostility, 0) / relationships.length;
  const avgTrust = relationships.reduce((sum, rel) => sum + rel.trust, 0) / relationships.length;
  const maxHostility = Math.max(...relationships.map((rel) => rel.hostility));
  const latestEventTurn = worldEvents.length > 0 ? Math.max(...worldEvents.map((event) => event.turnIndex)) : 0;
  const stagnation = Math.max(0, turnCount - latestEventTurn);
  const recentEventBoost = latestEventTurn > 0 && turnCount - latestEventTurn <= 2 ? 12 : 0;
  const score = Math.min(
    100,
    Math.round(avgHostility * 0.45 + maxHostility * 0.35 + (100 - avgTrust) * 0.12 + recentEventBoost + stagnation * 2),
  );

  if (score < 25) return { score, label: "forming" };
  if (score < 50) return { score, label: "simmering" };
  if (score < 75) return { score, label: "tense" };
  return { score, label: "breaking" };
}

function labelText(label: string, language: Lang) {
  if (language !== "zh") return label;
  const zh: Record<string, string> = {
    forming: "成形中",
    simmering: "暗流",
    tense: "紧绷",
    breaking: "临界",
  };
  return zh[label] || label;
}

function MetricCard({
  title,
  hint,
  value,
  footnote,
  progress,
}: {
  title: string;
  hint: string;
  value: number;
  footnote: string;
  progress?: number;
}) {
  return (
    <div className="metric-card compact-metric rounded-md px-2.5 py-2">
      <p className="text-[9px] font-semibold text-prose/84">{title}</p>
      <p className="mt-0.5 hidden text-[9px] leading-relaxed text-prose-muted/58 xl:block">{hint}</p>
      <p className="mt-1 font-serif text-lg text-prose">{value}</p>
      {typeof progress === "number" && (
        <div className="mt-1 h-1 rounded-full bg-edge/45">
          <div className="h-full rounded-full bg-amber-glow/75" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="mt-0.5 text-[9px] text-prose-muted/62">{footnote}</p>
    </div>
  );
}

export default function WorldPulse({
  world,
  worldTime,
  relationships,
  worldEvents,
  clues,
  language,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const tension = calcTension(relationships, worldEvents, worldTime?.turnCount || 0);
  const latestEvent = worldEvents.at(-1);
  const timeLabel = TIME_LABELS[worldTime?.timeOfDay]?.[language] || worldTime?.timeOfDay;
  const activeRelations = relationships.filter((rel) => rel.hostility > 45 || rel.trust < 30).length;
  const isZh = language === "zh";
  const toggleLabel = collapsed ? (isZh ? "展开" : "Expand") : (isZh ? "收起" : "Collapse");

  return (
    <section className="world-pulse border-b border-edge/35 control-surface px-4 py-2 sm:px-5">
      <div className="mx-auto max-w-6xl">
        <div className="case-card world-pulse-card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-2 sm:px-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="panel-label">CURRENT SCENE</p>
                <span className="light-accent-surface rounded border border-amber-dim/25 bg-amber-dim/8 px-2 py-0.5 font-mono text-[10px] text-amber-glow/70">
                  T-{worldTime?.turnCount || 0}
                </span>
                <span className="pulse-meta-badge rounded border px-2 py-0.5 text-[10px] text-prose-muted/72">
                  {T("world.day", language, { d: worldTime?.day || 1 })} · {timeLabel}
                </span>
              </div>
              <h2 className="mt-1 truncate font-serif text-[24px] font-semibold text-prose">{world.scene.name}</h2>
              <p className="mt-0.5 line-clamp-1 max-w-3xl text-sm leading-relaxed text-prose-dim/80">{world.scene.description}</p>
            </div>

            <button
              type="button"
              onClick={onToggleCollapsed}
              className="chrome-button inline-flex h-8 shrink-0 items-center gap-1.5 rounded border px-2.5 text-[10px] font-medium transition"
              aria-expanded={!collapsed}
              aria-controls="world-pulse-body"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={collapsed ? "" : "rotate-180"}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              <span>{toggleLabel}</span>
            </button>
          </div>

          {!collapsed && (
            <div id="world-pulse-body" className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_250px]">
              <div className="min-w-0 p-2.5 sm:p-3">
                <div className="story-pulse-panel w-full rounded-md border p-2 sm:w-auto sm:min-w-[360px]">
                  <div className="mb-1">
                    <p className="panel-label">{isZh ? "故事脉冲" : "Story Pulse"}</p>
                    <p className="hidden text-[10px] leading-relaxed text-prose-muted/62 xl:block">
                      {isZh ? "用来快速判断局势，不是角色属性面板" : "A quick read on the world's pressure, not a character stats block."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <MetricCard
                      title={isZh ? "局势热度" : "Story Heat"}
                      hint={isZh ? "基于敌意与新事件" : "Based on conflict and events"}
                      value={tension.score}
                      progress={tension.score}
                      footnote={labelText(tension.label, language)}
                    />
                    <MetricCard
                      title={isZh ? "关系异动" : "Fault Lines"}
                      hint={isZh ? "不稳定的人际关系" : "Unstable ties"}
                      value={activeRelations}
                      footnote={isZh ? "高敌意或低信任" : "High hostility or low trust"}
                    />
                    <MetricCard
                      title={isZh ? "已知线索" : "Known Clues"}
                      hint={isZh ? "可继续追查" : "Ready to pursue"}
                      value={clues.length}
                      footnote={isZh ? "当前可行动信息" : "Actionable now"}
                    />
                  </div>
                </div>
              </div>

              <div className="detail-panel border-t border-edge/30 px-3 py-2.5 lg:border-l lg:border-t-0">
                <p className="panel-label">{isZh ? "总导演提示" : "Director Signal"}</p>
                {latestEvent ? (
                  <div className="mt-1.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-prose-muted/52">
                      {isZh ? "最新变化" : "Latest shift"}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-prose-dim/78">
                      <span className="font-serif text-prose-dim/90">{latestEvent.description}</span>
                      {latestEvent.impact && <span className="text-prose-muted/55"> · {latestEvent.impact}</span>}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-prose-muted/55">
                    {isZh ? "世界正在等待你的下一次有效介入。" : "The world is waiting for the next meaningful intervention."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
