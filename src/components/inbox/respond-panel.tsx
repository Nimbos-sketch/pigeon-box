import type { QuickReplyTemplate } from "@/lib/inbox-disposition";

type RespondPanelProps = {
  messageId: string;
  onQuickReply: (template: QuickReplyTemplate) => void;
  onArchiveAfterReply: () => void;
  sending: boolean;
};

const TEMPLATE_LABELS: Record<QuickReplyTemplate, string> = {
  on_it: "On it — I'll follow up shortly",
  received: "Received, thank you",
  will_review: "I'll review and reply fully soon"
};

export function RespondPanel({ messageId, onQuickReply, onArchiveAfterReply, sending }: RespondPanelProps) {
  return (
    <div className="mb-6 border border-sky-700/60 bg-sky-950/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">
        Respond · Close the loop
      </p>
      <p className="mt-2 text-xs text-ableton-muted">
        Send a quick acknowledgment or open a full reply. Archive only after you have responded.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {(Object.keys(TEMPLATE_LABELS) as QuickReplyTemplate[]).map((template) => (
          <button
            key={template}
            type="button"
            disabled={sending}
            className="ableton-btn border-sky-800/60 text-left text-sm hover:border-sky-500 disabled:opacity-60"
            onClick={() => onQuickReply(template)}
          >
            {sending ? "Sending..." : TEMPLATE_LABELS[template]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="ableton-btn ableton-btn-primary" href={`/compose?mode=reply&id=${messageId}`}>
          Open full reply
        </a>
        <button
          type="button"
          className="ableton-btn"
          disabled={sending}
          onClick={onArchiveAfterReply}
        >
          Responded — archive
        </button>
      </div>
    </div>
  );
}
