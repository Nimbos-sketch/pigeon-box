import { formatOpenedCount } from "@/lib/inbox-week-groups";

type WeekProgressProps = {
  openedCount: number;
  totalCount: number;
  compact?: boolean;
};

export function WeekProgress({ openedCount, totalCount, compact = false }: WeekProgressProps) {
  const percent = totalCount > 0 ? Math.round((openedCount / totalCount) * 100) : 0;
  const complete = totalCount > 0 && openedCount === totalCount;
  const hasUnread = openedCount < totalCount;

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-mono ${compact ? "text-[10px]" : "text-[11px]"} text-ableton-subtle`}>
          {formatOpenedCount(openedCount, totalCount)}
        </p>
        {complete ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-lime">All caught up</span>
        ) : hasUnread ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-orange">
            {totalCount - openedCount} unread
          </span>
        ) : null}
      </div>
      <div className={`ableton-meter ${compact ? "h-1.5" : ""}`}>
        <div
          className={`ableton-meter-fill transition-all ${complete ? "bg-ableton-lime" : hasUnread ? "bg-ableton-orange" : "bg-ableton-borderLight"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
