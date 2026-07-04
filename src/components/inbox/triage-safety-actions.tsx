type TriageSafetyActionsProps = {
  onTrash: () => void;
  onSpam: () => void;
  compact?: boolean;
};

export function TriageSafetyActions({ onTrash, onSpam, compact = false }: TriageSafetyActionsProps) {
  return (
    <div className={`flex gap-1.5 ${compact ? "" : "mt-3"}`}>
      <button
        type="button"
        className={`ableton-btn flex-1 border-red-800 text-red-300 ${compact ? "py-2 text-[11px]" : ""}`}
        onClick={onTrash}
      >
        Trash
      </button>
      <button
        type="button"
        className={`ableton-btn flex-1 border-red-800 text-red-300 ${compact ? "py-2 text-[11px]" : ""}`}
        onClick={onSpam}
      >
        Spam
      </button>
    </div>
  );
}
