"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import WorldSidebar from "@/components/WorldSidebar";
import MessageList from "@/components/MessageList";
import MessageComposer from "@/components/MessageComposer";
import TimelinePanel from "@/components/TimelinePanel";
import WorldPulse from "@/components/WorldPulse";
import SettingsModal, { loadSettings } from "@/components/SettingsModal";
import { T, type Lang } from "@/lib/i18n";
import { useUiTheme } from "@/lib/ui/theme";
import type { World } from "@/lib/world/types";
import type { Message, SessionEvent, WorldFact, CharacterMemory, WorldTime, Relationship, WorldEvent, RelationshipHistory, Clue } from "@/lib/storage/store";

interface WorldData {
  world: World;
  session: { id: string };
  messages: Message[];
  events: SessionEvent[];
  worldFacts: WorldFact[];
  characterMemories: CharacterMemory[];
  worldTime: WorldTime;
  relationships: Relationship[];
  worldEvents: WorldEvent[];
  relationshipHistory: RelationshipHistory[];
  clues: Clue[];
  isMock?: boolean;
  providerType?: string;
}

interface MemoryNotice {
  worldFacts: string[];
  characterMemories: { characterId: string; category: string; content: string }[];
}

const LANG_KEY = "parallel-language";
const PLAYER_NAME_KEY = "parallel-player-name";
const ACTIVE_WORLD_KEY = "parallel-active-world-id";
const WORLD_PULSE_COLLAPSED_KEY = "parallel-world-pulse-collapsed";

const TIME_OF_DAY_LABELS: Record<string, { zh: string; en: string }> = {
  dawn: { zh: "黎明", en: "Dawn" },
  morning: { zh: "清晨", en: "Morning" },
  afternoon: { zh: "下午", en: "Afternoon" },
  night: { zh: "夜晚", en: "Night" },
};

function getGenreClass(genre?: string): string {
  const g = genre?.toLowerCase() || "";
  if (g.includes("cyberpunk") || g.includes("neon")) return "genre-cyberpunk";
  if (g.includes("fantasy") || g.includes("dark")) return "genre-dark-fantasy";
  if (g.includes("sci") || g.includes("science") || g.includes("space")) return "genre-sci-fi";
  if (g.includes("modern") || g.includes("mystery")) return "genre-modern-mystery";
  return "";
}

function loadLanguage(): Lang {
  if (typeof window === "undefined") return "zh";
  return (localStorage.getItem(LANG_KEY) as Lang) || "zh";
}

function formatTimeOfDay(timeOfDay: string | undefined, lang: Lang): string {
  if (!timeOfDay) return "";
  return TIME_OF_DAY_LABELS[timeOfDay]?.[lang] || timeOfDay;
}

export default function Home() {
  const [data, setData] = useState<WorldData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [worldFacts, setWorldFacts] = useState<WorldFact[]>([]);
  const [characterMemories, setCharacterMemories] = useState<CharacterMemory[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [memoryNotice, setMemoryNotice] = useState<MemoryNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{ isMock: boolean; providerType: string }>({ isMock: false, providerType: "unknown" });
  const [language, setLanguage] = useState<Lang>("zh");
  const [turnNotice, setTurnNotice] = useState<{
    worldTime?: { day: number; timeOfDay: string; label: string };
    relationshipChanges?: { fromId: string; toId: string; trust: number; hostility: number; reason: string }[];
    worldEvents?: { type: string; description: string; impact: string }[];
    clues?: { name: string; description: string; source: string }[];
    degraded?: boolean;
  } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"world" | "timeline">("world");
  const [worldList, setWorldList] = useState<{ id: string; name: string; genre: string }[]>([]);
  const [showWorldPicker, setShowWorldPicker] = useState(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [tempName, setTempName] = useState("");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [desktopInspectorOpen, setDesktopInspectorOpen] = useState(true);
  const [worldPulseCollapsed, setWorldPulseCollapsed] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const { uiTheme, setUiTheme, themeReady } = useUiTheme();

  const loadWorld = useCallback(async (worldId?: string) => {
    try {
      setError(null);
      const url = worldId ? `/api/world?worldId=${worldId}` : "/api/world";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load world");
      const json = await res.json();
      setData(json);
      setMessages(json.messages || []);
      setEvents(json.events || []);
      setWorldFacts(json.worldFacts || []);
      setCharacterMemories(json.characterMemories || []);
      setClues(json.clues || []);
      setTurnNotice(null);
      setMemoryNotice(null);
      if (json.isMock !== undefined) {
        setProviderInfo({ isMock: json.isMock, providerType: json.providerType || "unknown" });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLanguage(loadLanguage());
    const savedName = localStorage.getItem(PLAYER_NAME_KEY) || "";
    setPlayerName(savedName);
    setWorldPulseCollapsed(localStorage.getItem(WORLD_PULSE_COLLAPSED_KEY) === "1");
    loadWorld(localStorage.getItem(ACTIVE_WORLD_KEY) || undefined);
    fetch("/api/world?action=list").then(r => r.json()).then(d => setWorldList(d.worlds || [])).catch(() => {});
  }, [loadWorld]);

  useEffect(() => {
    localStorage.setItem(WORLD_PULSE_COLLAPSED_KEY, worldPulseCollapsed ? "1" : "0");
  }, [worldPulseCollapsed]);

  const handleSend = async (message: string, _action?: string) => {
    if (!data) return;
    setSending(true);
    setError(null);
    setMemoryNotice(null);
    setTurnNotice(null);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sessionId: data.session.id,
      speakerType: "user",
      speakerId: null,
      speakerName: playerName || "You",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const settings = loadSettings();
      const body: Record<string, unknown> = {
        sessionId: data.session.id,
        message,
        language,
        worldId: data.world.id,
        playerName: playerName || undefined,
      };
      // Send llmConfig whenever the user has explicitly configured a provider,
      // even if apiKey is empty (e.g. Ollama, local OpenAI-compatible servers).
      // Only skip when settings are completely absent (use server defaults / Mock).
      if (settings?.providerType) {
        body.llmConfig = {
          providerType: settings.providerType || "openai",
          apiUrl: settings.apiUrl,
          apiKey: settings.apiKey || "",
          model: settings.model,
        };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat request failed");
      }

      const result = await res.json();

      if (result.memoriesExtracted && (
        result.memoriesExtracted.worldFacts?.length > 0 ||
        result.memoriesExtracted.characterMemories?.length > 0
      )) {
        setMemoryNotice(result.memoriesExtracted);
      }

      if (result.worldTime || result.relationshipChanges?.length > 0 || result.worldEvents?.length > 0 || result.clues?.length > 0 || result.degraded) {
        setTurnNotice({
          worldTime: result.worldTime,
          relationshipChanges: result.relationshipChanges,
          worldEvents: result.worldEvents,
          clues: result.clues,
          degraded: result.degraded,
        });
      }

      await loadWorld(data.world.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const toggleLanguage = () => {
    const next: Lang = language === "zh" ? "en" : "zh";
    setLanguage(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const toggleTheme = () => {
    setUiTheme(uiTheme === "night" ? "day" : "night");
  };

  const confirmPlayerName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayerName(trimmed);
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
  };

  const switchWorld = (worldId: string) => {
    localStorage.setItem(ACTIVE_WORLD_KEY, worldId);
    setLoading(true);
    loadWorld(worldId);
    setShowWorldPicker(false);
  };

  const handleReset = async () => {
    if (!data) return;
    if (!resetPending) {
      setResetPending(true);
      setTimeout(() => setResetPending(false), 3000);
      return;
    }
    setResetPending(false);
    try {
      const res = await fetch("/api/world/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId: data.world.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Reset failed");
      }
      await loadWorld(data.world.id);
    } catch (e) {
      setError(String(e));
    }
  };

  const L = (key: string, vars?: Record<string, string | number>) => T(key, language, vars);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center scene-gradient">
        <div className="text-center animate-fade-in-only">
          <div className="text-amber-accent text-3xl font-serif font-bold tracking-wide animate-breathe">
            Parallel
          </div>
          <div className="mt-4 w-16 h-px bg-gradient-to-r from-transparent via-amber-dim/40 to-transparent mx-auto" />
          <p className="text-prose-muted/50 text-[10px] mt-3 tracking-[0.3em] uppercase">{L("loading.subtitle")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center scene-gradient">
        <div className="text-center">
          <p className="text-crimson-bright font-serif text-lg">{L("loadError.title")}</p>
          <p className="text-prose-muted text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const isMock = !loadSettings()?.providerType && providerInfo.isMock;
  const needsName = !playerName;
  const genreClass = getGenreClass(data.world.genre);
  const desktopGridClass = desktopInspectorOpen
    ? "lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]"
    : "lg:grid-cols-[minmax(0,1fr)_64px]";

  return (
    <div className={`flex h-screen w-screen max-w-full flex-col overflow-hidden ${genreClass}`}>
      {/* ── Header: story-first, minimal tech noise ── */}
      <header className="app-header relative z-20 flex min-w-0 items-center justify-between gap-2 overflow-visible border-b border-edge/40 bg-abyss/60 px-3 py-2 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-amber-glow/90 font-serif text-base font-bold tracking-wide">Parallel</span>
            <div className="hidden h-3.5 w-px bg-edge/60 sm:block" />
          </div>

          {/* World picker */}
          <div className="relative min-w-0 flex-1">
            <button
              onClick={() => setShowWorldPicker(!showWorldPicker)}
              className="group -ml-1 flex min-w-0 items-center gap-1.5 rounded px-2 py-1 transition hover:bg-surface/40"
            >
              <span className="truncate font-serif text-sm font-semibold text-prose transition group-hover:text-amber-glow">{data.world.name}</span>
              <span className="world-tag hidden rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider sm:inline">{data.world.genre}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-prose-muted/40 group-hover:text-amber-dim transition"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showWorldPicker && (
              <div className="world-picker-menu absolute left-0 top-full z-50 mt-1.5 w-[calc(100vw-1.5rem)] max-w-72 overflow-hidden rounded-lg border border-edge/50 bg-deep/95 shadow-2xl shadow-black/60 backdrop-blur-md">
                <div className="px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-prose-muted/40 border-b border-edge/30">
                  {L("header.switchWorld")}
                </div>
                {worldList.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => switchWorld(w.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-surface/40 ${
                      w.id === data.world.id ? "text-amber-glow bg-surface/20" : "text-prose-dim"
                    }`}
                  >
                    <span className="font-serif font-semibold">{w.name}</span>
                    <span className="text-prose-muted/40 ml-2 text-[10px]">{w.genre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Player + Time */}
          <div className="hidden items-center gap-2 text-[11px] text-prose-muted/50 lg:flex">
            {playerName && (
              <>
                <span className="text-prose-muted/78">{playerName}</span>
                <span className="text-edge/40">·</span>
              </>
            )}
            {data.worldTime && (
              <span className="font-serif">
                {L("world.day", { d: data.worldTime.day })} · <span className="capitalize">{formatTimeOfDay(data.worldTime.timeOfDay, language)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: minimal controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            suppressHydrationWarning
            className="chrome-button inline-flex h-7 min-w-7 items-center justify-center rounded border px-1.5 text-[10px] font-medium transition sm:min-w-14 sm:px-2"
            title={themeReady ? (uiTheme === "night" ? "Switch to day mode" : "Switch to night mode") : "Toggle theme"}
            aria-label={themeReady ? (uiTheme === "night" ? "Switch to day mode" : "Switch to night mode") : "Toggle theme"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sm:hidden"
            >
              {themeReady && uiTheme === "night" ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </>
              ) : (
                <path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z" />
              )}
            </svg>
            <span className="hidden sm:inline">{uiTheme === "night" ? (language === "zh" ? "白天" : "Day") : (language === "zh" ? "夜间" : "Night")}</span>
          </button>
          <button
            onClick={() => setMobilePanelOpen(true)}
            className="chrome-button rounded border px-1.5 py-1 text-[10px] font-medium transition sm:px-2 lg:hidden"
          >
            {language === "zh" ? "情报" : "Intel"}
          </button>
          <button
            onClick={toggleLanguage}
            className="chrome-button hidden rounded border px-1.5 py-1 text-[10px] font-medium transition min-[430px]:inline-flex sm:px-2"
          >
            {language === "zh" ? "中文" : "EN"}
          </button>
          <button
            onClick={handleReset}
            className={`chrome-button inline-flex h-7 min-w-7 items-center justify-center rounded border px-1.5 text-[10px] font-medium transition sm:min-w-14 sm:px-2 ${
              resetPending ? "border-crimson/50 text-crimson-bright/80" : ""
            }`}
            title={resetPending ? L("header.resetConfirm") : L("header.reset")}
            aria-label={resetPending ? L("header.resetConfirm") : L("header.reset")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <span className="hidden sm:inline">{resetPending ? L("header.resetConfirmShort") : L("header.reset")}</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="chrome-button chrome-icon-button inline-flex h-7 w-7 items-center justify-center rounded border p-1.5 transition"
            title="API Settings"
            aria-label="API Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <Link
            href="/create"
            className="light-accent-surface inline-flex h-7 min-w-7 items-center justify-center rounded border border-amber-dim/30 bg-amber-dim/8 px-2 py-1 text-[11px] font-medium text-amber-glow/78 transition hover:bg-amber-dim/15 hover:text-amber-glow sm:px-3"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">{L("header.newWorld")}</span>
          </Link>
        </div>
      </header>

      <div className={`grid flex-1 overflow-hidden bg-void ${desktopGridClass}`}>
        <div className="script-stage relative flex min-w-0 flex-col overflow-hidden">
          {error && (
            <div className="border-b border-crimson/20 bg-crimson/5 px-6 py-2">
              <p className="text-sm text-crimson-bright/80">{error}</p>
            </div>
          )}

          <WorldPulse
            world={data.world}
            worldTime={data.worldTime}
            relationships={data.relationships}
            worldEvents={data.worldEvents}
            clues={clues}
            language={language}
            collapsed={worldPulseCollapsed}
            onToggleCollapsed={() => setWorldPulseCollapsed((current) => !current)}
          />

          {turnNotice && (
            <div className="border-b border-amber-dim/10 bg-amber-dim/5 px-4 py-2.5 animate-fade-in sm:px-6">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-1.5 text-xs">
                {turnNotice.worldTime && (
                  <span className="text-amber-glow/80 font-serif font-semibold">{turnNotice.worldTime.label}</span>
                )}
                {turnNotice.degraded && (
                  <span className="text-crimson-bright/70 font-medium">{L("notice.fallback")}</span>
                )}
                {turnNotice.relationshipChanges?.map((rc, i) => (
                  <span key={`r${i}`} className="text-prose-dim">
                    <span className="text-amber-glow/50">{rc.fromId} to {rc.toId}</span>
                    <span className="text-prose-muted/60 ml-1">trust {rc.trust} hostility {rc.hostility}</span>
                    {rc.reason && <span className="text-prose-muted/40 ml-1">({rc.reason})</span>}
                  </span>
                ))}
                {turnNotice.worldEvents?.map((we, i) => (
                  <span key={`e${i}`} className="text-crimson-bright/60 font-serif italic">[{we.type}] {we.description}</span>
                ))}
                {turnNotice.clues?.map((cl, i) => (
                  <span key={`cl${i}`} className="text-emerald-400/60 font-serif">
                    <span className="text-emerald-300/40 text-[10px] uppercase tracking-wider">clue</span>{" "}
                    {cl.name} - {cl.description}
                  </span>
                ))}
              </div>
            </div>
          )}

          {memoryNotice && (
            <div className="border-b border-blue-800/20 bg-blue-950/10 px-4 py-2 sm:px-6">
              <div className="flex items-start gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-blue-400/30 shrink-0">{L("notice.memories")}:</span>
                <div className="text-[11px] text-blue-300/30 space-y-0.5">
                  {memoryNotice.worldFacts.map((f, i) => <p key={`f${i}`}>{f}</p>)}
                  {memoryNotice.characterMemories.map((m, i) => <p key={`m${i}`}>[{m.characterId}] ({m.category}) {m.content}</p>)}
                </div>
              </div>
            </div>
          )}

          <MessageList
            messages={messages}
            characters={data.world.characters}
            language={language}
            playerName={playerName}
            sending={sending}
          />
          <MessageComposer
            onSend={handleSend}
            onWait={() => handleSend("……")}
            disabled={sending || needsName}
            sending={sending}
            language={language}
          />

          {/* ── Player name entry overlay ── */}
          {needsName && (
            <div className="fixed inset-0 z-30 grid place-items-center overflow-hidden bg-void/95 px-3 backdrop-blur-sm scene-gradient">
              <div className="case-card w-full max-w-[340px] px-5 py-8 text-center animate-fade-in sm:max-w-sm sm:px-7">
                <p className="text-amber-glow/40 text-[10px] uppercase tracking-[0.4em] mb-2">{L("player.greeting")}</p>
                <h2 className="text-2xl font-serif font-bold text-amber-glow/90 mb-1">{data.world.name}</h2>
                <p className="text-prose-muted/45 text-xs italic font-serif mb-8 leading-relaxed">{data.world.tagline}</p>
                <h3 className="text-base font-serif text-prose/80 mb-4">{L("player.title")}</h3>
                <input
                  type="text"
                  autoFocus
                  maxLength={20}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder={L("player.placeholder")}
                  className="w-full rounded-lg border border-edge/40 bg-deep/60 px-4 py-3 text-center text-prose text-lg font-serif placeholder-prose-muted/25 outline-none focus:border-amber-dim/40 transition mb-3"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPlayerName(tempName);
                  }}
                />
                <p className="text-[10px] text-prose-muted/40 mb-5">{L("player.hint")}</p>
                <button
                  onClick={() => confirmPlayerName(tempName)}
                  disabled={!tempName.trim()}
                  className="rounded-lg bg-amber-dim/70 px-8 py-2.5 text-sm font-medium text-void/90 transition hover:bg-amber-glow/85 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  {L("player.enter")}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 border-l border-edge/35 lg:block">
          {desktopInspectorOpen ? (
            <>
              <div className="inspector-chrome border-b border-edge/30 bg-abyss/95 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="panel-label">{language === "zh" ? "WORLD INSPECTOR" : "WORLD INSPECTOR"}</p>
                    <p className="mt-1 text-[11px] text-prose-muted/64">
                      {language === "zh"
                        ? "只在需要时查看情报，不打断主线对话"
                        : "Check intel only when you need it, not all the time."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDesktopInspectorOpen(false)}
                    className="rounded border border-edge/35 bg-deep/40 px-2 py-1 text-[10px] text-prose-muted/72 transition hover:border-amber-dim/40 hover:text-prose"
                    title={language === "zh" ? "收起情报栏" : "Collapse inspector"}
                  >
                    {language === "zh" ? "收起" : "Hide"}
                  </button>
                </div>
              </div>
              <div className="inspector-chrome flex border-b border-edge/30 bg-abyss/80">
                <button
                  onClick={() => setSidebarTab("world")}
                  className={`flex-1 px-4 py-2.5 text-[10px] font-semibold transition ${
                    sidebarTab === "world"
                      ? "border-b border-amber-dim/45 text-amber-glow/85"
                      : "text-prose-muted/42 hover:text-prose-muted/70"
                  }`}
                >
                  {language === "zh" ? "案情档案" : "Dossier"}
                </button>
                <button
                  onClick={() => setSidebarTab("timeline")}
                  className={`flex-1 px-4 py-2.5 text-[10px] font-semibold transition ${
                    sidebarTab === "timeline"
                      ? "border-b border-amber-dim/45 text-amber-glow/85"
                      : "text-prose-muted/42 hover:text-prose-muted/70"
                  }`}
                >
                  {language === "zh" ? "时间线" : "Timeline"}
                </button>
              </div>
              <div className="h-[calc(100vh-148px)] overflow-hidden">
                {sidebarTab === "world" ? (
                  <WorldSidebar
                    world={data.world}
                    isMock={isMock}
                    worldFacts={worldFacts}
                    characterMemories={characterMemories}
                    worldTime={data.worldTime}
                    relationships={data.relationships}
                    worldEvents={data.worldEvents}
                    clues={clues}
                    showHeader={false}
                    language={language}
                  />
                ) : (
                  <TimelinePanel
                    events={events}
                    worldEvents={data.worldEvents}
                    worldFacts={worldFacts}
                    worldTime={data.worldTime}
                    relationshipHistory={data.relationshipHistory}
                    language={language}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="inspector-chrome flex h-full flex-col items-center gap-3 px-2 py-3">
              <button
                type="button"
                onClick={() => setDesktopInspectorOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded border border-edge/35 bg-deep/45 text-prose-muted/78 transition hover:border-amber-dim/40 hover:text-prose"
                title={language === "zh" ? "打开情报栏" : "Open inspector"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <div className="h-px w-full bg-edge/25" />
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("world");
                  setDesktopInspectorOpen(true);
                }}
                className="w-full rounded border border-edge/30 px-2 py-2 text-[10px] text-prose-muted/72 transition hover:border-amber-dim/40 hover:text-prose"
                title={language === "zh" ? "打开案情档案" : "Open dossier"}
              >
                {language === "zh" ? "档" : "D"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("timeline");
                  setDesktopInspectorOpen(true);
                }}
                className="w-full rounded border border-edge/30 px-2 py-2 text-[10px] text-prose-muted/72 transition hover:border-amber-dim/40 hover:text-prose"
                title={language === "zh" ? "打开时间线" : "Open timeline"}
              >
                {language === "zh" ? "线" : "T"}
              </button>
            </div>
          )}
        </aside>
      </div>

      {mobilePanelOpen && (
        <div className="fixed inset-0 z-40 bg-void/75 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            aria-label="Close world panel"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setMobilePanelOpen(false)}
          />
          <div className="inspector-chrome absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-lg border border-edge/50 bg-abyss/95 shadow-2xl shadow-black/70">
            <div className="flex items-center justify-between border-b border-edge/30 px-4 py-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-dim/60">{data.world.name}</p>
                <p className="mt-0.5 text-[11px] text-prose-muted/45">{data.world.genre}</p>
              </div>
              <button
                onClick={() => setMobilePanelOpen(false)}
                className="rounded border border-edge/30 px-2 py-1 text-sm leading-none text-prose-muted/60"
              >
                x
              </button>
            </div>

            <div className="flex border-b border-edge/30">
              <button
                onClick={() => setSidebarTab("world")}
                className={`flex-1 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition ${
                  sidebarTab === "world"
                    ? "border-b border-amber-dim/40 text-amber-glow/80"
                    : "text-prose-muted/40"
                }`}
              >
                {L("tab.world")}
              </button>
              <button
                onClick={() => setSidebarTab("timeline")}
                className={`flex-1 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] transition ${
                  sidebarTab === "timeline"
                    ? "border-b border-amber-dim/40 text-amber-glow/80"
                    : "text-prose-muted/40"
                }`}
              >
                {L("tab.timeline")}
              </button>
            </div>

            <div className="h-[68vh] overflow-hidden">
              {sidebarTab === "world" ? (
                <WorldSidebar
                  world={data.world}
                  isMock={isMock}
                  worldFacts={worldFacts}
                  characterMemories={characterMemories}
                  worldTime={data.worldTime}
                  relationships={data.relationships}
                  worldEvents={data.worldEvents}
                  clues={clues}
                  showHeader={false}
                  language={language}
                />
              ) : (
                <TimelinePanel
                  events={events}
                  worldEvents={data.worldEvents}
                  worldFacts={worldFacts}
                  worldTime={data.worldTime}
                  relationshipHistory={data.relationshipHistory}
                  language={language}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={handleSettingsClose} />
    </div>
  );
}
