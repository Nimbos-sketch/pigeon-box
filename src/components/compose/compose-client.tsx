"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ComposeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const messageId = searchParams.get("id");

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!messageId || (mode !== "reply" && mode !== "forward")) return;
    async function loadPrefill() {
      const res = await fetch(`/api/messages/${messageId}/compose?mode=${mode}`);
      if (!res.ok) return;
      const data = await res.json();
      setTo(data.prefill.to ?? "");
      setSubject(data.prefill.subject ?? "");
      setBody(data.prefill.body ?? "");
      setThreadId(data.prefill.threadId);
    }
    void loadPrefill();
  }, [messageId, mode]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (mode === "reply" && messageId) {
        res = await fetch(`/api/messages/${messageId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, cc: cc || undefined, body })
        });
      } else if (mode === "forward" && messageId) {
        res = await fetch(`/api/messages/${messageId}/forward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, cc: cc || undefined, body })
        });
      } else {
        res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, cc: cc || undefined, subject, body, threadId })
        });
      }
      if (!res.ok) throw new Error("Failed to send email");
      router.push("/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="ableton-panel">
        <div className="ableton-panel-header">
          {mode === "reply" ? "Reply" : mode === "forward" ? "Forward" : "New Message"}
        </div>
        <form onSubmit={handleSend} className="space-y-3 p-4">
          <input className="ableton-input w-full" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} required />
          <input className="ableton-input w-full" placeholder="Cc" value={cc} onChange={(e) => setCc(e.target.value)} />
          <input
            className="ableton-input w-full"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            disabled={mode === "reply"}
          />
          <textarea
            className="ableton-input min-h-[280px] w-full"
            placeholder="Message body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" className="ableton-btn ableton-btn-primary" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
            <button type="button" className="ableton-btn" onClick={() => router.push("/inbox")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
