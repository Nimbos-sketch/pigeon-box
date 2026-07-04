"use client";

import { useEffect, useRef, useState } from "react";
import { OVERVIEW_FILTERS, type OverviewFilterId } from "@/lib/overview-filters";

type OverviewFilterPickerProps = {
  enabledFilterIds: OverviewFilterId[];
  onToggle: (filterId: OverviewFilterId) => void;
};

export function OverviewFilterPicker({ enabledFilterIds, onToggle }: OverviewFilterPickerProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="ableton-btn text-xs"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Filters {open ? "▲" : "▼"}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] border border-ableton-border bg-ableton-pane2 p-2 shadow-lg">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.14em] text-ableton-muted">
            Show on overview bar
          </p>
          <ul className="space-y-1">
            {OVERVIEW_FILTERS.map((filter) => {
              const checked = enabledFilterIds.includes(filter.id);
              const isLastEnabled = checked && enabledFilterIds.length === 1;
              return (
                <li key={filter.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm ${
                      isLastEnabled ? "cursor-not-allowed opacity-60" : "hover:bg-ableton-pane"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLastEnabled}
                      onChange={() => onToggle(filter.id)}
                    />
                    <span className="text-ableton-text">{filter.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
