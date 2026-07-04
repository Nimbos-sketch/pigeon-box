"use client";

import type { ReactNode } from "react";

type CollapsibleModuleProps = {
  title: string;
  summary?: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
};

export function CollapsibleModule({
  title,
  summary,
  collapsed,
  onCollapsedChange,
  children,
  className = "mb-4",
  headerActions
}: CollapsibleModuleProps) {
  return (
    <section className={`ableton-panel ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-ableton-border">
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
          className="ableton-panel-header flex min-w-0 flex-1 items-center justify-between gap-3 border-0 text-left"
        >
          <span className="flex items-center gap-2">
            <span className="text-xs text-ableton-muted" aria-hidden>
              {collapsed ? "▶" : "▼"}
            </span>
            <span>{title}</span>
          </span>
          {summary ? (
            <span className="truncate font-mono text-[10px] font-normal normal-case tracking-normal text-ableton-muted">
              {summary}
            </span>
          ) : null}
        </button>
        {headerActions ? <div className="shrink-0 pr-2">{headerActions}</div> : null}
      </div>
      {!collapsed ? children : null}
    </section>
  );
}
