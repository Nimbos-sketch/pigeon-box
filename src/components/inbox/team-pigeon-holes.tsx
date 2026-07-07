"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ObligationQueue } from "@/lib/inbox-queues";

type PigeonHole = {
  id: string;
  slotCode: string;
  label: string | null;
  orgId: string;
  orgName: string;
  orgSlug: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  contactEmail: string | null;
  kind: "member" | "contact" | "manual";
  isMine: boolean;
  isContact: boolean;
  isPersonal: boolean;
  isLinkedTeam: boolean;
  unreadCount: number;
};

type HoleMessage = {
  id: string;
  subject: string;
  body: string;
  status: "unread" | "read" | "archived";
  obligationQueue: ObligationQueue;
  senderName: string;
  senderEmail: string | null;
  senderOrgName: string;
  isOutbound: boolean;
  createdAt: string;
};

type TeamLink = {
  id: string;
  status: "pending" | "active" | "rejected";
  direction: "outgoing" | "incoming";
  partnerOrgName: string;
  partnerOrgSlug: string;
  requestedAt: string;
};

type HoleSection = {
  key: string;
  orgName: string;
  isLinked: boolean;
  title: string;
  holes: PigeonHole[];
};

function buildSections(holes: PigeonHole[]): HoleSection[] {
  const byOrg = new Map<string, PigeonHole[]>();
  for (const hole of holes) {
    const list = byOrg.get(hole.orgId) ?? [];
    list.push(hole);
    byOrg.set(hole.orgId, list);
  }

  const sections: HoleSection[] = [];
  for (const [orgId, orgHoles] of byOrg.entries()) {
    const orgName = orgHoles[0]?.orgName ?? "Team";
    const isLinked = orgHoles[0]?.isLinkedTeam ?? false;
    const members = orgHoles.filter((hole) => hole.kind === "member").sort((a, b) => a.slotCode.localeCompare(b.slotCode));
    const contacts = orgHoles
      .filter((hole) => hole.kind !== "member")
      .sort((a, b) => a.slotCode.localeCompare(b.slotCode));

    if (members.length > 0) {
      sections.push({
        key: `${orgId}-members`,
        orgName,
        isLinked,
        title: isLinked ? "Linked team members" : "Team members",
        holes: members
      });
    }
    if (contacts.length > 0) {
      sections.push({
        key: `${orgId}-contacts`,
        orgName,
        isLinked,
        title: isLinked ? "Linked contacts" : "Contacts & email holes",
        holes: contacts
      });
    }
  }

  return sections.sort((a, b) => Number(a.isLinked) - Number(b.isLinked));
}

type PigeonHolesResponse = {
  error?: string;
  org: { name: string; role: "manager" | "member" } | null;
  myHoleId: string | null;
  holes?: PigeonHole[];
};

export function TeamPigeonHoles() {
  const [holes, setHoles] = useState<PigeonHole[]>([]);
  const [orgName, setOrgName] = useState("Team");
  const [orgRole, setOrgRole] = useState<"manager" | "member" | null>(null);
  const [myHoleId, setMyHoleId] = useState<string | null>(null);
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HoleMessage[]>([]);
  const [selectedHole, setSelectedHole] = useState<PigeonHole | null>(null);
  const [links, setLinks] = useState<TeamLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [queue, setQueue] = useState<ObligationQueue>("action");
  const [sending, setSending] = useState(false);
  const [partnerSlug, setPartnerSlug] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createLabel, setCreateLabel] = useState("");
  const [createScope, setCreateScope] = useState<"personal" | "team">("personal");
  const [creating, setCreating] = useState(false);

  const sections = useMemo(() => buildSections(holes), [holes]);
  const totalUnread = useMemo(() => holes.filter((hole) => hole.isMine).reduce((sum, hole) => sum + hole.unreadCount, 0), [holes]);

  const loadHoles = useCallback(async (retryProvision = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = retryProvision ? "/api/org/pigeon-holes?provision=1" : "/api/org/pigeon-holes";
      const response = await fetch(url);
      const raw = await response.text();
      let data: PigeonHolesResponse | null = null;

      try {
        data = raw ? (JSON.parse(raw) as PigeonHolesResponse) : null;
      } catch {
        if (!response.ok) {
          throw new Error(
            response.status === 500
              ? "Server error — stop the dev server (Ctrl+C) and run npm run dev again."
              : `Failed to load team holes (${response.status})`
          );
        }
      }

      if (!response.ok) {
        throw new Error(data?.error ?? `Failed to load team holes (${response.status})`);
      }

      const holes = data?.holes ?? [];
      setOrgName(data?.org?.name ?? "Team");
      setOrgRole(data?.org?.role ?? null);
      setMyHoleId(data?.myHoleId ?? null);
      setHoles(holes);

      if (!retryProvision && data?.org && holes.length === 0) {
        return loadHoles(true);
      }

      return data?.myHoleId ?? null;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    if (orgRole !== "manager") {
      return;
    }
    const response = await fetch("/api/org/team-links");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { links: TeamLink[] };
    setLinks(data.links ?? []);
  }, [orgRole]);

  const loadMessages = useCallback(async (holeId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const response = await fetch(`/api/org/pigeon-holes/${holeId}/messages`);
      if (!response.ok) {
        if (response.status === 404) {
          setMessages([]);
          return;
        }
        throw new Error("Failed to load hole messages");
      }
      const data = (await response.json()) as { hole: PigeonHole; messages: HoleMessage[] };
      setSelectedHole(data.hole);
      setMessages(data.messages);
      for (const message of data.messages) {
        if (message.status === "unread" && data.hole.isMine) {
          void fetch(`/api/org/pigeon-holes/messages/${message.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "read" })
          });
        }
      }
      if (data.hole.isMine) {
        void loadHoles();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [loadHoles]);

  useEffect(() => {
    void loadHoles().then((myId) => {
      if (myId) {
        setSelectedHoleId((current) => current ?? myId);
      }
    });
  }, [loadHoles]);

  useEffect(() => {
    if (orgRole === "manager") {
      void loadLinks();
    }
  }, [orgRole, loadLinks]);

  useEffect(() => {
    if (selectedHoleId) {
      void loadMessages(selectedHoleId);
    }
  }, [selectedHoleId, loadMessages]);

  async function handleSend() {
    if (!selectedHoleId || selectedHole?.isMine) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/org/pigeon-holes/${selectedHoleId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, obligationQueue: queue })
      });
      if (!response.ok) {
        throw new Error("Could not drop message in hole");
      }
      setSubject("");
      setBody("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function archiveMessage(messageId: string) {
    await fetch(`/api/org/pigeon-holes/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" })
    });
    if (selectedHoleId) {
      void loadMessages(selectedHoleId);
    }
  }

  async function createHole(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/org/pigeon-holes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          label: createLabel || undefined,
          scope: createScope
        })
      });
      if (!response.ok) {
        throw new Error("Could not create pigeon hole");
      }
      const data = (await response.json()) as { hole: PigeonHole };
      setCreateEmail("");
      setCreateLabel("");
      await loadHoles();
      setSelectedHoleId(data.hole.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  function renderInboxList() {
    return (
      <ul className="mt-3 space-y-2">
        {messages
          .filter((message) => message.status !== "archived")
          .map((message) => (
            <li key={message.id} className="border border-ableton-border bg-ableton-pane2 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ableton-orange">
                  {message.obligationQueue === "response" ? "Respond" : "Action"}
                </span>
                <span className="font-mono text-[9px] text-ableton-muted">
                  {new Date(message.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-semibold">{message.subject}</p>
              <p className="mt-1 text-xs text-ableton-muted">
                {message.senderName} · {message.senderOrgName}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ableton-text">{message.body}</p>
              <button
                type="button"
                className="ableton-btn mt-3 text-[10px]"
                onClick={() => void archiveMessage(message.id)}
              >
                Archive
              </button>
            </li>
          ))}
      </ul>
    );
  }

  async function requestLink(event: React.FormEvent) {
    event.preventDefault();
    setLinkBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/org/team-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerSlug })
      });
      if (!response.ok) {
        throw new Error("Could not request team link");
      }
      setPartnerSlug("");
      await loadLinks();
      await loadHoles();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Link request failed");
    } finally {
      setLinkBusy(false);
    }
  }

  async function respondToLink(linkId: string, accept: boolean) {
    setLinkBusy(true);
    await fetch(`/api/org/team-links/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept })
    });
    await loadLinks();
    await loadHoles();
    setLinkBusy(false);
  }

  if (loading) {
    return <p className="p-4 text-sm text-ableton-muted">Loading team pigeon holes...</p>;
  }

  return (
    <div className="pigeon-board overflow-hidden">
      <div className="ableton-panel-header flex flex-wrap items-center justify-between gap-2 border-b border-ableton-border">
        <span>Team pigeon holes</span>
        <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-ableton-muted">
          {holes.length} cells · {totalUnread} unread in yours
          {orgName ? ` · ${orgName}` : ""}
        </span>
      </div>

      <div className="border-b border-ableton-border bg-ableton-pane p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-muted">Create pigeon hole</p>
        <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={createHole}>
          <input
            className="ableton-input min-w-[10rem] flex-1"
            type="email"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
            placeholder="person@company.com"
            required
          />
          <input
            className="ableton-input min-w-[8rem] flex-1"
            value={createLabel}
            onChange={(event) => setCreateLabel(event.target.value)}
            placeholder="Label (optional)"
          />
          <select
            className="ableton-input"
            value={createScope}
            onChange={(event) => setCreateScope(event.target.value as "personal" | "team")}
          >
            <option value="personal">My contacts</option>
            {orgRole === "manager" ? <option value="team">Team-wide</option> : null}
          </select>
          <button type="submit" className="ableton-btn ableton-btn-primary" disabled={creating}>
            {creating ? "Creating..." : "Add cell"}
          </button>
        </form>
        <p className="mt-2 text-[10px] text-ableton-muted">
          Your member cell is created automatically on sign-in. Email contacts also appear when you send from Pigeon Box.
        </p>
        {error ? (
          <p className="mt-2 text-xs text-red-300">
            {error}{" "}
            <button type="button" className="underline" onClick={() => void loadHoles()}>
              Retry
            </button>
          </p>
        ) : null}
      </div>

      {holes.length === 0 ? (
        <div className="p-6 text-center">
          {error ? (
            <>
              <p className="text-sm text-red-300">{error}</p>
              {error.includes("Unauthorized") ? (
                <p className="mt-2 text-xs text-ableton-muted">Sign out and sign back in, then reload the grid.</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-ableton-muted">No cells in the grid yet.</p>
              <p className="mt-1 text-xs text-ableton-muted">
                Your member cell is created when you sign in. Add a contact above, or reload the grid below.
              </p>
            </>
          )}
          <button type="button" className="ableton-btn mt-4" onClick={() => void loadHoles(true)}>
            Reload grid
          </button>
        </div>
      ) : (
      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] md:min-h-[360px] lg:min-h-[420px]">
        <div className="max-h-[min(52vh,520px)] overflow-y-auto bg-ableton-border p-px md:max-h-[520px]">
          {sections.map((section) => (
            <div key={section.key} className="mb-px">
              <div className="pigeon-cell pigeon-cell-week">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-muted">
                  {section.title} · {section.orgName}
                </p>
              </div>
              <div className="pigeon-grid pigeon-grid-inbox">
                {section.holes.map((hole) => (
                  <button
                    key={hole.id}
                    type="button"
                    onClick={() => setSelectedHoleId(hole.id)}
                    className={`pigeon-cell flex flex-col text-left ${
                      selectedHoleId === hole.id ? "pigeon-cell-selected" : ""
                    } ${hole.isMine ? "border-t-2 border-t-ableton-orange" : ""} ${
                      hole.isContact ? "border-b-2 border-b-ableton-lime/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="pigeon-slot-id">{hole.slotCode}</span>
                      {hole.unreadCount > 0 ? (
                        <span className="text-[9px] font-bold text-ableton-orange">{hole.unreadCount}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-ableton-text">
                      {hole.isMine && hole.kind === "member" ? "You" : hole.userName}
                    </p>
                    <p className="mt-auto truncate pt-1 text-[10px] text-ableton-muted">
                      {hole.contactEmail ?? hole.userEmail ?? section.orgName}
                    </p>
                    {hole.isContact ? (
                      <p className="text-[9px] uppercase tracking-[0.08em] text-ableton-lime">Email</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pigeon-workspace-pane max-h-[min(52vh,520px)] overflow-y-auto p-4 md:max-h-[520px]">
          {!selectedHole ? (
            <p className="text-sm text-ableton-muted">Select a team cell</p>
          ) : loadingMessages ? (
            <p className="text-sm text-ableton-muted">Opening cell...</p>
          ) : selectedHole.isMine && selectedHole.kind === "member" ? (
            <div>
              <p className="pigeon-slot-id">Your cell · {selectedHole.slotCode}</p>
              <h3 className="mt-1 text-sm font-semibold">Inbox from teammates</h3>
              {messages.length === 0 ? (
                <p className="mt-3 text-xs text-ableton-muted">No messages in your hole yet.</p>
              ) : (
                renderInboxList()
              )}
            </div>
          ) : selectedHole.isMine && selectedHole.isContact ? (
            <div>
              <p className="pigeon-slot-id">
                {selectedHole.slotCode} · {selectedHole.contactEmail}
              </p>
              <h3 className="mt-1 text-sm font-semibold">Your email contact cell</h3>
              <a
                className="ableton-btn ableton-btn-primary mt-3 inline-block text-xs"
                href={`/compose?to=${encodeURIComponent(selectedHole.contactEmail ?? "")}`}
              >
                Email via Pigeon Box
              </a>
              {messages.length === 0 ? (
                <p className="mt-3 text-xs text-ableton-muted">No team notes in this cell yet.</p>
              ) : (
                renderInboxList()
              )}
            </div>
          ) : selectedHole.kind === "manual" && !selectedHole.isPersonal ? (
            <div>
              <p className="pigeon-slot-id">
                {selectedHole.slotCode} · {selectedHole.contactEmail}
              </p>
              <h3 className="mt-1 text-sm font-semibold">Team contact cell</h3>
              <p className="mt-1 text-xs text-ableton-muted">Shared across {orgName}</p>
              {selectedHole.contactEmail ? (
                <a
                  className="ableton-btn ableton-btn-primary mt-3 inline-block text-xs"
                  href={`/compose?to=${encodeURIComponent(selectedHole.contactEmail)}`}
                >
                  Email via Pigeon Box
                </a>
              ) : null}
              {messages.length > 0 ? renderInboxList() : (
                <p className="mt-3 text-xs text-ableton-muted">No team notes yet.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="pigeon-slot-id">
                {selectedHole.slotCode} · {selectedHole.userName}
              </p>
              <h3 className="mt-1 text-sm font-semibold">Drop a message in their hole</h3>
              <p className="mt-1 text-xs text-ableton-muted">
                {selectedHole.isContact && selectedHole.contactEmail
                  ? `Email contact · ${selectedHole.contactEmail}`
                  : selectedHole.isLinkedTeam
                    ? `Cross-team · ${selectedHole.orgName}`
                    : `Same team · ${orgName}`}
              </p>
              {selectedHole.isContact && selectedHole.contactEmail ? (
                <a
                  className="ableton-btn mt-3 inline-block text-xs"
                  href={`/compose?to=${encodeURIComponent(selectedHole.contactEmail)}`}
                >
                  Email them
                </a>
              ) : null}
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <input
                  className="ableton-input w-full"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Subject"
                  required
                />
                <textarea
                  className="ableton-input min-h-[100px] w-full"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Message for their pigeon hole..."
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`ableton-chip ${queue === "response" ? "ableton-chip-active" : ""}`}
                    onClick={() => setQueue("response")}
                  >
                    Respond
                  </button>
                  <button
                    type="button"
                    className={`ableton-chip ${queue === "action" ? "ableton-chip-active" : ""}`}
                    onClick={() => setQueue("action")}
                  >
                    Action
                  </button>
                </div>
                <button type="submit" className="ableton-btn ableton-btn-primary w-full" disabled={sending}>
                  {sending ? "Dropping..." : "Drop in hole"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      )}

      {orgRole === "manager" ? (
        <div className="border-t border-ableton-border bg-ableton-pane2 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-lime">
            Manage team links
          </p>
          <p className="mt-1 text-xs text-ableton-muted">
            Link another team by org slug so members can message each other&apos;s pigeon holes.
          </p>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={requestLink}>
            <input
              className="ableton-input min-w-[12rem] flex-1"
              value={partnerSlug}
              onChange={(event) => setPartnerSlug(event.target.value)}
              placeholder="Partner org slug"
            />
            <button type="submit" className="ableton-btn" disabled={linkBusy}>
              Request link
            </button>
          </form>
          {links.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-ableton-border bg-ableton-pane p-2 text-xs"
                >
                  <span>
                    {link.partnerOrgName} ({link.partnerOrgSlug}) · {link.status} · {link.direction}
                  </span>
                  {link.direction === "incoming" && link.status === "pending" ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        className="ableton-btn text-[10px]"
                        disabled={linkBusy}
                        onClick={() => void respondToLink(link.id, true)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="ableton-btn text-[10px]"
                        disabled={linkBusy}
                        onClick={() => void respondToLink(link.id, false)}
                      >
                        Reject
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="border-t border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
