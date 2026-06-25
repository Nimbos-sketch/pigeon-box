"use client";

import { useEffect, useMemo, useState } from "react";
import { AiOverview } from "@/components/inbox/ai-overview";
import { getOverviewFilter, type OverviewFilterId } from "@/lib/overview-filters";

type Message = {
  gmailId: string;
  subject: string | null;
  fromAddress: string | null;
  snippet: string | null;
  isUnread: boolean;
  internalDate: string | null;
};

type Label = {
  id: string;
  name: string;
};

export function InboxClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [totalEstimate, setTotalEstimate] = useState<number | null>(null);
  const [summaryFilter, setSummaryFilter] = useState<OverviewFilterId>("all");

  const selected = useMemo(
    () => messages.find((message) => message.gmailId === selectedId) ?? null,
    [messages, selectedId]
  );

  function buildInboxUrl(pageToken?: string, queryOverride?: string) {
    const params = new URLSearchParams();
    const query = (queryOverride ?? search.trim()) || "in:inbox";
    params.set("q", query);
    if (pageToken) {
      params.set("pageToken", pageToken);
    }
    return `/api/inbox?${params.toString()}`;
  }

  async function loadInbox(pageToken?: string, queryOverride?: string) {
    const isLoadMore = Boolean(pageToken);
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const requests = [fetch(buildInboxUrl(pageToken, queryOverride))];
      if (!isLoadMore) {
        requests.push(fetch("/api/labels"));
      }

      const [messagesRes, labelsRes] = await Promise.all(requests);
      if (!messagesRes.ok || (!isLoadMore && labelsRes && !labelsRes.ok)) {
        throw new Error("Failed to load inbox");
      }

      const messagesJson = await messagesRes.json();
      const incoming: Message[] = messagesJson.messages ?? [];

      setMessages((current) => {
        if (!isLoadMore) {
          return incoming;
        }
        const seen = new Set(current.map((message) => message.gmailId));
        const merged = [...current];
        for (const message of incoming) {
          if (!seen.has(message.gmailId)) {
            merged.push(message);
          }
        }
        return merged;
      });

      setNextPageToken(messagesJson.nextPageToken ?? null);
      setTotalEstimate(messagesJson.resultSizeEstimate ?? null);

      if (!isLoadMore) {
        const labelsJson = await labelsRes!.json();
        setLabels(labelsJson.labels);
        if (incoming.length > 0) {
          setSelectedId(incoming[0].gmailId);
        } else {
          setSelectedId(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown inbox error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function applyAction(action: "archive" | "read" | "unread" | "star" | "unstar", messageId: string) {
    const previous = messages;
    setMessages((current) =>
      current.map((msg) =>
        msg.gmailId !== messageId
          ? msg
          : {
              ...msg,
              isUnread: action === "read" ? false : action === "unread" ? true : msg.isUnread
            }
      )
    );
    try {
      const res = await fetch(`/api/messages/${messageId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        throw new Error("Failed to update message");
      }
    } catch {
      setMessages(previous);
      setError("Could not apply message action");
    }
  }

  function handleSummaryFilterChange(filterId: OverviewFilterId) {
    setSummaryFilter(filterId);
    const filter = getOverviewFilter(filterId);
    setSearch(filter.gmailQuery);
    void loadInbox(undefined, filter.gmailQuery);
  }

  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial inbox load only
  }, []);

  return (
    <main className="mx-auto max-w-7xl p-4">
      <AiOverview
        selectedFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
        onSelectMessage={(messageId) => setSelectedId(messageId)}
      />

      <div className="ableton-panel mb-4">
        <div className="ableton-panel-header">Transport · Inbox</div>
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Inbox Organizer</h1>
            <p className="mt-1 font-mono text-[11px] text-ableton-muted">
              TRACKS {messages.length}
              {totalEstimate !== null ? ` / ~${totalEstimate}` : ""}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadInbox();
            }}
            className="flex w-full max-w-xl gap-2"
          >
            <input
              className="ableton-input flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gmail query..."
            />
            <button className="ableton-btn ableton-btn-primary px-5" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>

      {error ? (
        <p className="mb-4 border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mb-4 border border-ableton-border bg-ableton-pane2 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">Labels</p>
        <p className="mt-1 text-xs text-ableton-text">
          {labels.slice(0, 12).map((label) => label.name).join(" · ") || "No labels loaded"}
        </p>
      </div>

      <div className="grid min-h-[600px] grid-cols-1 gap-3 lg:grid-cols-[380px_1fr]">
        <section className="ableton-panel">
          <div className="ableton-panel-header">Session View · Messages</div>
          <div className="max-h-[640px] overflow-y-auto p-2">
            {loading ? (
              <p className="p-3 text-sm text-ableton-muted">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="p-3 text-sm text-ableton-muted">No messages found.</p>
            ) : (
              <>
                {messages.map((message) => {
                  const isSelected = message.gmailId === selectedId;
                  return (
                    <button
                      type="button"
                      key={message.gmailId}
                      onClick={() => setSelectedId(message.gmailId)}
                      className={`mb-2 w-full border p-3 text-left transition ${
                        isSelected
                          ? "border-ableton-orange bg-ableton-pane2"
                          : "border-ableton-border bg-ableton-canvas hover:border-ableton-borderLight"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {message.isUnread ? <span className="h-2 w-2 bg-ableton-lime" /> : <span className="h-2 w-2 bg-ableton-border" />}
                        <p className="truncate text-sm font-medium">{message.subject ?? "(No subject)"}</p>
                      </div>
                      <p className="truncate text-xs text-ableton-muted">{message.fromAddress ?? "Unknown sender"}</p>
                      <p className="truncate text-xs text-ableton-borderLight">{message.snippet ?? ""}</p>
                    </button>
                  );
                })}
                {nextPageToken ? (
                  <button
                    type="button"
                    onClick={() => void loadInbox(nextPageToken)}
                    disabled={loadingMore}
                    className="ableton-btn mt-2 w-full py-2 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading more..." : "Load more emails"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className="ableton-panel">
          <div className="ableton-panel-header">Detail View</div>
          <div className="p-4">
            {selected ? (
              <>
                <h2 className="mb-2 text-xl font-semibold">{selected.subject ?? "(No subject)"}</h2>
                <p className="mb-1 text-sm text-ableton-muted">{selected.fromAddress ?? "Unknown sender"}</p>
                <p className="mb-4 font-mono text-[11px] text-ableton-orange">
                  {selected.internalDate ? new Date(selected.internalDate).toLocaleString() : "No timestamp"}
                </p>
                <div className="mb-6 border border-ableton-border bg-ableton-canvas p-4 text-sm leading-relaxed text-ableton-text">
                  {selected.snippet ?? "No preview available"}
                </div>
              <div className="flex flex-wrap gap-2">
                <a className="ableton-btn" href={`/compose?mode=reply&id=${selected.gmailId}`}>
                  Reply
                </a>
                <a className="ableton-btn" href={`/compose?mode=forward&id=${selected.gmailId}`}>
                  Forward
                </a>
                <button className="ableton-btn" onClick={() => applyAction("archive", selected.gmailId)}>
                    Archive
                  </button>
                  <button className="ableton-btn" onClick={() => applyAction("read", selected.gmailId)}>
                    Mark read
                  </button>
                  <button className="ableton-btn" onClick={() => applyAction("unread", selected.gmailId)}>
                    Mark unread
                  </button>
                  <button className="ableton-btn" onClick={() => applyAction("star", selected.gmailId)}>
                    Star
                  </button>
                  <button className="ableton-btn" onClick={() => applyAction("unstar", selected.gmailId)}>
                    Unstar
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-ableton-muted">Select a message clip to view details.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
