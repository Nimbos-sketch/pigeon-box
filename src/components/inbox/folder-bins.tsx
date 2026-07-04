import type { EmailFolder } from "@/components/inbox/folder-manager";

type FolderBinsProps = {
  folders: EmailFolder[];
  onFile: (folderId: string) => void;
  onArchive: () => void;
  filing: boolean;
};

export function FolderBins({ folders, onFile, onArchive, filing }: FolderBinsProps) {
  return (
    <div className="mb-6 border border-ableton-lime/50 bg-ableton-pane2 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-lime">
        File into grid slot
      </p>
      <p className="mt-2 text-xs text-ableton-muted">Pick a folder cell or archive without filing.</p>
      {folders.length > 0 ? (
        <div className="pigeon-grid pigeon-grid-folders mt-3">
          {folders.map((folder, index) => (
            <button
              key={folder.id}
              type="button"
              disabled={filing}
              className="pigeon-cell text-center disabled:opacity-60"
              onClick={() => onFile(folder.id)}
            >
              <p className="pigeon-slot-id">F{String(index + 1).padStart(2, "0")}</p>
              <span
                className="mx-auto mt-2 block h-2 w-full max-w-[4rem]"
                style={{ backgroundColor: folder.color }}
                aria-hidden
              />
              <span className="mt-2 block truncate text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: folder.color }}>
                {folder.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ableton-text">Create a folder above, or archive this email.</p>
      )}
      <button type="button" disabled={filing} className="ableton-btn mt-4 disabled:opacity-60" onClick={onArchive}>
        {filing ? "Working..." : "Archive (empty slot)"}
      </button>
    </div>
  );
}
