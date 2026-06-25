"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" className="ableton-btn" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? "Space Grey" : "Dark Mode"}
    </button>
  );
}
