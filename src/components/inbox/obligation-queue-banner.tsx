import type { ObligationQueue } from "@/lib/inbox-queues";

type ObligationQueueBannerProps = {
  responseCount: number;
  actionCount: number;
  lockedCount: number;
  unlockedSubject: string | null;
  unlockedQueue: ObligationQueue | null;
};

export function ObligationQueueBanner({
  responseCount,
  actionCount,
  lockedCount,
  unlockedSubject,
  unlockedQueue
}: ObligationQueueBannerProps) {
  return (
    <div className="mb-4 border border-ableton-orange/60 bg-ableton-pane2 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">
        Slack-style obligation queue
      </p>
      <p className="mt-1 text-sm text-ableton-text">
        Respond or action each email before the next unlocks — no silent inbox silos.
      </p>
      <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px]">
        <span className="text-sky-300">Respond queue: {responseCount}</span>
        <span className="text-ableton-lime">Action queue: {actionCount}</span>
        {lockedCount > 0 ? <span className="text-ableton-orange">{lockedCount} locked</span> : null}
      </div>
      {unlockedSubject ? (
        <p className="mt-2 text-xs text-ableton-muted">
          Up next ({unlockedQueue === "response" ? "respond" : "action"}):{" "}
          <span className="text-ableton-subtle">{unlockedSubject}</span>
        </p>
      ) : null}
    </div>
  );
}
