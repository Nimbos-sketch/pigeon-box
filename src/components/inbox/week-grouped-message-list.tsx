"use client";

import type { InboxWeekGroup } from "@/lib/inbox-week-groups";
import { WeekProgress } from "@/components/inbox/week-progress";

type Message = InboxWeekGroup["messages"][number];

type WeekGroupedMessageListProps = {
  groups: InboxWeekGroup[];
  selectedId: string | null;
  expandedWeekKey: string | null;
  unlockedMessageId: string | null;
  triageEnabled: boolean;
  onWeekToggle: (weekKey: string) => void;
  onSelect: (messageId: string) => void;
  onQuickAction?: (action: "trash" | "spam", messageId: string) => void;
  weekSectionPrefix?: string;
};

export function WeekGroupedMessageList({
  groups,
  selectedId,
  expandedWeekKey,
  unlockedMessageId,
  triageEnabled,
  onWeekToggle,
  onSelect,
  onQuickAction,
  weekSectionPrefix = "week-section"
}: WeekGroupedMessageListProps) {
  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isExpanded = expandedWeekKey === group.key;
        const hasUnread = group.unreadCount > 0;
        const complete = group.openedCount === group.totalCount;

        return (
          <div key={group.key} id={`${weekSectionPrefix}-${group.key}`} className="scroll-mt-3">
            <button
              type="button"
              onClick={() => onWeekToggle(group.key)}
              aria-expanded={isExpanded}
              className={`w-full border p-3 text-left transition ${
                isExpanded
                  ? "border-ableton-orange bg-ableton-pane2"
                  : hasUnread
                    ? "border-ableton-orange/50 bg-ableton-pane hover:border-ableton-orange"
                    : "border-ableton-border bg-ableton-pane hover:border-ableton-borderLight"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 text-xs ${isExpanded ? "text-ableton-orange" : "text-ableton-muted"}`}
                    aria-hidden
                  >
                    {isExpanded ? "▼" : "▶"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ableton-text">{group.label}</p>
                    <p className="text-xs text-ableton-muted">{group.rangeLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-ableton-subtle">{group.totalCount} emails</p>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      complete ? "text-ableton-lime" : "text-ableton-orange"
                    }`}
                  >
                    {complete ? "Done" : `${group.unreadCount} unread`}
                  </span>
                </div>
              </div>
              <WeekProgress openedCount={group.openedCount} totalCount={group.totalCount} compact />
            </button>

            {isExpanded ? (
              <div className="mt-2 space-y-2 border-l-2 border-ableton-orange/40 pl-2">
                {group.messages.map((message) => {
                  if (message.isNsfw) {
                    return (
                      <NsfwMessageRow
                        key={message.gmailId}
                        message={message}
                        onTrash={() => onQuickAction?.("trash", message.gmailId)}
                        onSpam={() => onQuickAction?.("spam", message.gmailId)}
                      />
                    );
                  }

                  const isLocked =
                    triageEnabled && unlockedMessageId !== null && message.isUnread && message.gmailId !== unlockedMessageId;
                  const isNext = triageEnabled && message.gmailId === unlockedMessageId;
                  const needsFiling = triageEnabled && !message.isUnread;

                  return (
                    <MessageRow
                      key={message.gmailId}
                      message={message}
                      isSelected={message.gmailId === selectedId}
                      isLocked={isLocked}
                      isNext={isNext}
                      needsFiling={needsFiling}
                      onSelect={onSelect}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function NsfwMessageRow({
  message,
  onTrash,
  onSpam
}: {
  message: Message;
  onTrash?: () => void;
  onSpam?: () => void;
}) {
  return (
    <div className="w-full border border-red-900/50 bg-red-950/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300">Blocked</span>
        <p className="truncate text-sm font-medium text-ableton-muted">{message.subject ?? "Content blocked"}</p>
      </div>
      <p className="text-xs text-ableton-muted">{message.snippet ?? "Hidden by NSFW filter"}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="ableton-btn text-xs" onClick={onTrash}>
          Trash
        </button>
        <button type="button" className="ableton-btn text-xs border-red-800 text-red-300" onClick={onSpam}>
          Spam
        </button>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  isSelected,
  isLocked,
  isNext,
  needsFiling,
  onSelect
}: {
  message: Message;
  isSelected: boolean;
  isLocked: boolean;
  isNext: boolean;
  needsFiling: boolean;
  onSelect: (messageId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => onSelect(message.gmailId)}
      title={isLocked ? "Open the oldest unread email in your inbox first" : undefined}
      className={`w-full border p-3 text-left transition ${
        isLocked
          ? "cursor-not-allowed border-ableton-border/60 bg-ableton-surface/50 opacity-55"
          : isSelected
            ? "border-ableton-orange bg-ableton-pane2"
            : isNext
              ? "border-ableton-orange/70 bg-ableton-surface hover:border-ableton-orange"
              : "border-ableton-border bg-ableton-surface hover:border-ableton-borderLight"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        {isLocked ? (
          <span className="shrink-0 text-[10px] text-ableton-muted" title="Locked">
            🔒
          </span>
        ) : message.isUnread ? (
          <span className="h-2 w-2 shrink-0 bg-ableton-lime" title="Unread" />
        ) : (
          <span className="h-2 w-2 shrink-0 bg-ableton-muted" title="Opened" />
        )}
        <p className={`truncate text-sm font-medium ${isLocked ? "text-ableton-muted" : "text-ableton-text"}`}>
          {message.subject ?? "(No subject)"}
        </p>
        {isNext ? (
          <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-ableton-orange">
            {message.isUnread ? "Up next" : "File me"}
          </span>
        ) : needsFiling ? (
          <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-ableton-lime">
            Read · file
          </span>
        ) : null}
      </div>
      <p className="truncate text-xs text-ableton-muted">{message.fromAddress ?? "Unknown sender"}</p>
      <p className="truncate text-xs text-ableton-subtle">{message.snippet ?? ""}</p>
      {message.internalDate ? (
        <p className="mt-1 font-mono text-[10px] text-ableton-orange">
          {new Date(message.internalDate).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
        </p>
      ) : null}
    </button>
  );
}
