"use client";

import { useState } from "react";
import { World, Character } from "@/lib/world/types";
import { WorldFact, CharacterMemory, WorldTime, Relationship, WorldEvent, Clue } from "@/lib/storage/store";
import { T, type Lang } from "@/lib/i18n";
import { getCharacterColors, getInitials } from "@/lib/ui/characterColors";

interface Props {
  world: World;
  isMock: boolean;
  worldFacts: WorldFact[];
  characterMemories: CharacterMemory[];
  worldTime: WorldTime;
  relationships: Relationship[];
  worldEvents: WorldEvent[];
  clues: Clue[];
  showHeader?: boolean;
  language: Lang;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RelationshipBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="w-8 shrink-0 text-[9px] uppercase text-prose-muted/62">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-edge/30">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-[9px] text-prose-muted/50">{pct}</span>
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-edge/20">
      <button
        type="button"
        onClick={onToggle}
        className="inspector-section-toggle flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="panel-label">{title}</h3>
            {typeof count === "number" && (
              <span className="inspector-count-pill rounded-full border px-1.5 py-0.5 text-[9px] text-prose-muted/62">
                {count}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-[11px] text-prose-muted/58">{subtitle}</p>}
        </div>
        <span className="shrink-0 text-prose-muted/54">
          <Chevron open={open} />
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

function CharacterCard({
  char,
  allCharacters,
  memories,
  relationships,
  language,
  isExpanded,
  onToggle,
}: {
  char: Character;
  allCharacters: Character[];
  memories: CharacterMemory[];
  relationships: Relationship[];
  language: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const relsFrom = relationships.filter((r) => r.fromId === char.id);
  const colors = getCharacterColors(char.id, char.name);
  const isZh = language === "zh";

  return (
    <div className="case-card overflow-hidden transition hover:border-amber-dim/25">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2.5 px-3 py-3 text-left">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: colors.avatar, color: "#fffaf1" }}
        >
          {getInitials(char.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-serif text-sm font-semibold" style={{ color: colors.accent }}>
              {char.name}
            </span>
            <span className="truncate text-[10px] text-prose-muted/58">{char.role}</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-prose-muted/54">{char.personality.join(" · ")}</p>
        </div>
        <div className="hidden shrink-0 gap-1 sm:flex">
          <span className="inspector-count-pill rounded-full border px-2 py-0.5 text-[9px] text-prose-muted/64">
            {relsFrom.length} {isZh ? "\u5173\u7cfb" : "links"}
          </span>
          <span className="inspector-count-pill rounded-full border px-2 py-0.5 text-[9px] text-prose-muted/64">
            {memories.length} {isZh ? "\u8bb0\u5fc6" : "memories"}
          </span>
        </div>
        <span className="shrink-0 text-prose-muted/54">
          <Chevron open={isExpanded} />
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-edge/20 px-3 pb-3 pt-2.5">
          {char.goals.length > 0 && (
            <div className="mb-2.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-prose-muted/48">
                {isZh ? "\u5f53\u524d\u76ee\u6807" : "Current goals"}
              </p>
              <div className="mt-1 space-y-1">
                {char.goals.slice(0, 2).map((goal, index) => (
                  <p key={`${char.id}-goal-${index}`} className="text-[10px] leading-relaxed text-prose-dim/86">
                    {goal}
                  </p>
                ))}
              </div>
            </div>
          )}

          {relsFrom.length > 0 && (
            <div className="space-y-2.5">
              {relsFrom.map((rel) => {
                const target = allCharacters.find((candidate) => candidate.id === rel.toId);
                const targetColors = getCharacterColors(rel.toId, target?.name);
                return (
                  <div key={rel.toId} className="inspector-subcard rounded-lg border px-2.5 py-2">
                    <span className="text-[9px]" style={{ color: targetColors.accent }}>
                      {isZh ? "\u5bf9 " : "to "}
                      {target?.name || rel.toId}
                    </span>
                    <div className="mt-1.5 space-y-1">
                      <RelationshipBar label="Trust" value={rel.trust} color="bg-blue-600/70" />
                      <RelationshipBar label="Hostile" value={rel.hostility} color="bg-crimson/70" />
                      <RelationshipBar label="Depend" value={rel.dependency} color="bg-amber-dim/70" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {relsFrom.length === 0 && (
            <div className="space-y-1">
              {allCharacters.filter((candidate) => candidate.id !== char.id && char.relationship_notes[candidate.id]).map((candidate) => (
                <p key={candidate.id} className="text-[10px] leading-relaxed text-prose-muted/58">
                  {isZh ? "\u5bf9 " : "to "}
                  {candidate.name}: {char.relationship_notes[candidate.id]}
                </p>
              ))}
            </div>
          )}

          {memories.length > 0 && (
            <div className="mt-2.5 border-t border-edge/20 pt-2.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-prose-muted/48">
                {isZh ? "\u6700\u8fd1\u8bb0\u5fc6" : "Recent memories"}
              </p>
              <div className="mt-1.5 space-y-1">
                {memories.slice(-2).map((memory) => (
                  <p key={memory.id} className="text-[10px] leading-relaxed text-prose-muted/62">
                    <span className="text-blue-400/36">[{memory.category}]</span> {memory.content}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorldSidebar({
  world,
  isMock,
  worldFacts,
  characterMemories,
  worldTime,
  relationships,
  worldEvents,
  clues,
  showHeader = true,
  language,
}: Props) {
  const L = (key: string, vars?: Record<string, string | number>) => T(key, language, vars);
  const isZh = language === "zh";
  const [openScene, setOpenScene] = useState(true);
  const [openFacts, setOpenFacts] = useState(worldFacts.length > 0);
  const [openClues, setOpenClues] = useState(clues.length > 0);
  const [openCast, setOpenCast] = useState(false);
  const [expandedCharacterId, setExpandedCharacterId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden desk-rail">
      {worldTime && showHeader && (
        <div className="border-b border-edge/20 p-4">
          <h3 className="panel-label">{L("world.time")}</h3>
          <p className="mt-1 text-sm font-serif font-semibold text-prose/80">
            {L("world.day", { d: worldTime.day })} · <span className="capitalize">{worldTime.timeOfDay}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-prose-muted/52">{L("world.turn", { n: worldTime.turnCount })}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <Section
          title={L("world.scene")}
          subtitle={isZh ? "\u4f60\u73b0\u5728\u6240\u5904\u7684\u73b0\u573a" : "Where the story is happening right now"}
          open={openScene}
          onToggle={() => setOpenScene((value) => !value)}
        >
          <p className="text-sm font-serif font-semibold text-prose/84">{world.scene.name}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-prose-muted/70">{world.scene.description}</p>
        </Section>

        {worldFacts.length > 0 && (
          <Section
            title={L("world.facts", { n: worldFacts.length })}
            subtitle={isZh ? "\u5df2\u7ecf\u53d1\u751f\u7684\u5ba2\u89c2\u4e8b\u5b9e" : "Objective facts already established"}
            count={worldFacts.length}
            open={openFacts}
            onToggle={() => setOpenFacts((value) => !value)}
          >
            <div className="space-y-2">
              {worldFacts.slice(-5).reverse().map((fact) => (
                <div key={fact.id} className="inspector-fact-card rounded-lg border px-3 py-2">
                  <p className="text-[11px] leading-relaxed text-prose-muted/72">{fact.fact}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {clues.length > 0 && (
          <Section
            title={isZh ? `\u7ebf\u7d22 (${clues.length})` : `Clues (${clues.length})`}
            subtitle={isZh ? "\u53ef\u4ee5\u7ee7\u7eed\u8ffd\u67e5\u7684\u4fe1\u606f" : "Signals you can investigate further"}
            count={clues.length}
            open={openClues}
            onToggle={() => setOpenClues((value) => !value)}
          >
            <div className="space-y-2">
              {clues.map((clue) => {
                const relatedCharacter = world.characters.find((character) => character.id === clue.relatedCharacterId);
                const colors = clue.relatedCharacterId ? getCharacterColors(clue.relatedCharacterId, relatedCharacter?.name) : null;
                return (
                  <div key={clue.id} className="inspector-clue-card rounded-lg border px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] uppercase tracking-wider text-emerald-500/34">{clue.source}</span>
                      {clue.relatedCharacterId && colors && (
                        <span className="text-[8px]" style={{ color: colors.accent }}>
                          {isZh ? "\u6765\u81ea " : "from "}
                          {relatedCharacter?.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-prose-dim/88">{clue.name}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-prose-muted/62">{clue.description}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <Section
          title={L("world.characters")}
          subtitle={isZh ? "\u9ed8\u8ba4\u6536\u8d77\uff0c\u9700\u8981\u65f6\u518d\u5c55\u5f00" : "Collapsed by default so the panel stays readable"}
          count={world.characters.length}
          open={openCast}
          onToggle={() => setOpenCast((value) => !value)}
        >
          <div className="space-y-2.5">
            {world.characters.map((char) => (
              <CharacterCard
                key={char.id}
                char={char}
                allCharacters={world.characters}
                memories={characterMemories.filter((memory) => memory.characterId === char.id)}
                relationships={relationships}
                language={language}
                isExpanded={expandedCharacterId === char.id}
                onToggle={() => setExpandedCharacterId((current) => (current === char.id ? null : char.id))}
              />
            ))}
          </div>
        </Section>
      </div>

      {isMock && (
        <div className="border-t border-edge/20 p-3">
          <div className="rounded border border-amber-dim/15 bg-amber-dim/5 px-3 py-2 text-center text-[10px] text-amber-glow/40">
            {L("world.mockMode")}
          </div>
        </div>
      )}
    </div>
  );
}
