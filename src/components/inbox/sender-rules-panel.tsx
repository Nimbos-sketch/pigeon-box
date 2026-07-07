"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTO_APPLY_THRESHOLD, type SenderActionType, type SenderRuleView } from "@/lib/sender-rules";
import type { EmailFolder } from "@/components/inbox/folder-manager";

const ACTION_LABELS: Record<SenderActionType, string> = {
  archive: "Archive",
  trash: "Trash",
  spam: "Spam",
  file: "File to folder"
};

type SenderRulesPanelProps = {
  folders: EmailFolder[];
  onRulesChange?: () => void;
};

export function SenderRulesPanel({ folders, onRulesChange }: SenderRulesPanelProps) {
  const [rules, setRules] = useState<SenderRuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rules");
      if (!res.ok) {
        throw new Error("Could not load rules");
      }
      const data = (await res.json()) as { rules?: SenderRuleView[] };
      setRules(data.rules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  async function patchRule(ruleId: string, patch: { autoApply?: boolean; preferredAction?: SenderActionType; folderId?: string | null }) {
    setSavingId(ruleId);
    setError(null);
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!res.ok) {
        throw new Error("Could not update rule");
      }
      const data = (await res.json()) as { rule: SenderRuleView };
      setRules((current) => current.map((rule) => (rule.id === ruleId ? data.rule : rule)));
      onRulesChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update rule");
    } finally {
      setSavingId(null);
    }
  }

  async function removeRule(ruleId: string) {
    setSavingId(ruleId);
    setError(null);
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Could not delete rule");
      }
      setRules((current) => current.filter((rule) => rule.id !== ruleId));
      onRulesChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="border-t border-ableton-border pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">Sender rules</p>
        <button type="button" className="ableton-btn px-2 py-0.5 text-[10px]" onClick={() => void loadRules()} disabled={loading}>
          Refresh
        </button>
      </div>
      <p className="mb-3 text-xs text-ableton-muted">
        Rules learn from your actions. After {AUTO_APPLY_THRESHOLD} identical actions from a sender, auto-handle turns on.
        Toggle or edit rules below.
      </p>

      {loading ? <p className="text-xs text-ableton-muted">Loading rules...</p> : null}
      {error ? <p className="mb-2 text-xs text-red-300">{error}</p> : null}

      {!loading && rules.length === 0 ? (
        <p className="text-xs text-ableton-muted">No rules yet. File, archive, trash, or spam emails to teach the system.</p>
      ) : null}

      <ul className="space-y-2">
        {rules.map((rule) => {
          const busy = savingId === rule.id;
          return (
            <li key={rule.id} className="border border-ableton-border bg-ableton-pane2 p-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ableton-text">{rule.senderLabel}</p>
                  <p className="font-mono text-[10px] text-ableton-muted">{rule.senderKey}</p>
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-ableton-muted">
                  <input
                    type="checkbox"
                    checked={rule.autoApply}
                    disabled={busy}
                    onChange={(e) => void patchRule(rule.id, { autoApply: e.target.checked })}
                  />
                  Auto
                </label>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  className="ableton-input min-w-[7rem] py-1 text-xs"
                  value={rule.preferredAction}
                  disabled={busy}
                  onChange={(e) => {
                    const preferredAction = e.target.value as SenderActionType;
                    void patchRule(rule.id, {
                      preferredAction,
                      folderId: preferredAction === "file" ? rule.folderId : null
                    });
                  }}
                >
                  {(Object.keys(ACTION_LABELS) as SenderActionType[]).map((action) => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </option>
                  ))}
                </select>

                {rule.preferredAction === "file" ? (
                  <select
                    className="ableton-input min-w-[7rem] flex-1 py-1 text-xs"
                    value={rule.folderId ?? ""}
                    disabled={busy || folders.length === 0}
                    onChange={(e) => void patchRule(rule.id, { folderId: e.target.value || null })}
                  >
                    <option value="">Choose folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                ) : null}

                <button
                  type="button"
                  className="ableton-btn border-red-800 px-2 py-1 text-[10px] text-red-300 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void removeRule(rule.id)}
                >
                  Delete
                </button>
              </div>

              <p className="mt-1.5 text-[10px] text-ableton-muted">
                {rule.autoApply
                  ? "Auto-handle is ON for this sender."
                  : rule.actionsUntilAuto > 0
                    ? `${rule.actionsUntilAuto} more ${rule.preferredAction} action(s) until auto-handle.`
                    : `${rule.actionCount} action(s) recorded.`}
                {rule.preferredAction === "file" && rule.folderName ? (
                  <span style={{ color: rule.folderColor ?? undefined }}> → {rule.folderName}</span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
