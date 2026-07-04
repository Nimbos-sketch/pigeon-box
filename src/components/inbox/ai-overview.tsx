"use client";

import { useCallback, useEffect, useState } from "react";
import { BroadcastComposer } from "@/components/inbox/broadcast-composer";
import { NoticeBoard } from "@/components/inbox/notice-board";
import { OverviewFilterPicker } from "@/components/inbox/overview-filter-picker";
import { OVERVIEW_FILTERS, type OverviewFilterId } from "@/lib/overview-filters";
import {
  loadEnabledOverviewFilters,
  saveEnabledOverviewFilters,
  toggleOverviewFilter
} from "@/lib/overview-layout-prefs";
import type { NoticeType } from "@/server/overview/types";

type OverviewItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  receivedAt: string;
  messageId: string;
  noticeType?: NoticeType;
  isBroadcast?: boolean;
  emailed?: boolean;
};

type OverviewResponse = {
  items: OverviewItem[];
  generatedBy: "ai" | "rules";
  filter: OverviewFilterId;
};

type OrgBroadcastResponse = {
  org: { name: string; role: "manager" | "member" } | null;
  broadcasts: OverviewItem[];
};

const ROTATE_MS = 6000;

type AiOverviewProps = {
  selectedFilter: OverviewFilterId;
  onFilterChange: (filter: OverviewFilterId) => void;
  onSelectMessage?: (messageId: string) => void;
};

export function AiOverview({ selectedFilter, onFilterChange, onSelectMessage }: AiOverviewProps) {
  const [enabledFilterIds, setEnabledFilterIds] = useState<OverviewFilterId[]>(OVERVIEW_FILTERS.map((f) => f.id));
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [teamBroadcasts, setTeamBroadcasts] = useState<OverviewItem[]>([]);
  const [orgRole, setOrgRole] = useState<"manager" | "member" | null>(null);
  const [orgName, setOrgName] = useState("Team");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generatedBy, setGeneratedBy] = useState<"ai" | "rules">("rules");
  const [error, setError] = useState<string | null>(null);

  const visibleFilters = OVERVIEW_FILTERS.filter((filter) => enabledFilterIds.includes(filter.id));
  const activeFilter = getOverviewFilterSafe(selectedFilter, enabledFilterIds);

  useEffect(() => {
    setEnabledFilterIds(loadEnabledOverviewFilters());
  }, []);

  const loadTeamBroadcasts = useCallback(async () => {
    try {
      const response = await fetch("/api/org/broadcasts");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as OrgBroadcastResponse;
      setOrgRole(data.org?.role ?? null);
      setOrgName(data.org?.name ?? "Team");
      setTeamBroadcasts(
        (data.broadcasts ?? []).map((broadcast) => ({
          ...broadcast,
          id: `broadcast-${broadcast.id}`,
          isBroadcast: true
        }))
      );
    } catch {
      setTeamBroadcasts([]);
    }
  }, []);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const requests: [Promise<Response>, Promise<void>?] = [fetch(`/api/overview?filter=${selectedFilter}`)];
        if (selectedFilter === "noticeboard") {
          requests.push(loadTeamBroadcasts());
        } else {
          setTeamBroadcasts([]);
        }

        const [overviewRes] = await Promise.all(requests);
        if (!overviewRes.ok) {
          throw new Error("Could not load overview");
        }
        const data = (await overviewRes.json()) as OverviewResponse;
        setItems(data.items ?? []);
        setGeneratedBy(data.generatedBy ?? "rules");
        setActiveIndex(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Overview failed");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    void loadOverview();
  }, [selectedFilter, loadTeamBroadcasts]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  function handleToggleFilter(filterId: OverviewFilterId) {
    const next = toggleOverviewFilter(enabledFilterIds, filterId);
    setEnabledFilterIds(next);
    saveEnabledOverviewFilters(next);
    if (!next.includes(selectedFilter)) {
      onFilterChange(next[0]);
    }
  }

  const showNoticeBoard = selectedFilter === "noticeboard";
  const hasNoticeContent = teamBroadcasts.length > 0 || items.length > 0;

  return (
    <div>
      <div className="border-b border-ableton-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <p className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-ableton-muted">Summary filters</p>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleFilters.map((filter) => {
              const isActive = filter.id === selectedFilter;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onFilterChange(filter.id)}
                  className={`ableton-chip shrink-0 whitespace-nowrap ${isActive ? "ableton-chip-active" : ""}`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <div className="shrink-0">
            <OverviewFilterPicker enabledFilterIds={enabledFilterIds} onToggle={handleToggleFilter} />
          </div>
        </div>
        <div className="border-t border-ableton-border px-3 py-2 text-xs text-ableton-muted">{activeFilter.description}</div>
      </div>

      {showNoticeBoard && orgRole === "manager" ? (
        <div className="border-b border-ableton-border p-3">
          <BroadcastComposer orgName={orgName} onPublished={() => void loadTeamBroadcasts()} />
        </div>
      ) : null}

      {loading ? (
        <div className="p-5">
          <p className="text-sm text-ableton-muted">Building {activeFilter.label.toLowerCase()} summaries...</p>
          <div className="ableton-meter mt-3">
            <div className="ableton-meter-fill w-1/3 animate-pulse" />
          </div>
        </div>
      ) : error && !hasNoticeContent ? (
        <div className="p-5">
          <p className="text-sm text-ableton-muted">{error}</p>
        </div>
      ) : showNoticeBoard ? (
        <NoticeBoard
          items={items}
          teamBroadcasts={teamBroadcasts}
          generatedBy={generatedBy}
          onSelectMessage={onSelectMessage}
        />
      ) : error || items.length === 0 ? (
        <div className="p-5">
          <p className="text-sm text-ableton-muted">
            {error ?? `No ${activeFilter.label.toLowerCase()} summaries found in recent emails.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ableton-border bg-ableton-pane2 px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">
              AI Overview · {activeFilter.label}
            </span>
            <span className="font-mono text-[10px] text-ableton-orange">
              {generatedBy === "ai" ? "AI" : "Smart"}
            </span>
          </div>

          <div className="border-b border-ableton-border bg-ableton-pane p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">
                Clip {activeIndex + 1} / {items.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ableton-btn"
                  onClick={() => setActiveIndex((current) => (current - 1 + items.length) % items.length)}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="ableton-btn"
                  onClick={() => setActiveIndex((current) => (current + 1) % items.length)}
                >
                  Next
                </button>
              </div>
            </div>

            <article
              key={`${selectedFilter}-${items[activeIndex].id}`}
              className="animate-[fadeIn_0.45s_ease] cursor-pointer border border-ableton-border bg-ableton-pane2 p-4 hover:border-ableton-orange"
              onClick={() => onSelectMessage?.(items[activeIndex].messageId)}
            >
              <h2 className="mb-2 text-lg font-semibold leading-snug text-ableton-text">{items[activeIndex].headline}</h2>
              <p className="mb-3 max-w-4xl text-sm text-ableton-subtle">{items[activeIndex].summary}</p>
              <p className="font-mono text-[11px] text-ableton-orange">
                {items[activeIndex].source} · {new Date(items[activeIndex].receivedAt).toLocaleString()}
              </p>
            </article>

            <div className="mt-4 flex items-center gap-1.5">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show overview item ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 transition-all ${
                    index === activeIndex ? "w-8 bg-ableton-orange" : "w-2 bg-ableton-borderLight hover:bg-ableton-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getOverviewFilterSafe(selected: OverviewFilterId, enabled: OverviewFilterId[]) {
  const match = OVERVIEW_FILTERS.find((filter) => filter.id === selected && enabled.includes(filter.id));
  if (match) {
    return match;
  }
  const fallback = OVERVIEW_FILTERS.find((filter) => enabled.includes(filter.id));
  return fallback ?? OVERVIEW_FILTERS[0];
}
