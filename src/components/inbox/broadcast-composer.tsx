"use client";

import { useState } from "react";
import type { NoticeType } from "@/server/overview/types";

const NOTICE_TYPES: { id: NoticeType; label: string }[] = [
  { id: "general", label: "General" },
  { id: "maintenance", label: "Maintenance" },
  { id: "product", label: "Product" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing" },
  { id: "account", label: "Account" }
];

type BroadcastComposerProps = {
  orgName: string;
  onPublished: () => void;
};

export function BroadcastComposer({ orgName, onPublished }: BroadcastComposerProps) {
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("general");
  const [sendEmail, setSendEmail] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault();
    setPublishing(true);
    setError(null);
    try {
      const response = await fetch("/api/org/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, body, noticeType, sendEmail })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not publish notice");
      }
      setHeadline("");
      setBody("");
      onPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <form onSubmit={handlePublish} className="mb-4 border border-ableton-orange/50 bg-ableton-pane2 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">
        Manager · Publish to all boards
      </p>
      <p className="mt-1 text-xs text-ableton-muted">
        Sends a pinned notice to every {orgName} member&apos;s notice board
        {sendEmail ? " and emails the team." : "."}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="ableton-input w-full"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Notice headline"
          maxLength={120}
          required
        />
        <select
          className="ableton-input"
          value={noticeType}
          onChange={(e) => setNoticeType(e.target.value as NoticeType)}
        >
          {NOTICE_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="ableton-input mt-2 min-h-[100px] w-full"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write the update your team should see on their notice boards..."
        maxLength={4000}
        required
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-ableton-subtle">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
        Also email all team members
      </label>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={publishing || !headline.trim() || !body.trim()}
        className="ableton-btn ableton-btn-primary mt-3 px-5 disabled:opacity-60"
      >
        {publishing ? "Publishing..." : "Publish team notice"}
      </button>
    </form>
  );
}
