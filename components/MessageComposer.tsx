"use client";

import { useState } from "react";
import { T, type Lang } from "@/lib/i18n";

interface Props {
  onSend: (message: string, action?: string) => void;
  onWait?: () => void;
  disabled: boolean;
  sending: boolean;
  language: Lang;
}

const ACTION_CONFIG = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    key: "action.look",
    zh: "[环顾四周] 你停下脚步，仔细观察周围的环境。",
    en: "[Look Around] You pause and carefully observe your surroundings.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <path d="M16 11h-1a4 4 0 0 0-4-4"/>
        <path d="M16 15h-1a4 4 0 0 1-4 4"/>
      </svg>
    ),
    key: "action.listen",
    zh: "[竖耳倾听] 你安静下来，仔细听周围的声音。",
    en: "[Listen] You go quiet and listen to the sounds around you.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>
    ),
    key: "action.think",
    zh: "[整理思路] 你退后一步，在心里整理目前掌握的所有线索。",
    en: "[Think] You step back and mentally organize everything you've learned so far.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    key: "composer.wait",
    zh: "wait",
    en: "wait",
    isWait: true,
  },
];

export default function MessageComposer({ onSend, onWait, disabled, sending, language }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleAction = (action: (typeof ACTION_CONFIG)[number]) => {
    if (disabled) return;
    if (action.isWait) {
      onWait?.();
    } else {
      onSend(language === "zh" ? action.zh : action.en, language === "zh" ? action.zh : action.en);
    }
  };

  return (
    <div className="composer-bar border-t border-edge/50 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ACTION_CONFIG.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => handleAction(action)}
              className="composer-action flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-25"
              title={action.isWait
                ? (language === "zh" ? "让时间流逝，不说话" : "Let time pass without speaking")
                : T(action.key, language)}
            >
              {action.icon}
              <span>{T(action.key, language)}</span>
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={sending ? T("composer.sending", language) : T("composer.placeholder", language)}
            disabled={disabled}
            className="composer-input min-w-0 flex-1 rounded-lg border px-4 py-3 text-base outline-none transition disabled:opacity-30 sm:text-sm"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="composer-submit rounded-lg px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-20"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="typing-dots typing-dots-compact" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>{language === "zh" ? "\u63a8\u7406\u4e2d" : "Thinking"}</span>
              </span>
            ) : T("composer.send", language)}
          </button>
        </form>
      </div>
    </div>
  );
}
