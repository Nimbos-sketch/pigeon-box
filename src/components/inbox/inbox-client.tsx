"use client";

import { useEffect, useMemo, useState } from "react";
import { AiOverview } from "@/components/inbox/ai-overview";
import { NsfwBlockedPanel } from "@/components/inbox/nsfw-blocked-panel";
import { MailboxNav } from "@/components/inbox/mailbox-nav";
import { FileToFolder } from "@/components/inbox/file-to-folder";
import { FolderManager, type EmailFolder } from "@/components/inbox/folder-manager";
import { InboxTriageBanner } from "@/components/inbox/inbox-triage-banner";
import { WeekGroupedMessageList } from "@/components/inbox/week-grouped-message-list";
import { WeekInboxDigest } from "@/components/inbox/week-inbox-digest";
import { WeekProgress } from "@/components/inbox/week-progress";
import { findWeekGroupForMessage, groupInboxMessagesByWeek } from "@/lib/inbox-week-groups";
import {
  canFileMessage,
  countLockedMessages,
  getUnlockedMessageId,
  hasMessageBeenOpened,
  isMessageLocked,
  isTriageMailbox
} from "@/lib/inbox-triage";
import { getOverviewFilter, type OverviewFilterId } from "@/lib/overview-filters";
import {
  actionRemovesFromView,
  getMailboxActions,
  getMailboxView,
  type MailboxViewId,
  type MessageAction
} from "@/lib/mailbox-views";

type Message = {
  gmailId: string;
  subject: string | null;
  fromAddress: string | null;
  snippet: string | null;
  isUnread: boolean;
  internalDate: string | null;
  isNsfw?: boolean;
};

type Label = {
  id: string;
  name: string;
};

type LoadInboxOptions = {
  pageToken?: string;
  query?: string;
  labelId?: string | null;
};

const ACTION_LABELS: Record<MessageAction, string> = {
  archive: "Archive",
  read: "Mark read",
  unread: "Mark unread",
  star: "Star",
  unstar: "Unstar",
  trash: "Trash",
  restore: "Restore",
  delete_forever: "Delete forever",
  spam: "Report spam",
  not_spam: "Not spam"
};

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const seen = new Set(current.map((message) => message.gmailId));
  const merged = [...current];
  for (const message of incoming) {
    if (!seen.has(message.gmailId)) {
      merged.push(message);
    }
  }
  return merged;
}

export function InboxClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [viewingFolderId, setViewingFolderId] = useState<string | null>(null);
  const [fileTargetFolderId, setFileTargetFolderId] = useState("");
  const [filing, setFiling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("in:inbox");
  const [activeMailbox, setActiveMailbox] = useState<MailboxViewId>("INBOX");
  const [useLabelFilter, setUseLabelFilter] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [totalEstimate, setTotalEstimate] = useState<number | null>(null);
  const [summaryFilter, setSummaryFilter] = useState<OverviewFilterId>("all");
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const [openedMessageIds, setOpenedMessageIds] = useState<Set<string>>(() => new Set());
  const [triageNotice, setTriageNotice] = useState<string | null>(null);

  const triageEnabled = isTriageMailbox(activeMailbox) && viewingFolderId === null;
  const viewingFolder = folders.find((folder) => folder.id === viewingFolderId) ?? null;

  const selected = useMemo(
    () => messages.find((message) => message.gmailId === selectedId) ?? null,
    [messages, selectedId]
  );

  const activeMailboxView = useMemo(() => getMailboxView(activeMailbox), [activeMailbox]);
  const mailboxActions = useMemo(() => getMailboxActions(activeMailbox), [activeMailbox]);
  const weekGroups = useMemo(
    () =>
      groupInboxMessagesByWeek(messages, {
        weekOrder: triageEnabled ? "oldest" : "newest",
        messageOrder: triageEnabled ? "oldest" : "newest"
      }),
    [messages, triageEnabled]
  );
  const unlockedMessageId = useMemo(
    () => (triageEnabled ? getUnlockedMessageId(messages) : null),
    [messages, triageEnabled]
  );
  const unlockedMessage = useMemo(
    () => messages.find((message) => message.gmailId === unlockedMessageId) ?? null,
    [messages, unlockedMessageId]
  );
  const lockedMessageCount = useMemo(
    () => (triageEnabled ? countLockedMessages(messages) : 0),
    [messages, triageEnabled]
  );
  const nsfwCount = useMemo(() => messages.filter((message) => message.isNsfw).length, [messages]);
  const canFileSelected = useMemo(() => {
    if (!selected || viewingFolderId) {
      return false;
    }
    if (triageEnabled) {
      return canFileMessage(selected.gmailId, messages, openedMessageIds);
    }
    return hasMessageBeenOpened(selected, openedMessageIds);
  }, [selected, viewingFolderId, triageEnabled, messages, openedMessageIds]);

  const visibleMailboxActions = useMemo(() => {
    if (triageEnabled) {
      return mailboxActions.filter((action) => action !== "archive");
    }
    return mailboxActions;
  }, [mailboxActions, triageEnabled]);
  const selectedWeekGroup = useMemo(
    () => findWeekGroupForMessage(weekGroups, selectedId),
    [weekGroups, selectedId]
  );

  function focusUnlockedMessage(messageList: Message[]) {
    if (!triageEnabled) {
      return;
    }
    const nextId = getUnlockedMessageId(messageList);
    if (!nextId) {
      setSelectedId(null);
      return;
    }
    setSelectedId(nextId);
    const week = findWeekGroupForMessage(
      groupInboxMessagesByWeek(messageList, { weekOrder: "oldest", messageOrder: "oldest" }),
      nextId
    );
    if (week) {
      setExpandedWeekKey(week.key);
    }
  }

  function jumpToWeek(weekKey: string) {
    setExpandedWeekKey(weekKey);
    requestAnimationFrame(() => {
      const section = document.getElementById(`week-section-${weekKey}`);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleWeekToggle(weekKey: string) {
    setExpandedWeekKey((current) => (current === weekKey ? null : weekKey));
  }

  function handleSelectMessage(messageId: string) {
    const message = messages.find((item) => item.gmailId === messageId);
    if (message?.isNsfw) {
      setTriageNotice("This email is blocked by the NSFW filter and cannot be opened.");
      return;
    }

    if (triageEnabled && isMessageLocked(messageId, messages)) {
      setTriageNotice("Open the oldest unread email first. Already-read emails can be opened to file them.");
      focusUnlockedMessage(messages);
      return;
    }

    setTriageNotice(null);
    const week = findWeekGroupForMessage(weekGroups, messageId);
    if (week) {
      setExpandedWeekKey(week.key);
    }
    setSelectedId(messageId);
    setOpenedMessageIds((current) => {
      const next = new Set(current);
      next.add(messageId);
      return next;
    });
    if (message?.isUnread) {
      void applyAction("read", messageId);
    }
  }

  function handleQuickAction(action: "trash" | "spam", messageId: string) {
    void applyAction(action, messageId);
  }

  function resolveLabelId(options: LoadInboxOptions): string | null {
    if (options.labelId !== undefined) {
      return options.labelId;
    }
    if (viewingFolderId) {
      return folders.find((folder) => folder.id === viewingFolderId)?.gmailLabelId ?? null;
    }
    if (useLabelFilter) {
      return activeMailbox;
    }
    return null;
  }

  function buildInboxUrl(options: LoadInboxOptions = {}) {
    const params = new URLSearchParams();
    const labelId = resolveLabelId(options);

    if (labelId) {
      params.set("labelId", labelId);
    } else {
      const query = (options.query ?? search.trim()) || "in:inbox";
      params.set("q", query);
    }

    if (options.pageToken) {
      params.set("pageToken", options.pageToken);
    }
    return `/api/inbox?${params.toString()}`;
  }

  async function loadInbox(options: LoadInboxOptions = {}) {
    const pageToken = options.pageToken;
    const isLoadMore = Boolean(pageToken);
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const messagesRes = await fetch(buildInboxUrl(options));
      if (!messagesRes.ok) {
        const body = (await messagesRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Failed to load inbox (${messagesRes.status})`);
      }

      const messagesJson = await messagesRes.json();
      const incoming: Message[] = messagesJson.messages ?? [];
      let nextMessages = incoming;

      setMessages((current) => {
        nextMessages = isLoadMore ? mergeMessages(current, incoming) : incoming;
        return nextMessages;
      });

      setNextPageToken(messagesJson.nextPageToken ?? null);
      setTotalEstimate(messagesJson.resultSizeEstimate ?? null);

      if (!isLoadMore) {
        setExpandedWeekKey(null);
        setOpenedMessageIds(new Set());
        setTriageNotice(null);

        const [labelsRes, foldersRes] = await Promise.all([
          fetch("/api/labels"),
          fetch("/api/folders")
        ]);

        if (labelsRes.ok) {
          const labelsJson = await labelsRes.json();
          setLabels(labelsJson.labels ?? []);
        }

        if (foldersRes.ok) {
          const foldersJson = await foldersRes.json();
          setFolders(foldersJson.folders ?? []);
        } else {
          setFolders([]);
        }
      }

      if (triageEnabled) {
        focusUnlockedMessage(nextMessages);
      } else if (!isLoadMore) {
        setSelectedId(nextMessages[0]?.gmailId ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown inbox error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function fileToFolder(messageId: string, folderId: string) {
    if (!folderId) {
      setTriageNotice("Choose a folder before filing this email.");
      return;
    }
    if (triageEnabled && !canFileMessage(messageId, messages, openedMessageIds)) {
      setTriageNotice("Open this email first, then file it into a folder.");
      return;
    }
    if (!triageEnabled) {
      const message = messages.find((m) => m.gmailId === messageId);
      if (!message || !hasMessageBeenOpened(message, openedMessageIds)) {
        setTriageNotice("Open this email before filing it into a folder.");
        return;
      }
    }

    const previous = messages;
    const previousSelectedId = selectedId;
    setFiling(true);
    setError(null);

    try {
      const res = await fetch(`/api/messages/${messageId}/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId })
      });
      if (!res.ok) {
        throw new Error("Failed to file message");
      }

      setMessages((current) => {
        const next = current.filter((msg) => msg.gmailId !== messageId);
        setOpenedMessageIds((opened) => {
          const updated = new Set(opened);
          updated.delete(messageId);
          return updated;
        });
        if (triageEnabled) {
          focusUnlockedMessage(next);
        } else if (selectedId === messageId) {
          setSelectedId(next[0]?.gmailId ?? null);
        }
        return next;
      });
      setTriageNotice(null);
      setFileTargetFolderId(folderId);
    } catch {
      setMessages(previous);
      setSelectedId(previousSelectedId);
      setError("Could not file message into folder");
    } finally {
      setFiling(false);
    }
  }

  async function applyAction(action: MessageAction, messageId: string) {
    const requiresReadFirst =
      triageEnabled && (action === "archive" || action === "trash" || action === "spam");
    if (requiresReadFirst && !canFileMessage(messageId, messages, openedMessageIds)) {
      setTriageNotice("Open this email first, then file it into a folder.");
      return;
    }

    const previous = messages;
    const previousSelectedId = selectedId;

    if (action !== "delete_forever") {
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
    }

    try {
      const res = await fetch(`/api/messages/${messageId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        throw new Error("Failed to update message");
      }

      if (actionRemovesFromView(action, activeMailbox)) {
        setMessages((current) => {
          const next = current.filter((msg) => msg.gmailId !== messageId);
          if (isTriageMailbox(activeMailbox)) {
            setOpenedMessageIds((opened) => {
              const updated = new Set(opened);
              updated.delete(messageId);
              return updated;
            });
            focusUnlockedMessage(next);
          } else if (selectedId === messageId) {
            setSelectedId(next[0]?.gmailId ?? null);
          }
          return next;
        });
        if (action === "archive" && triageEnabled) {
          setTriageNotice(null);
        }
      }
    } catch {
      setMessages(previous);
      setSelectedId(previousSelectedId);
      setError("Could not apply message action");
    }
  }

  function handleMailboxChange(mailboxId: MailboxViewId) {
    setViewingFolderId(null);
    const view = getMailboxView(mailboxId);
    setActiveMailbox(mailboxId);
    setUseLabelFilter(true);
    setSearch(view.gmailQuery);
    void loadInbox({ labelId: mailboxId });
  }

  function handleFolderViewChange(folderId: string | null) {
    setViewingFolderId(folderId);
    setTriageNotice(null);
    if (!folderId) {
      setUseLabelFilter(true);
      setActiveMailbox("INBOX");
      setSearch("in:inbox");
      void loadInbox({ labelId: "INBOX" });
      return;
    }
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }
    setUseLabelFilter(false);
    setSearch(`label:${folder.name}`);
    void loadInbox({ labelId: folder.gmailLabelId });
  }

  function handleSummaryFilterChange(filterId: OverviewFilterId) {
    setViewingFolderId(null);
    setSummaryFilter(filterId);
    const filter = getOverviewFilter(filterId);
    setUseLabelFilter(false);
    setSearch(filter.gmailQuery);
    void loadInbox({ query: filter.gmailQuery, labelId: null });
  }

  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial inbox load only
  }, []);

  useEffect(() => {
    if (!triageEnabled || !selectedId) {
      return;
    }
    if (isMessageLocked(selectedId, messages)) {
      focusUnlockedMessage(messages);
    }
  }, [messages, selectedId, triageEnabled]);

  useEffect(() => {
    if (selected?.isNsfw) {
      setSelectedId(null);
    }
  }, [selected]);

  return (
    <main className="mx-auto max-w-7xl p-4">
      <AiOverview
        selectedFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
        onSelectMessage={handleSelectMessage}
      />

      <div className="ableton-panel mb-4">
        <div className="ableton-panel-header">
          Transport · {viewingFolder ? viewingFolder.name : activeMailboxView.label}
        </div>
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{viewingFolder ? viewingFolder.name : activeMailboxView.label}</h1>
            <p className="mt-1 font-mono text-[11px] text-ableton-muted">
              TRACKS {messages.length}
              {totalEstimate !== null ? ` / ~${totalEstimate}` : ""}
              {folders.length > 0 ? ` · ${folders.length} folders` : ""}
              {nsfwCount > 0 ? ` · ${nsfwCount} blocked` : ""}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setUseLabelFilter(false);
              void loadInbox({ query: search, labelId: null });
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

      <FolderManager
        folders={folders}
        selectedFolderId={viewingFolderId}
        onFolderViewChange={handleFolderViewChange}
        onFolderCreated={(folder) => {
          setFolders((current) => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
          setFileTargetFolderId(folder.id);
        }}
      />

      <MailboxNav activeMailbox={activeMailbox} onMailboxChange={handleMailboxChange} />

      {error ? (
        <p className="mb-4 border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
      ) : null}

      {triageNotice ? (
        <p className="mb-4 border border-ableton-orange/60 bg-ableton-pane2 p-3 text-sm text-ableton-text">{triageNotice}</p>
      ) : null}

      {triageEnabled && messages.length > 0 ? (
        <InboxTriageBanner
          lockedCount={lockedMessageCount}
          unlockedSubject={unlockedMessage?.subject ?? null}
        />
      ) : null}

      <div className="grid min-h-[600px] grid-cols-1 gap-3 lg:grid-cols-[380px_1fr]">
        <section className="ableton-panel">
          <div className="ableton-panel-header">Session View · By week</div>
          <p className="border-b border-ableton-border px-3 py-2 text-xs text-ableton-muted">
            {triageEnabled
              ? "Open oldest unread first · read emails stay open so you can file them"
              : viewingFolderId
                ? `Viewing folder · ${viewingFolder?.name ?? ""}`
                : "Click a week to expand its emails"}
          </p>
          <div className="max-h-[640px] overflow-y-auto p-2">
            {loading ? (
              <p className="p-3 text-sm text-ableton-muted">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="p-3 text-sm text-ableton-muted">No messages found.</p>
            ) : (
              <>
                <WeekGroupedMessageList
                  groups={weekGroups}
                  selectedId={selectedId}
                  expandedWeekKey={expandedWeekKey}
                  unlockedMessageId={unlockedMessageId}
                  triageEnabled={triageEnabled}
                  onWeekToggle={handleWeekToggle}
                  onSelect={handleSelectMessage}
                  onQuickAction={handleQuickAction}
                />
                {nextPageToken ? (
                  <button
                    type="button"
                    onClick={() => void loadInbox({ pageToken: nextPageToken })}
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
          <div className="max-h-[640px] overflow-y-auto p-4">
            {selected ? (
              selected.isNsfw ? (
                <NsfwBlockedPanel
                  onTrash={() => applyAction("trash", selected.gmailId)}
                  onSpam={() => applyAction("spam", selected.gmailId)}
                />
              ) : (
              <>
                {selectedWeekGroup ? (
                  <div className="mb-4 border border-ableton-border bg-ableton-pane2 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">
                      {selectedWeekGroup.label}
                    </p>
                    <p className="mt-1 text-xs text-ableton-muted">{selectedWeekGroup.rangeLabel}</p>
                    <div className="mt-3">
                      <WeekProgress
                        openedCount={selectedWeekGroup.openedCount}
                        totalCount={selectedWeekGroup.totalCount}
                      />
                    </div>
                  </div>
                ) : null}
                <h2 className="mb-2 text-xl font-semibold">{selected.subject ?? "(No subject)"}</h2>
                <p className="mb-1 text-sm text-ableton-muted">{selected.fromAddress ?? "Unknown sender"}</p>
                <p className="mb-4 font-mono text-[11px] text-ableton-orange">
                  {selected.internalDate ? new Date(selected.internalDate).toLocaleString() : "No timestamp"}
                </p>
                <div className="mb-6 border border-ableton-border bg-ableton-pane p-4 text-sm leading-relaxed text-ableton-text">
                  {selected.snippet ?? "No preview available"}
                </div>
                {!viewingFolderId ? (
                  <FileToFolder
                    folders={folders}
                    selectedFolderId={fileTargetFolderId}
                    onFolderSelect={setFileTargetFolderId}
                    onFile={() => void fileToFolder(selected.gmailId, fileTargetFolderId)}
                    canFile={canFileSelected}
                    filing={filing}
                    required={triageEnabled}
                  />
                ) : null}
              <div className="flex flex-wrap gap-2">
                {activeMailbox !== "DRAFT" && activeMailbox !== "SENT" ? (
                  <>
                    <a className="ableton-btn" href={`/compose?mode=reply&id=${selected.gmailId}`}>
                      Reply
                    </a>
                    <a className="ableton-btn" href={`/compose?mode=forward&id=${selected.gmailId}`}>
                      Forward
                    </a>
                  </>
                ) : null}
                {activeMailbox === "DRAFT" ? (
                  <a className="ableton-btn ableton-btn-primary" href={`/compose?id=${selected.gmailId}`}>
                    Edit draft
                  </a>
                ) : null}
                {visibleMailboxActions.map((action) => (
                  <button
                    key={action}
                    className={`ableton-btn ${action === "delete_forever" ? "border-red-800 text-red-300" : ""}`}
                    onClick={() => applyAction(action, selected.gmailId)}
                  >
                    {ACTION_LABELS[action]}
                  </button>
                ))}
                {triageEnabled && selected && !canFileSelected ? (
                  <p className="w-full text-xs text-ableton-muted">
                    Open this email first, then choose a folder and file it.
                  </p>
                ) : null}
                {triageEnabled && selected?.isUnread && lockedMessageCount > 0 ? (
                  <p className="w-full text-xs text-ableton-muted">
                    {lockedMessageCount} newer unread email{lockedMessageCount === 1 ? "" : "s"} waiting —
                    file read emails or finish the oldest unread first.
                  </p>
                ) : null}
              </div>
              <WeekInboxDigest
                groups={weekGroups}
                selectedWeekKey={selectedWeekGroup?.key ?? null}
                onJumpToWeek={jumpToWeek}
              />
              </>
              )
            ) : (
              <>
                <p className="text-sm text-ableton-muted">Select a message clip to view details.</p>
                {weekGroups.length > 0 ? (
                  <WeekInboxDigest
                    groups={weekGroups}
                    selectedWeekKey={null}
                    onJumpToWeek={jumpToWeek}
                  />
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
