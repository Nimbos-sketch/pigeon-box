"use client";

import { useState } from "react";
import { FolderColorPicker } from "@/components/inbox/folder-color-picker";
import { SenderRulesPanel } from "@/components/inbox/sender-rules-panel";
import { DEFAULT_FOLDER_COLOR } from "@/lib/folder-colors";

export type EmailFolder = {
  id: string;
  name: string;
  gmailLabelId: string;
  color: string;
  ruleCount?: number;
};

type FolderManagerProps = {
  folders: EmailFolder[];
  selectedFolderId: string | null;
  onFolderViewChange: (folderId: string | null) => void;
  onFolderCreated: (folder: EmailFolder) => void;
  onFolderColorChange: (folderId: string, color: string) => void;
  onFolderDeleted?: (folderId: string) => void;
  onRulesChange?: () => void;
};

export function FolderManager({
  folders,
  selectedFolderId,
  onFolderViewChange,
  onFolderCreated,
  onFolderColorChange,
  onFolderDeleted,
  onRulesChange
}: FolderManagerProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>(DEFAULT_FOLDER_COLOR);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  async function handleDeleteFolder(folderId: string) {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }
    if (!window.confirm(`Delete folder "${folder.name}"? Linked sender rules will lose their folder target.`)) {
      return;
    }

    setDeletingId(folderId);
    setError(null);
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Could not delete folder");
      }
      onFolderDeleted?.(folderId);
      onRulesChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete folder");
    } finally {
      setDeletingId(null);
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
              title={folder.ruleCount ? `${folder.ruleCount} sender rule(s)` : undefined}
            >
              {folder.name}
              {folder.ruleCount ? (
                <span className="ml-1 font-mono text-[9px] text-ableton-muted">({folder.ruleCount})</span>
              ) : null}
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
          <span className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">{activeFolder.name}</span>
          <FolderColorPicker
            compact
            value={activeFolder.color}
            onChange={(color) => onFolderColorChange(activeFolder.id, color)}
          />
          <button
            type="button"
            className="ableton-btn border-red-800 px-2 py-1 text-[10px] text-red-300 disabled:opacity-60"
            disabled={deletingId === activeFolder.id}
            onClick={() => void handleDeleteFolder(activeFolder.id)}
          >
            {deletingId === activeFolder.id ? "Deleting..." : "Delete folder"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {folders.length === 0 ? (
        <p className="text-xs text-ableton-muted">
          Create colour-coded folders for filing. Sender rules learn from repeated actions.
        </p>
      ) : null}

      <SenderRulesPanel folders={folders} onRulesChange={onRulesChange} />
    </div>
  );
}
