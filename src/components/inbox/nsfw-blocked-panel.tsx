type NsfwBlockedPanelProps = {
  onTrash: () => void;
  onSpam: () => void;
  loading?: boolean;
};

export function NsfwBlockedPanel({ onTrash, onSpam, loading = false }: NsfwBlockedPanelProps) {
  return (
    <div className="border border-red-900/60 bg-red-950/30 p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300">NSFW filter</p>
      <h2 className="mt-2 text-lg font-semibold text-ableton-text">This email is blocked</h2>
      <p className="mt-2 text-sm text-ableton-subtle">
        Pigeon Box detected adult or explicit content in the subject, sender, or preview. The message cannot be
        opened or read here.
      </p>
      <p className="mt-3 text-xs text-ableton-muted">
        You can remove it from your inbox without viewing the contents.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="ableton-btn" disabled={loading} onClick={onTrash}>
          Move to trash
        </button>
        <button type="button" className="ableton-btn border-red-800 text-red-300" disabled={loading} onClick={onSpam}>
          Report spam
        </button>
      </div>
    </div>
  );
}
