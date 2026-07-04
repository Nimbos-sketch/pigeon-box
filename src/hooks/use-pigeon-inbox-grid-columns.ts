"use client";

import { useEffect, useState } from "react";
import { getPigeonInboxGridColumns, PIGEON_INBOX_GRID_BREAKPOINTS, PIGEON_INBOX_GRID_COLUMNS } from "@/lib/pigeon-grid";

function getInitialColumns(): number {
  if (typeof window === "undefined") {
    return PIGEON_INBOX_GRID_COLUMNS.default;
  }
  return getPigeonInboxGridColumns(window.innerWidth);
}

export function usePigeonInboxGridColumns(): number {
  const [columns, setColumns] = useState<number>(getInitialColumns);

  useEffect(() => {
    const smQuery = window.matchMedia(`(min-width: ${PIGEON_INBOX_GRID_BREAKPOINTS.sm}px)`);
    const lgQuery = window.matchMedia(`(min-width: ${PIGEON_INBOX_GRID_BREAKPOINTS.lg}px)`);

    const update = () => {
      setColumns(getPigeonInboxGridColumns(window.innerWidth));
    };

    update();
    smQuery.addEventListener("change", update);
    lgQuery.addEventListener("change", update);
    return () => {
      smQuery.removeEventListener("change", update);
      lgQuery.removeEventListener("change", update);
    };
  }, []);

  return columns;
}
