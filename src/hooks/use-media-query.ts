"use client";

import { useEffect, useState } from "react";
import { PIGEON_INBOX_GRID_BREAKPOINTS } from "@/lib/pigeon-grid";

export function useMinWidth(minWidth: number): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [minWidth]);

  return matches;
}

export function useIsMdUp(): boolean {
  return useMinWidth(PIGEON_INBOX_GRID_BREAKPOINTS.md);
}
