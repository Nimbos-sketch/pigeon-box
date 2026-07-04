import type { AutoHandledSummary } from "@/server/sender-rules/service";

type SmartHandlingBannerProps = {
  autoHandled: AutoHandledSummary[];
  onDismiss: () => void;
};

function describeAction(item: AutoHandledSummary): string {
  switch (item.action) {
    case "spam":
      return "spammed";
    case "trash":
      return "trashed";
    case "archive":
      return "archived";
    case "file":
      return item.folderName ? `filed to ${item.folderName}` : "filed";
    default:
      return "handled";
  }
}

export function SmartHandlingBanner({ autoHandled, onDismiss }: SmartHandlingBannerProps) {
  if (autoHandled.length === 0) {
    return null;
  }

  const bySender = autoHandled.reduce<Record<string, AutoHandledSummary[]>>((groups, item) => {
    const bucket = groups[item.senderKey] ?? [];
    bucket.push(item);
    groups[item.senderKey] = bucket;
    return groups;
  }, {});

  return (
    <div className="mb-4 border border-ableton-lime/50 bg-ableton-pane2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-lime">
            Smart auto-handle
          </p>
          <p className="mt-1 text-sm text-ableton-text">
            Pigeon Box cleared {autoHandled.length} repeat email{autoHandled.length === 1 ? "" : "s"} you trained
            after 3 identical actions.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-ableton-muted">
            {Object.values(bySender).map((items) => {
              const sample = items[0];
              return (
                <li key={sample.senderKey}>
                  {items.length} from {sample.senderLabel} — {describeAction(sample)}
                </li>
              );
            })}
          </ul>
        </div>
        <button type="button" className="ableton-btn text-xs" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
