"use client";

import {
  collapseAllModules,
  expandAllModules,
  type ModuleCollapseState
} from "@/lib/inbox-layout-prefs";

type LayoutControlsProps = {
  collapsed: ModuleCollapseState;
  onCollapsedChange: (state: ModuleCollapseState) => void;
};

export function LayoutControls({ collapsed, onCollapsedChange }: LayoutControlsProps) {
  const collapsedCount = Object.values(collapsed).filter(Boolean).length;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-ableton-border bg-ableton-pane2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">
        Layout · {collapsedCount} minimised
      </p>
      <div className="flex gap-2">
        <button type="button" className="ableton-btn text-xs" onClick={() => onCollapsedChange(collapseAllModules())}>
          Minimise all
        </button>
        <button type="button" className="ableton-btn text-xs" onClick={() => onCollapsedChange(expandAllModules())}>
          Expand all
        </button>
      </div>
    </div>
  );
}
