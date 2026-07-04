"use client";

import type { ReactNode } from "react";
import type { InboxWeekGroup } from "@/lib/inbox-week-groups";
import type { ObligationQueue } from "@/lib/inbox-queues";
import { WeekProgress } from "@/components/inbox/week-progress";

type Message = InboxWeekGroup["messages"][number];

type WeekGroupedMessageListProps = {
  groups: InboxWeekGroup[];
  selectedId: string | null;
  expandedWeekKey: string | null;
  unlockedMessageId: string | null;
  awaitingDispositionId?: string | null;
  triageEnabled: boolean;
  onWeekToggle: (weekKey: string) => void;
  onSelect: (messageId: string) => void;
  onQuickAction?: (action: "trash" | "spam", messageId: string) => void;
  weekSectionPrefix?: string;
  footer?: ReactNode;
};

const GRID_COLS = 4;

function padGridCells<T>(items: T[], columns: number): (T | null)[] {
  const padded: (T | null)[] = [...items];
  const remainder = padded.length % columns;
  if (remainder !== 0) {
    for (let i = 0; i < columns - remainder; i++) {
      padded.push(null);
    }
  }
  return padded;
}

function slotId(weekIndex: number, messageIndex: number): string {
  return `${String.fromCharCode(65 + weekIndex)}${String(messageIndex + 1).padStart(2, "0")}`;
}

export function WeekGroupedMessageList({
  groups,
  selectedId,
  expandedWeekKey,
  unlockedMessageId,
  awaitingDispositionId = null,
  triageEnabled,
  onWeekToggle,
  onSelect,
  onQuickAction,
  weekSectionPrefix = "week-section",
  footer
}: WeekGroupedMessageListProps) {
  return (
    <div className="pigeon-grid pigeon-grid-inbox">
      {groups.map((group, weekIndex) => {
        const isExpanded = expandedWeekKey === group.key;
        const hasUnread = group.unreadCount > 0;
        const complete = group.openedCount === group.totalCount;

        return (
          <div key={group.key} id={`${weekSectionPrefix}-${group.key}`} className="contents scroll-mt-3">
            <button
              type="button"
              onClick={() => onWeekToggle(group.key)}
              aria-expanded={isExpanded}
              className="pigeon-cell pigeon-cell-week"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-ableton-muted" aria-hidden>
                    {isExpanded ? "▼" : "▶"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ableton-text">{group.label}</p>
                    <p className="text-xs text-ableton-muted">{group.rangeLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="pigeon-slot-id">ROW {String.fromCharCode(65 + weekIndex)}</p>
                  <p className="font-mono text-[10px] text-ableton-subtle">{group.totalCount} cells</p>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      complete ? "text-ableton-lime" : hasUnread ? "text-ableton-orange" : "text-ableton-muted"
                    }`}
                  >
                    {complete ? "Done" : triageEnabled ? `${group.unreadCount} left` : `${group.unreadCount} unread`}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <WeekProgress
                  openedCount={group.openedCount}
                  totalCount={group.totalCount}
                  compact
                  triage={triageEnabled}
                />
              </div>
            </button>

            {isExpanded
              ? padGridCells(group.messages, GRID_COLS).map((message, cellIndex) => {
                  if (!message) {
                    return <div key={`empty-${group.key}-${cellIndex}`} className="pigeon-cell pigeon-cell-empty" />;
                  }

                  if (message.isNsfw) {
                    return (
                      <NsfwMessageCell
                        key={message.gmailId}
                        slot={slotId(weekIndex, cellIndex)}
                        message={message}
                        onTrash={() => onQuickAction?.("trash", message.gmailId)}
                        onSpam={() => onQuickAction?.("spam", message.gmailId)}
                      />
                    );
                  }

                  const isLocked =
                    triageEnabled && unlockedMessageId !== null && message.gmailId !== unlockedMessageId;
                  const needsDisposition =
                    triageEnabled && awaitingDispositionId !== null && message.gmailId === awaitingDispositionId;
                  const isNext =
                    triageEnabled &&
                    message.gmailId === unlockedMessageId &&
                    message.gmailId !== awaitingDispositionId;

                  return (
                    <MessageCell
                      key={message.gmailId}
                      slot={slotId(weekIndex, cellIndex)}
                      message={message}
                      isSelected={message.gmailId === selectedId}
                      isLocked={isLocked}
                      isNext={isNext}
                      needsDisposition={needsDisposition}
                      onSelect={onSelect}
                    />
                  );
                })
              : null}
          </div>
        );
      })}
      {footer ? <div className="contents">{footer}</div> : null}
    </div>
  );
}

function NsfwMessageCell({
  slot,
  message,
  onTrash,
  onSpam
}: {
  slot: string;
  message: Message;
  onTrash?: () => void;
  onSpam?: () => void;
}) {
  return (
    <div className="pigeon-cell border border-red-900/50 bg-red-950/30">
      <p className="pigeon-slot-id">{slot}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300">Blocked</p>
      <p className="mt-1 line-clamp-2 text-xs text-ableton-muted">{message.subject ?? "Content blocked"}</p>
      <div className="mt-2 flex gap-1">
        <button type="button" className="ableton-btn px-2 py-1 text-[10px]" onClick={onTrash}>
          Trash
        </button>
        <button type="button" className="ableton-btn border-red-800 px-2 py-1 text-[10px] text-red-300" onClick={onSpam}>
          Spam
        </button>
      </div>
    </div>
  );
}

function MessageCell({
  slot,
  message,
  isSelected,
  isLocked,
  isNext,
  needsDisposition,
  onSelect
}: {
  slot: string;
  message: Message;
  isSelected: boolean;
  isLocked: boolean;
  isNext: boolean;
  needsDisposition: boolean;
  onSelect: (messageId: string) => void;
}) {
  const queue: ObligationQueue = message.obligationQueue ?? "action";
  const queueLabel = queue === "response" ? "R" : "A";

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(message.gmailId)}
      title={isLocked ? "Finish the current cell before opening another" : undefined}
      style={message.accentColor ? { borderTopWidth: 3, borderTopColor: message.accentColor } : undefined}
      className={`pigeon-cell flex flex-col ${
        isLocked ? "pigeon-cell-locked" : isSelected ? "pigeon-cell-selected" : isNext ? "pigeon-cell-next" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="pigeon-slot-id">{slot}</span>
        <span className="flex items-center gap-1">
          {isLocked ? (
            <span className="text-[10px] text-ableton-muted">🔒</span>
          ) : message.isUnread ? (
            <span className="h-1.5 w-1.5 bg-ableton-lime" title="Unread" />
          ) : (
            <span className="h-1.5 w-1.5 bg-ableton-muted" title="Opened" />
          )}
          <span
            className={`text-[9px] font-bold ${queue === "response" ? "text-sky-300" : "text-ableton-lime"}`}
            title={queue === "response" ? "Respond" : "Action"}
          >
            {queueLabel}
          </span>
        </span>
      </div>
      <p className={`mt-1 line-clamp-2 text-xs font-medium leading-snug ${isLocked ? "text-ableton-muted" : "text-ableton-text"}`}>
        {message.subject ?? "(No subject)"}
      </p>
      <p className="mt-auto truncate pt-1 text-[10px] text-ableton-muted">{message.fromAddress ?? "Unknown"}</p>
      {isNext ? (
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-ableton-orange">Next</p>
      ) : needsDisposition ? (
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-ableton-orange">Action needed</p>
      ) : message.isPhishingRisk ? (
        <p className="mt-1 text-[9px] font-semibold uppercase text-amber-300">Phishing?</p>
      ) : null}
    </button>
  );
}
