import type { ObligationQueue } from "@/lib/inbox-queues";
import type { DispositionMode } from "@/lib/inbox-disposition";

type DispositionChooserProps = {
  suggestedQueue: ObligationQueue;
  onChoose: (mode: DispositionMode) => void;
};

export function DispositionChooser({ suggestedQueue, onChoose }: DispositionChooserProps) {
  return (
    <div className="mb-6 border-2 border-ableton-orange bg-ableton-pane2 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">
        Required · Choose disposition
      </p>
      <p className="mt-2 text-sm text-ableton-text">
        Every email must be <strong className="font-semibold">responded</strong> or{" "}
        <strong className="font-semibold">actioned</strong> before the next one unlocks.
      </p>
      <p className="mt-1 text-xs text-ableton-muted">
        Suggested queue:{" "}
        <span className={suggestedQueue === "response" ? "text-sky-300" : "text-ableton-lime"}>
          {suggestedQueue === "response" ? "Needs response" : "Needs action"}
        </span>
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          className="border border-sky-700/70 bg-sky-950/40 p-4 text-left transition hover:border-sky-500"
          onClick={() => onChoose("respond")}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">Respond</p>
          <p className="mt-1 text-xs text-ableton-subtle">Reply or acknowledge — closes the loop with the sender.</p>
        </button>
        <button
          type="button"
          className="border border-ableton-lime/50 bg-ableton-pane p-4 text-left transition hover:border-ableton-lime"
          onClick={() => onChoose("action")}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-lime">Action</p>
          <p className="mt-1 text-xs text-ableton-subtle">File, route, or archive — no reply needed.</p>
        </button>
        <button
          type="button"
          className="border border-ableton-border bg-ableton-surface p-4 text-left transition hover:border-ableton-borderLight"
          onClick={() => onChoose("fyi")}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-muted">FYI</p>
          <p className="mt-1 text-xs text-ableton-subtle">Read-only update — archive immediately.</p>
        </button>
      </div>
    </div>
  );
}
