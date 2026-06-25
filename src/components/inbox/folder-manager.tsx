"use client";

import { useState } from "react";

export type EmailFolder = {
  id: string;
  name: string;
  gmailLabelId: string;
};

type FolderManagerProps = {
  folders: EmailFolder[];
  selectedFolderId: string | null;
  onFolderViewChange: (folderId: string | null) => void;
  onFolderCreated: (folder: EmailFolder) => void;
};

export function FolderManager({
  folders,
  selectedFolderId,
  onFolderViewChange,
  onFolderCreated
}: FolderManagerProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ name })
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
    <div className="ableton-panel mb-4">
      <div className="ableton-panel-header">Folders</div>
      <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="folder-view" className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-ableton-muted">
            View folder
          </label>
          <select
            id="folder-view"
            className="ableton-input w-full"
            value={selectedFolderId ?? ""}
            onChange={(e) => onFolderViewChange(e.target.value || null)}
          >
            <option value="">Inbox (unfiled)</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCreateFolder} className="flex flex-1 gap-2">
          <div className="flex-1">
            <label htmlFor="new-folder" className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-ableton-muted">
              New folder
            </label>
            <input
              id="new-folder"
              className="ableton-input w-full"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Clients, Finance, Projects"
              maxLength={64}
            />
          </div>
          <button type="submit" disabled={creating || !newFolderName.trim()} className="ableton-btn ableton-btn-primary mt-5 px-4">
            {creating ? "..." : "Create"}
          </button>
        </form>
      </div>
      {error ? <p className="px-3 pb-3 text-xs text-red-300">{error}</p> : null}
      {folders.length === 0 ? (
        <p className="border-t border-ableton-border px-3 py-2 text-xs text-ableton-muted">
          Create folders to organise read emails. After reading, file each message before opening the next one.
        </p>
      ) : null}
    </div>
  );
}
