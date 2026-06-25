"use client";

import type { EmailFolder } from "@/components/inbox/folder-manager";

type FileToFolderProps = {
  folders: EmailFolder[];
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onFile: () => void;
  canFile: boolean;
  filing: boolean;
  required?: boolean;
};

export function FileToFolder({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFile,
  canFile,
  filing,
  required = false
}: FileToFolderProps) {
  if (folders.length === 0) {
    return (
      <div className="mb-4 border border-ableton-orange/50 bg-ableton-pane2 p-3">
        <p className="text-sm text-ableton-text">Create a folder above before you can file this email.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 border border-ableton-orange/50 bg-ableton-pane2 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">
        {required ? "Required · File to folder" : "File to folder"}
      </p>
      <p className="mb-3 text-xs text-ableton-muted">
        {required
          ? "Choose a folder and file this email to unlock the next message."
          : "Move this email out of the inbox into one of your folders."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="ableton-input flex-1"
          value={selectedFolderId}
          onChange={(e) => onFolderSelect(e.target.value)}
        >
          <option value="">Choose folder...</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ableton-btn ableton-btn-primary px-5"
          disabled={!canFile || !selectedFolderId || filing}
          onClick={onFile}
        >
          {filing ? "Filing..." : "File email"}
        </button>
      </div>
    </div>
  );
}
