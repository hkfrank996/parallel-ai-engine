"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/storage/store";
import { Character } from "@/lib/world/types";
import { T, type Lang } from "@/lib/i18n";
import { getCharacterColors, getInitials } from "@/lib/ui/characterColors";

interface StreamingMessage {
  speakerId: string;
  speakerName: string;
  content: string;
  isNarrator?: boolean;
}

interface Props {
  messages: Message[];
  characters: Character[];
  language: Lang;
  playerName?: string;
  sending: boolean;
  streamingMessages?: StreamingMessage[];
}

function LoadingBubble({ language }: { language: Lang }) {
  return (
    <div className="flex items-end gap-3 animate-fade-in" aria-live="polite">
      <div className="chat-loading-avatar mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-amber-glow/85">
        AI
      </div>
      <div className="max-w-[84%] sm:max-w-[72%]">
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-prose-muted/46">
          {language === "zh" ? "\u4e16\u754c\u6b63\u5728\u54cd\u5e94" : "World responding"}
        </div>
        <div className="chat-bubble chat-bubble-loading rounded-[1.3rem] border px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-prose">
                {language === "zh" ? "\u89d2\u8272\u6b63\u5728\u6574\u7406\u53cd\u5e94..." : "Characters are gathering their response..."}
              </p>
              <div className="chat-loading-bar">
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessageList({ messages, characters, language, playerName, sending, streamingMessages }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, streamingMessages]);

  if (messages.length === 0) {
    return (
      <div className="script-ledger flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl animate-fade-in-only">
          <div className="border-b border-edge/40 pb-4">
            <p className="panel-label">LIVE SCRIPT</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-prose sm:text-4xl">
              {language === "zh" ? "\u7b2c\u4e00\u5e55\u5c1a\u672a\u843d\u7b14" : "Act I is unwritten"}
            </h2>
          </div>
          <div className="max-w-2xl pt-5">
            <p className="empty-script-copy text-base font-serif italic leading-loose text-prose-dim/86">
              {playerName ? T("msg.empty", language) : ""}
            </p>
            {playerName && (
              <p className="empty-script-subcopy mt-3 text-sm text-prose-muted/68">{T("msg.emptySub", language)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="script-ledger flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between border-b border-edge/40 pb-3">
          <div>
            <p className="panel-label">LIVE SCRIPT</p>
            <p className="mt-1 text-xs text-prose-muted/62">
              {language === "zh"
                ? "\u603b\u5bfc\u6f14\u8bb0\u4e0b\u6bcf\u4e00\u6b21\u4ecb\u5165\u540e\u7684\u4e16\u754c\u53cd\u5e94"
                : "The showrunner records how the world reacts to each intervention"}
            </p>
          </div>
          <span className="rounded border border-edge/45 bg-abyss/55 px-2 py-1 text-[10px] text-prose-muted/68">
            {messages.length} {language === "zh" ? "\u6761\u5bf9\u8bdd" : "lines"}
          </span>
        </div>

        <div className="space-y-4 pb-2">
          {messages.map((msg, idx) => {
            const turnNo = String(idx + 1).padStart(2, "0");

            if (msg.speakerType === "narrator") {
              return (
                <div key={msg.id} className="animate-fade-in">
                  <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-2 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.28em] text-prose-muted/48">
                      <span className="h-px w-7 bg-edge/35" />
                      <span>{T("msg.narrator", language)}</span>
                      <span className="font-mono text-[9px] text-prose-muted/34">{turnNo}</span>
                      <span className="h-px w-7 bg-edge/35" />
                    </div>
                    <div className="chat-bubble chat-bubble-narrator rounded-[1.4rem] px-5 py-4 sm:px-6">
                      <p className="whitespace-pre-line font-serif text-sm italic leading-loose text-prose-dim/90 sm:text-[15px]">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (msg.speakerType === "user") {
              return (
                <div key={msg.id} className="flex justify-end animate-fade-in">
                  <div className="max-w-[88%] sm:max-w-[76%]">
                    <div className="mb-1.5 flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.18em] text-prose-muted/50">
                      <span>{playerName || "You"}</span>
                      <span className="font-mono text-[9px] text-prose-muted/34">{turnNo}</span>
                    </div>
                    <div className="chat-bubble chat-bubble-user rounded-[1.3rem] px-4 py-3.5 sm:px-5">
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-prose">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            const sid = msg.speakerId || "";
            const char = characters.find((character) => character.id === sid);
            const colors = getCharacterColors(sid, char?.name || msg.speakerName);

            return (
              <div key={msg.id} className="flex items-end gap-3 animate-fade-in">
                <div
                  className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: colors.avatar,
                    color: "#fffaf1",
                    boxShadow: `0 0 18px -5px ${colors.glow}`,
                  }}
                >
                  {getInitials(msg.speakerName)}
                </div>
                <div className="min-w-0 max-w-[90%] sm:max-w-[78%]">
                  <div className="mb-1.5 flex items-end gap-2">
                    <p className="min-w-0 truncate font-serif text-sm font-semibold" style={{ color: colors.accent }}>
                      {msg.speakerName}
                    </p>
                    {char && <p className="truncate text-[10px] text-prose-muted/56">{char.role}</p>}
                    <span className="font-mono text-[9px] text-prose-muted/32">{turnNo}</span>
                  </div>
                  <div
                    className="chat-bubble chat-bubble-character rounded-[1.3rem] border px-4 py-3.5 sm:px-5"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      boxShadow: `0 18px 38px -34px ${colors.glow}`,
                    }}
                  >
                    <p className="whitespace-pre-line break-words font-serif text-[15px] leading-relaxed text-prose-dim">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Streaming messages — real-time content from token/phase streaming */}
          {streamingMessages?.map((msg, idx) => {
            if (msg.isNarrator) {
              return (
                <div key="stream-narrator" className="flex justify-center animate-fade-in">
                  <div className="max-w-[80%] rounded-[1rem] border border-edge/30 bg-abyss/40 px-5 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-prose-muted/46 mb-1.5">
                      {language === "zh" ? "旁白" : "Narrator"}
                    </p>
                    <p className="font-serif text-sm italic leading-relaxed text-prose-dim/80 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            }
            const char = characters.find((c) => c.id === msg.speakerId);
            const colors = getCharacterColors(msg.speakerId, char?.name || msg.speakerName);
            return (
              <div key={`stream-char-${msg.speakerId}`} className="flex items-end gap-3 animate-fade-in">
                <div
                  className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: colors.avatar,
                    color: "#fffaf1",
                    boxShadow: `0 0 18px -5px ${colors.glow}`,
                  }}
                >
                  {getInitials(msg.speakerName)}
                </div>
                <div className="min-w-0 max-w-[90%] sm:max-w-[78%]">
                  <div className="mb-1.5 flex items-end gap-2">
                    <p className="min-w-0 truncate font-serif text-sm font-semibold" style={{ color: colors.accent }}>
                      {msg.speakerName}
                    </p>
                    {char && <p className="truncate text-[10px] text-prose-muted/56">{char.role}</p>}
                  </div>
                  <div
                    className="chat-bubble chat-bubble-character rounded-[1.3rem] border px-4 py-3.5 sm:px-5"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      boxShadow: `0 18px 38px -34px ${colors.glow}`,
                    }}
                  >
                    <p className="whitespace-pre-line break-words font-serif text-[15px] leading-relaxed text-prose-dim">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {sending && !streamingMessages?.length && <LoadingBubble language={language} />}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
