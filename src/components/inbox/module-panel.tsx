"use client";

import type { ReactNode } from "react";

type ModulePanelProps = {
  title: string;
  summary?: string;
  onMinimize?: () => void;
  children: ReactNode;
  headerActions?: ReactNode;
};

export function ModulePanel({ title, summary, onMinimize, children, headerActions }: ModulePanelProps) {
  return (
    <section className="ableton-panel">
      <div className="flex items-center justify-between gap-2 border-b border-ableton-border">
        <div className="ableton-panel-header flex min-w-0 flex-1 items-center justify-between gap-3 border-0">
          <span>{title}</span>
          {summary ? (
            <span className="truncate font-mono text-[10px] font-normal normal-case tracking-normal text-ableton-muted">
              {summary}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 pr-2">
          {headerActions}
          {onMinimize ? (
            <button type="button" className="ableton-btn px-2 py-1 text-[10px]" onClick={onMinimize}>
              Minimise
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
