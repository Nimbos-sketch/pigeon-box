"use client";

import { useEffect, useState } from "react";

type SettingsState = {
  displayName: string;
  signature: string;
  replyBehavior: "reply" | "replyAll";
  forwardPrefix: string;
  autoBcc: string;
  vacationEnabled: boolean;
  vacationMessage: string;
};

type ForwardingAddress = {
  forwardingEmail?: string | null;
  verificationStatus?: string | null;
};

export function SettingsClient() {
  const [settings, setSettings] = useState<SettingsState>({
    displayName: "",
    signature: "",
    replyBehavior: "reply",
    forwardPrefix: "Fwd:",
    autoBcc: "",
    vacationEnabled: false,
    vacationMessage: ""
  });
  const [forwardingAddresses, setForwardingAddresses] = useState<ForwardingAddress[]>([]);
  const [autoForwarding, setAutoForwarding] = useState<{ enabled?: boolean | null; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSettings({
        displayName: data.settings.displayName ?? "",
        signature: data.settings.signature ?? "",
        replyBehavior: data.settings.replyBehavior ?? "reply",
        forwardPrefix: data.settings.forwardPrefix ?? "Fwd:",
        autoBcc: data.settings.autoBcc ?? "",
        vacationEnabled: data.settings.vacationEnabled ?? false,
        vacationMessage: data.settings.vacationMessage ?? ""
      });
      setForwardingAddresses(data.forwardingAddresses ?? []);
      setAutoForwarding(data.autoForwarding ?? null);
      setLoading(false);
    }
    void load();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        displayName: settings.displayName || null,
        signature: settings.signature || null,
        autoBcc: settings.autoBcc || null,
        vacationMessage: settings.vacationMessage || null
      })
    });
    setSaving(false);
    setMessage(res.ok ? "Settings saved." : "Could not save settings.");
  }

  if (loading) {
    return <p className="p-6 text-sm text-ableton-muted">Loading settings...</p>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <form onSubmit={handleSave} className="ableton-panel">
        <div className="ableton-panel-header">Identity & Compose</div>
        <div className="space-y-3 p-4">
          <input
            className="ableton-input w-full"
            placeholder="Display name"
            value={settings.displayName}
            onChange={(e) => setSettings((s) => ({ ...s, displayName: e.target.value }))}
          />
          <textarea
            className="ableton-input min-h-[100px] w-full"
            placeholder="Email signature"
            value={settings.signature}
            onChange={(e) => setSettings((s) => ({ ...s, signature: e.target.value }))}
          />
          <input
            className="ableton-input w-full"
            placeholder="Auto Bcc"
            value={settings.autoBcc}
            onChange={(e) => setSettings((s) => ({ ...s, autoBcc: e.target.value }))}
          />
          <select
            className="ableton-input w-full"
            value={settings.replyBehavior}
            onChange={(e) => setSettings((s) => ({ ...s, replyBehavior: e.target.value as "reply" | "replyAll" }))}
          >
            <option value="reply">Reply behavior: Reply</option>
            <option value="replyAll">Reply behavior: Reply all</option>
          </select>
          <input
            className="ableton-input w-full"
            placeholder="Forward subject prefix"
            value={settings.forwardPrefix}
            onChange={(e) => setSettings((s) => ({ ...s, forwardPrefix: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.vacationEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, vacationEnabled: e.target.checked }))}
            />
            Vacation responder (stored locally; Gmail sync coming)
          </label>
          <textarea
            className="ableton-input min-h-[80px] w-full"
            placeholder="Vacation message"
            value={settings.vacationMessage}
            onChange={(e) => setSettings((s) => ({ ...s, vacationMessage: e.target.value }))}
          />
          {message ? <p className="text-sm text-ableton-orange">{message}</p> : null}
          <button type="submit" className="ableton-btn ableton-btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>

      <section className="ableton-panel">
        <div className="ableton-panel-header">Gmail Forwarding</div>
        <div className="space-y-2 p-4 text-sm text-ableton-muted">
          {autoForwarding?.enabled ? (
            <p>
              Auto-forward enabled to <span className="text-ableton-text">{autoForwarding.email}</span>
            </p>
          ) : (
            <p>Auto-forward is off in Gmail.</p>
          )}
          {forwardingAddresses.length === 0 ? (
            <p>No forwarding addresses configured in Gmail.</p>
          ) : (
            forwardingAddresses.map((item) => (
              <p key={item.forwardingEmail ?? "unknown"}>
                {item.forwardingEmail} · {item.verificationStatus}
              </p>
            ))
          )}
          <p className="text-xs">Manage forwarding in Gmail Settings → Forwarding and POP/IMAP.</p>
        </div>
      </section>
    </main>
  );
}
