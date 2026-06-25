"use client";

import type { InboxWeekGroup } from "@/lib/inbox-week-groups";
import { WeekProgress } from "@/components/inbox/week-progress";

type WeekInboxDigestProps = {
  groups: InboxWeekGroup[];
  selectedWeekKey: string | null;
  onJumpToWeek: (weekKey: string) => void;
};

export function WeekInboxDigest({ groups, selectedWeekKey, onJumpToWeek }: WeekInboxDigestProps) {
  if (groups.length === 0) {
    return null;
  }

  const totalOpened = groups.reduce((sum, group) => sum + group.openedCount, 0);
  const totalMessages = groups.reduce((sum, group) => sum + group.totalCount, 0);
  const weeksWithUnread = groups.filter((group) => group.unreadCount > 0).length;

  return (
    <div className="mt-6 border-t border-ableton-border pt-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-muted">Inbox by week</p>
          <h3 className="mt-1 text-sm font-semibold text-ableton-text">Nothing missed</h3>
          <p className="mt-1 text-xs text-ableton-muted">
            {weeksWithUnread > 0
              ? `${weeksWithUnread} week${weeksWithUnread === 1 ? "" : "s"} still have unread mail`
              : "Every loaded week is fully opened"}
          </p>
        </div>
        <p className="font-mono text-[11px] text-ableton-orange">
          {totalOpened} / {totalMessages} opened
        </p>
      </div>

      <div className="space-y-2">
        {groups.map((group) => {
          const isActive = group.key === selectedWeekKey;
          const complete = group.openedCount === group.totalCount;

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onJumpToWeek(group.key)}
              className={`w-full border p-3 text-left transition ${
                isActive
                  ? "border-ableton-orange bg-ableton-pane2"
                  : complete
                    ? "border-ableton-border bg-ableton-pane hover:border-ableton-borderLight"
                    : "border-ableton-orange/40 bg-ableton-pane hover:border-ableton-orange"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ableton-text">{group.label}</p>
                  <p className="text-xs text-ableton-muted">{group.rangeLabel}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    complete ? "text-ableton-lime" : "text-ableton-orange"
                  }`}
                >
                  {complete ? "Done" : `${group.unreadCount} left`}
                </span>
              </div>
              <WeekProgress openedCount={group.openedCount} totalCount={group.totalCount} compact />
            </button>
          );
        })}
      </div>
    </div>
  );
}
