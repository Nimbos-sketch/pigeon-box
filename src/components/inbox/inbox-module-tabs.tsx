"use client";

import {
  MODULE_LABELS,
  MODULE_TAB_ORDER,
  type InboxModuleId
} from "@/lib/inbox-layout-prefs";

export type ModuleTabSummary = Partial<Record<InboxModuleId, string>>;

type InboxModuleTabsProps = {
  activeId: InboxModuleId;
  visibleIds: InboxModuleId[];
  summaries: ModuleTabSummary;
  onSelect: (id: InboxModuleId) => void;
  onFocusInbox: () => void;
};

export function InboxModuleTabs({
  activeId,
  visibleIds,
  summaries,
  onSelect,
  onFocusInbox
}: InboxModuleTabsProps) {
  const activeIndex = visibleIds.indexOf(activeId);
  const activeLabel = MODULE_LABELS[activeId];
  const activeSummary = summaries[activeId];

  return (
    <div className="border-b border-ableton-border bg-ableton-pane2">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
        <p className="mr-1 hidden text-[10px] uppercase tracking-[0.14em] text-ableton-muted sm:block">Panels</p>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {MODULE_TAB_ORDER.filter((id) => visibleIds.includes(id)).map((id) => {
            const isActive = id === activeId;
            const summary = summaries[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                title={summary ? `${MODULE_LABELS[id]} · ${summary}` : MODULE_LABELS[id]}
                className={`ableton-chip shrink-0 ${isActive ? "ableton-chip-active" : ""}`}
              >
                <span>{MODULE_LABELS[id]}</span>
                {summary && !isActive ? (
                  <span className="ml-1.5 hidden font-mono text-[9px] text-ableton-muted sm:inline">
                    {summary}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {activeId !== "inbox" ? (
            <button type="button" className="ableton-btn text-xs" onClick={onFocusInbox}>
              Focus inbox
            </button>
          ) : null}
          <span className="hidden font-mono text-[10px] text-ableton-muted lg:inline">
            {activeIndex + 1}/{visibleIds.length}
            {activeSummary ? ` · ${activeSummary}` : ""}
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-7xl border-t border-ableton-border/50 px-4 py-1.5 lg:hidden">
        <p className="truncate font-mono text-[10px] text-ableton-muted">
          {activeLabel}
          {activeSummary ? ` · ${activeSummary}` : ""}
        </p>
      </div>
    </div>
  );
}
