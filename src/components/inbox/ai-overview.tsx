"use client";

import { useEffect, useState } from "react";
import { NoticeBoard } from "@/components/inbox/notice-board";
import { OVERVIEW_FILTERS, type OverviewFilterId } from "@/lib/overview-filters";
import type { NoticeType } from "@/server/overview/types";

type OverviewItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  receivedAt: string;
  messageId: string;
  noticeType?: NoticeType;
};

type OverviewResponse = {
  items: OverviewItem[];
  generatedBy: "ai" | "rules";
  filter: OverviewFilterId;
};

const ROTATE_MS = 6000;

type AiOverviewProps = {
  selectedFilter: OverviewFilterId;
  onFilterChange: (filter: OverviewFilterId) => void;
  onSelectMessage?: (messageId: string) => void;
};

export function AiOverview({ selectedFilter, onFilterChange, onSelectMessage }: AiOverviewProps) {
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generatedBy, setGeneratedBy] = useState<"ai" | "rules">("rules");
  const [error, setError] = useState<string | null>(null);

  const activeFilter = OVERVIEW_FILTERS.find((filter) => filter.id === selectedFilter) ?? OVERVIEW_FILTERS[0];

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/overview?filter=${selectedFilter}`);
        if (!response.ok) {
          throw new Error("Could not load overview");
        }
        const data = (await response.json()) as OverviewResponse;
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
  }, [selectedFilter]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  return (
    <section className="mb-4">
      <div className="ableton-panel mb-3">
        <div className="ableton-panel-header">Summary Filters</div>
        <div className="flex flex-wrap gap-2 p-3">
          {OVERVIEW_FILTERS.map((filter) => {
            const isActive = filter.id === selectedFilter;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                className={`ableton-chip ${isActive ? "ableton-chip-active" : ""}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="border-t border-ableton-border px-3 py-2 text-xs text-ableton-muted">{activeFilter.description}</div>
      </div>

      {loading ? (
        <div className="ableton-panel p-5">
          <p className="text-sm text-ableton-muted">Building {activeFilter.label.toLowerCase()} summaries...</p>
          <div className="ableton-meter mt-3">
            <div className="ableton-meter-fill w-1/3 animate-pulse" />
          </div>
        </div>
      ) : error || items.length === 0 ? (
        <div className="ableton-panel p-5">
          <p className="text-sm text-ableton-muted">
            {error ??
              (selectedFilter === "noticeboard"
                ? "No business service updates found in recent emails."
                : `No ${activeFilter.label.toLowerCase()} summaries found in recent emails.`)}
          </p>
        </div>
      ) : selectedFilter === "noticeboard" ? (
        <NoticeBoard items={items} generatedBy={generatedBy} onSelectMessage={onSelectMessage} />
      ) : (
        <div className="ableton-panel overflow-hidden">
          <div className="ableton-panel-header flex items-center justify-between">
            <span>AI Overview · {activeFilter.label}</span>
            <span className="normal-case tracking-normal text-ableton-orange">
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
    </section>
  );
}
