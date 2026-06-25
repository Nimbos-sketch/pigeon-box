"use client";

import type { NoticeType } from "@/server/overview/types";

type NoticeItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  receivedAt: string;
  messageId: string;
  noticeType?: NoticeType;
};

const NOTICE_LABELS: Record<NoticeType, string> = {
  maintenance: "Maintenance",
  billing: "Billing",
  security: "Security",
  product: "Product",
  account: "Account",
  general: "Service"
};

const NOTICE_COLORS: Record<NoticeType, string> = {
  maintenance: "border-ableton-orange text-ableton-orange",
  billing: "border-ableton-lime text-ableton-lime",
  security: "border-red-500 text-red-300",
  product: "border-ableton-blue text-ableton-blue",
  account: "border-ableton-muted text-ableton-subtle",
  general: "border-ableton-borderLight text-ableton-muted"
};

type NoticeBoardProps = {
  items: NoticeItem[];
  generatedBy: "ai" | "rules";
  onSelectMessage?: (messageId: string) => void;
};

export function NoticeBoard({ items, generatedBy, onSelectMessage }: NoticeBoardProps) {
  return (
    <div className="ableton-panel overflow-hidden">
      <div className="ableton-panel-header flex items-center justify-between">
        <span>Business Notice Board</span>
        <span className="normal-case tracking-normal text-ableton-orange">
          {generatedBy === "ai" ? "AI" : "Smart"} · {items.length} notices
        </span>
      </div>

      <div className="bg-ableton-pane p-4">
        <p className="mb-4 text-xs text-ableton-muted">
          Service updates, maintenance windows, billing alerts, and account changes — pinned for your team.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const noticeType = item.noticeType ?? "general";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMessage?.(item.messageId)}
                className="group relative border border-ableton-border bg-ableton-pane2 p-4 text-left transition hover:border-ableton-orange"
              >
                <span
                  className="absolute -left-px top-3 h-8 w-1 bg-ableton-orange"
                  aria-hidden
                />
                <div className="mb-2 flex items-start justify-between gap-2 pl-2">
                  <span
                    className={`border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${NOTICE_COLORS[noticeType]}`}
                  >
                    {NOTICE_LABELS[noticeType]}
                  </span>
                  <span className="font-mono text-[10px] text-ableton-muted">
                    {new Date(item.receivedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric"
                    })}
                  </span>
                </div>
                <h3 className="mb-2 pl-2 text-sm font-semibold leading-snug text-ableton-text group-hover:text-ableton-orange">
                  {item.headline}
                </h3>
                <p className="mb-3 pl-2 text-xs leading-relaxed text-ableton-subtle">{item.summary}</p>
                <p className="pl-2 font-mono text-[10px] text-ableton-orange">{item.source}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
