"use client";

import { useEffect, useState } from "react";
import { getPigeonInboxGridColumns, PIGEON_INBOX_GRID_COLUMNS } from "@/lib/pigeon-grid";

export function usePigeonInboxGridColumns(): number {
  const [columns, setColumns] = useState<number>(PIGEON_INBOX_GRID_COLUMNS.default);

  useEffect(() => {
    const update = () => setColumns(getPigeonInboxGridColumns(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}
