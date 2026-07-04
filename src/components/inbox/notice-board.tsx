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
  isBroadcast?: boolean;
  emailed?: boolean;
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
  teamBroadcasts?: NoticeItem[];
  generatedBy: "ai" | "rules";
  onSelectMessage?: (messageId: string) => void;
};

function NoticeCard({
  item,
  pinned,
  onSelect
}: {
  item: NoticeItem;
  pinned?: boolean;
  onSelect?: (messageId: string) => void;
}) {
  const noticeType = item.noticeType ?? "general";
  const isBroadcast = item.isBroadcast ?? false;
  const clickable = !isBroadcast && item.messageId && !item.messageId.startsWith("broadcast:");

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && onSelect?.(item.messageId)}
      className={`group relative border bg-ableton-pane2 p-4 text-left transition ${
        pinned
          ? "border-ableton-orange/70 hover:border-ableton-orange"
          : "border-ableton-border hover:border-ableton-orange"
      } ${clickable ? "" : "cursor-default"}`}
    >
      <span
        className={`absolute -left-px top-3 h-8 w-1 ${pinned ? "bg-ableton-lime" : "bg-ableton-orange"}`}
        aria-hidden
      />
      <div className="mb-2 flex items-start justify-between gap-2 pl-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {pinned ? (
            <span className="border border-ableton-lime/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ableton-lime">
              Team
            </span>
          ) : null}
          <span
            className={`border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${NOTICE_COLORS[noticeType]}`}
          >
            {NOTICE_LABELS[noticeType]}
          </span>
          {item.emailed ? (
            <span className="text-[9px] uppercase tracking-[0.1em] text-ableton-muted">Emailed</span>
          ) : null}
        </div>
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
}

export function NoticeBoard({ items, teamBroadcasts = [], generatedBy, onSelectMessage }: NoticeBoardProps) {
  const hasTeam = teamBroadcasts.length > 0;
  const hasInbox = items.length > 0;

  return (
    <div className="ableton-panel overflow-hidden">
      <div className="ableton-panel-header flex items-center justify-between">
        <span>Business Notice Board</span>
        <span className="normal-case tracking-normal text-ableton-orange">
          {hasTeam ? `${teamBroadcasts.length} team` : ""}
          {hasTeam && hasInbox ? " · " : ""}
          {hasInbox ? `${items.length} inbox · ${generatedBy === "ai" ? "AI" : "Smart"}` : ""}
          {!hasTeam && !hasInbox ? "0 notices" : ""}
        </span>
      </div>

      <div className="bg-ableton-pane p-4">
        <p className="mb-4 text-xs text-ableton-muted">
          Team broadcasts from managers appear on every member&apos;s board. Inbox notices are pulled from service
          emails you receive.
        </p>

        {hasTeam ? (
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-lime">
              Team broadcasts
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teamBroadcasts.map((item) => (
                <NoticeCard key={item.id} item={item} pinned onSelect={onSelectMessage} />
              ))}
            </div>
          </div>
        ) : null}

        {hasInbox ? (
          <div>
            {hasTeam ? (
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-muted">
                From your inbox
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <NoticeCard key={item.id} item={item} onSelect={onSelectMessage} />
              ))}
            </div>
          </div>
        ) : !hasTeam ? (
          <p className="text-sm text-ableton-muted">No notices yet. Managers can publish team updates above.</p>
        ) : null}
      </div>
    </div>
  );
}
