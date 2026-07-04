import type { EmailFolder } from "@/components/inbox/folder-manager";

type FolderBinsProps = {
  folders: EmailFolder[];
  onFile: (folderId: string) => void;
  onArchive: () => void;
  filing: boolean;
  compact?: boolean;
  suggestedFolderId?: string | null;
};

export function FolderBins({ folders, onFile, onArchive, filing, compact = false, suggestedFolderId = null }: FolderBinsProps) {
  if (compact) {
    return (
      <div className="border border-ableton-lime/50 bg-ableton-pane2 p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-lime">File or archive</p>
        {folders.length > 0 ? (
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {folders.map((folder, index) => (
              <button
                key={folder.id}
                type="button"
                disabled={filing}
                className={`pigeon-cell min-w-[4.75rem] shrink-0 px-1.5 py-1.5 text-center disabled:opacity-60 ${
                  folder.id === suggestedFolderId ? "pigeon-cell-selected" : ""
                }`}
                onClick={() => onFile(folder.id)}
              >
                <p className="pigeon-slot-id">F{String(index + 1).padStart(2, "0")}</p>
                <span className="mx-auto mt-0.5 block h-1 w-full max-w-[2.5rem]" style={{ backgroundColor: folder.color }} aria-hidden />
                <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase" style={{ color: folder.color }}>
                  {folder.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-ableton-muted">No folders yet.</p>
        )}
        <button type="button" disabled={filing} className="ableton-btn mt-1.5 w-full text-[11px] py-2 disabled:opacity-60" onClick={onArchive}>
          {filing ? "Working..." : "Archive"}
        </button>
      </div>
    );
  }

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
              className={`pigeon-cell text-center disabled:opacity-60 ${
                folder.id === suggestedFolderId ? "pigeon-cell-selected" : ""
              }`}
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
