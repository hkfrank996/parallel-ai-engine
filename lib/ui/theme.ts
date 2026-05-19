"use client";

import { useEffect, useState } from "react";

export type UiTheme = "night" | "day";

export const THEME_KEY = "parallel-theme";
const THEME_EVENT = "parallel-theme-change";

function readDocumentTheme(): UiTheme | null {
  if (typeof document === "undefined") return null;
  const theme = document.documentElement.dataset.theme;
  return theme === "day" || theme === "night" ? theme : null;
}

export function loadTheme(): UiTheme {
  if (typeof window !== "undefined") {
    return localStorage.getItem(THEME_KEY) === "day" ? "day" : "night";
  }
  const documentTheme = readDocumentTheme();
  return documentTheme || "night";
}

export function applyTheme(theme: UiTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("theme-day", theme === "day");
  document.documentElement.classList.toggle("theme-night", theme === "night");
}

export function saveTheme(theme: UiTheme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent<UiTheme>(THEME_EVENT, { detail: theme }));
}

export function useUiTheme() {
  const [uiTheme, setUiThemeState] = useState<UiTheme>(() => loadTheme());
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = loadTheme();
      applyTheme(nextTheme);
      setUiThemeState(nextTheme);
      setThemeReady(true);
    };
    const syncVisibleTheme = () => {
      if (document.visibilityState === "visible") syncTheme();
    };

    syncTheme();
    window.addEventListener(THEME_EVENT, syncTheme as EventListener);
    window.addEventListener("storage", syncTheme);
    window.addEventListener("pageshow", syncTheme);
    document.addEventListener("visibilitychange", syncVisibleTheme);

    return () => {
      window.removeEventListener(THEME_EVENT, syncTheme as EventListener);
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("pageshow", syncTheme);
      document.removeEventListener("visibilitychange", syncVisibleTheme);
    };
  }, []);

  const setUiTheme = (nextTheme: UiTheme | ((current: UiTheme) => UiTheme)) => {
    setUiThemeState((currentTheme) => {
      const resolvedTheme = typeof nextTheme === "function"
        ? nextTheme(currentTheme)
        : nextTheme;
      saveTheme(resolvedTheme);
      return resolvedTheme;
    });
  };

  return { uiTheme, setUiTheme, themeReady };
}
