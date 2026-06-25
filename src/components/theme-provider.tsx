"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "dark" | "space-grey";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "gmail-organizer-theme";

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: AppTheme = saved === "space-grey" ? "space-grey" : "dark";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  function setTheme(next: AppTheme) {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "space-grey" : "dark");
  }

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
