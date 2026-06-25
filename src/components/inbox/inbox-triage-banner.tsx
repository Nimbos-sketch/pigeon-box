type InboxTriageBannerProps = {
  lockedCount: number;
  unlockedSubject: string | null;
};

export function InboxTriageBanner({ lockedCount, unlockedSubject }: InboxTriageBannerProps) {
  return (
    <div className="mb-4 border border-ableton-orange/60 bg-ableton-pane2 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">
        Oldest-first inbox
      </p>
      <p className="mt-1 text-sm text-ableton-text">
        Newer unread emails stay locked until you open the oldest unread one. Already-read emails stay open so you can file them.
      </p>
      {unlockedSubject ? (
        <p className="mt-2 text-xs text-ableton-muted">
          Up next: <span className="text-ableton-subtle">{unlockedSubject}</span>
        </p>
      ) : null}
      {lockedCount > 0 ? (
        <p className="mt-1 font-mono text-[11px] text-ableton-orange">
          {lockedCount} newer email{lockedCount === 1 ? "" : "s"} locked
        </p>
      ) : null}
    </div>
  );
}
