"use client";

import { useState } from "react";
import { FolderColorPicker } from "@/components/inbox/folder-color-picker";
import { DEFAULT_FOLDER_COLOR } from "@/lib/folder-colors";

export type EmailFolder = {
  id: string;
  name: string;
  gmailLabelId: string;
  color: string;
};

type FolderManagerProps = {
  folders: EmailFolder[];
  selectedFolderId: string | null;
  onFolderViewChange: (folderId: string | null) => void;
  onFolderCreated: (folder: EmailFolder) => void;
  onFolderColorChange: (folderId: string, color: string) => void;
};

export function FolderManager({
  folders,
  selectedFolderId,
  onFolderViewChange,
  onFolderCreated,
  onFolderColorChange
}: FolderManagerProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>(DEFAULT_FOLDER_COLOR);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;

  async function handleCreateFolder(event: React.FormEvent) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newFolderColor })
      });
      if (!response.ok) {
        throw new Error("Could not create folder");
      }
      const data = (await response.json()) as { folder: EmailFolder };
      onFolderCreated(data.folder);
      setNewFolderName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onFolderViewChange(null)}
          className={`ableton-chip ${selectedFolderId === null ? "ableton-chip-active" : ""}`}
        >
          Inbox
        </button>
        {folders.map((folder) => {
          const isActive = folder.id === selectedFolderId;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onFolderViewChange(folder.id)}
              className={`ableton-chip border-l-[3px] ${isActive ? "ableton-chip-active" : ""}`}
              style={{ borderLeftColor: folder.color }}
            >
              {folder.name}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleCreateFolder} className="flex flex-wrap items-center gap-2">
        <input
          className="ableton-input min-w-[10rem] flex-1"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          maxLength={64}
          aria-label="New folder name"
        />
        <FolderColorPicker compact value={newFolderColor} onChange={setNewFolderColor} />
        <button
          type="submit"
          disabled={creating || !newFolderName.trim()}
          className="ableton-btn ableton-btn-primary shrink-0 px-4 disabled:opacity-60"
        >
          {creating ? "..." : "Create"}
        </button>
      </form>

      {activeFolder ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-ableton-border pt-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">{activeFolder.name} colour</span>
          <FolderColorPicker
            compact
            value={activeFolder.color}
            onChange={(color) => onFolderColorChange(activeFolder.id, color)}
          />
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {folders.length === 0 ? (
        <p className="text-xs text-ableton-muted">
          Add colour-coded folders for action routing. Same-sender auto-handle kicks in after 3 identical actions.
        </p>
      ) : null}
    </div>
  );
}
