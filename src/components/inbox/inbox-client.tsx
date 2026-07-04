"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AiOverview } from "@/components/inbox/ai-overview";
import { InboxModuleTabs } from "@/components/inbox/inbox-module-tabs";
import { MessageBodyPanel } from "@/components/inbox/message-body-panel";
import { ModulePanel } from "@/components/inbox/module-panel";
import { DispositionChooser } from "@/components/inbox/disposition-chooser";
import { FolderBins } from "@/components/inbox/folder-bins";
import { ObligationQueueBanner } from "@/components/inbox/obligation-queue-banner";
import { PigeonWorkspace } from "@/components/inbox/pigeon-workspace";
import { PhishingWarningBanner } from "@/components/inbox/phishing-warning-banner";
import { NsfwBlockedPanel } from "@/components/inbox/nsfw-blocked-panel";
import { RespondPanel } from "@/components/inbox/respond-panel";
import { MailboxNav } from "@/components/inbox/mailbox-nav";
import { FileToFolder } from "@/components/inbox/file-to-folder";
import { FolderManager, type EmailFolder } from "@/components/inbox/folder-manager";
import { WeekGroupedMessageList } from "@/components/inbox/week-grouped-message-list";
import { WeekInboxDigest } from "@/components/inbox/week-inbox-digest";
import { WeekProgress } from "@/components/inbox/week-progress";
import { SmartHandlingBanner } from "@/components/inbox/smart-handling-banner";
import { TeamPigeonHoles } from "@/components/inbox/team-pigeon-holes";
import { TriageSafetyActions } from "@/components/inbox/triage-safety-actions";
import { formatSenderRuleNotice } from "@/lib/sender-rule-notice";
import { DEFAULT_FOLDER_COLOR } from "@/lib/folder-colors";
import type { AutoHandledSummary } from "@/lib/sender-rules";
import type { ActiveDisposition, DispositionMode, QuickReplyTemplate } from "@/lib/inbox-disposition";
import { countByQueue, type ObligationQueue } from "@/lib/inbox-queues";
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
  DEFAULT_ACTIVE_MODULE,
  loadActiveModuleId,
  saveActiveModuleId,
  type InboxModuleId
} from "@/lib/inbox-layout-prefs";
import {
  actionRemovesFromView,
  getMailboxActions,
  getMailboxView,
  type MailboxViewId,
  type MessageAction
} from "@/lib/mailbox-views";
import { useIsMdUp } from "@/hooks/use-media-query";

type Message = {
  gmailId: string;
  subject: string | null;
  fromAddress: string | null;
  snippet: string | null;
  isUnread: boolean;
  internalDate: string | null;
  isNsfw?: boolean;
  isPhishingRisk?: boolean;
  obligationQueue?: ObligationQueue;
  accentColor?: string | null;
  senderHint?: {
    senderLabel: string;
    preferredAction: string;
    actionsUntilAuto: number;
    autoApply: boolean;
    folderId?: string | null;
    folderName?: string | null;
  } | null;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMdUp = useIsMdUp();
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [awaitingDispositionId, setAwaitingDispositionId] = useState<string | null>(null);
  const [dispositionedMessageIds, setDispositionedMessageIds] = useState<Set<string>>(() => new Set());
  const [openedMessageIds, setOpenedMessageIds] = useState<Set<string>>(() => new Set());
  const [triageNotice, setTriageNotice] = useState<string | null>(null);
  const [activeDisposition, setActiveDisposition] = useState<ActiveDisposition | null>(null);
  const [sendingQuickReply, setSendingQuickReply] = useState(false);
  const [autoHandled, setAutoHandled] = useState<AutoHandledSummary[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<InboxModuleId>(DEFAULT_ACTIVE_MODULE);

  const triageEnabled = isTriageMailbox(activeMailbox) && viewingFolderId === null;
  const activeDispositionId = activeDisposition?.messageId ?? null;
  const viewingFolder = folders.find((folder) => folder.id === viewingFolderId) ?? null;

  const selected = useMemo(
    () => messages.find((message) => message.gmailId === selectedId) ?? null,
    [messages, selectedId]
  );

  const activeMailboxView = useMemo(() => getMailboxView(activeMailbox), [activeMailbox]);
  const mailboxActions = useMemo(() => getMailboxActions(activeMailbox), [activeMailbox]);
  const triageQueueOptions = useMemo(
    () => ({
      awaitingDispositionId,
      activeDispositionId,
      dispositionedIds: dispositionedMessageIds
    }),
    [awaitingDispositionId, activeDispositionId, dispositionedMessageIds]
  );
  const weekGroups = useMemo(
    () =>
      groupInboxMessagesByWeek(messages, {
        weekOrder: triageEnabled ? "oldest" : "newest",
        messageOrder: triageEnabled ? "oldest" : "newest",
        isCompleted: triageEnabled
          ? (message) => dispositionedMessageIds.has(message.gmailId)
          : undefined
      }),
    [messages, triageEnabled, dispositionedMessageIds]
  );
  const unlockedMessageId = useMemo(
    () => (triageEnabled ? getUnlockedMessageId(messages, triageQueueOptions) : null),
    [messages, triageEnabled, triageQueueOptions]
  );
  const unlockedMessage = useMemo(
    () => messages.find((message) => message.gmailId === unlockedMessageId) ?? null,
    [messages, unlockedMessageId]
  );
  const lockedMessageCount = useMemo(
    () => (triageEnabled ? countLockedMessages(messages, triageQueueOptions) : 0),
    [messages, triageEnabled, triageQueueOptions]
  );
  const queueCounts = useMemo(() => countByQueue(messages), [messages]);
  const unlockedQueue = useMemo(
    () => unlockedMessage?.obligationQueue ?? null,
    [unlockedMessage]
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
  const showDispositionFlow =
    triageEnabled &&
    selected &&
    !selected.isNsfw &&
    openedMessageIds.has(selected.gmailId);

  const dispositionModeForSelected =
    activeDisposition && activeDisposition.messageId === selected?.gmailId
      ? activeDisposition.mode
      : null;
  const mobileDetailMode = !isMdUp && Boolean(selected);
  const mobileResponseMode = mobileDetailMode && Boolean(showDispositionFlow);

  const suggestedFolderId = useMemo(() => {
    if (!selected?.senderHint || selected.senderHint.preferredAction !== "file") {
      return null;
    }
    return selected.senderHint.folderId ?? null;
  }, [selected]);

  const selectedWeekGroup = useMemo(
    () => findWeekGroupForMessage(weekGroups, selectedId),
    [weekGroups, selectedId]
  );

  function markDispositioned(messageId: string) {
    setDispositionedMessageIds((current) => {
      const next = new Set(current);
      next.add(messageId);
      return next;
    });
  }

  function clearDisposition() {
    setActiveDisposition(null);
  }

  async function finishDisposition(messageId: string, action: MessageAction = "archive") {
    markDispositioned(messageId);
    setAwaitingDispositionId(null);
    clearDisposition();
    await applyAction(action, messageId);
  }

  function advanceTriageQueueAfterDisposition(messageList: Message[], dispositionedId?: string) {
    if (!triageEnabled) {
      return;
    }
    setSelectedId(null);
    setAwaitingDispositionId(null);
    clearDisposition();
    if (dispositionedId) {
      setOpenedMessageIds((current) => {
        const next = new Set(current);
        next.delete(dispositionedId);
        return next;
      });
    }
    const dispositioned = new Set(dispositionedMessageIds);
    if (dispositionedId) {
      dispositioned.add(dispositionedId);
    }
    const nextUnlocked = getUnlockedMessageId(messageList, {
      awaitingDispositionId: null,
      activeDispositionId: null,
      dispositionedIds: dispositioned
    });
    if (nextUnlocked) {
      const week = findWeekGroupForMessage(
        groupInboxMessagesByWeek(messageList, {
          weekOrder: "oldest",
          messageOrder: "oldest",
          isCompleted: (message) => dispositioned.has(message.gmailId)
        }),
        nextUnlocked
      );
      if (week) {
        setExpandedWeekKey(week.key);
      }
    }
  }

  function handleChooseDisposition(mode: DispositionMode) {
    if (!selected) {
      return;
    }
    if (mode === "fyi") {
      setActiveDisposition({ messageId: selected.gmailId, mode: "fyi" });
      void finishDisposition(selected.gmailId, "archive");
      return;
    }
    setActiveDisposition({ messageId: selected.gmailId, mode });
  }

  async function handleQuickReply(template: QuickReplyTemplate) {
    if (!selected) {
      return;
    }
    setSendingQuickReply(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${selected.gmailId}/quick-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template })
      });
      if (!res.ok) {
        throw new Error("Failed to send quick reply");
      }
      await finishDisposition(selected.gmailId, "archive");
    } catch {
      setError("Could not send quick reply");
    } finally {
      setSendingQuickReply(false);
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

  function handleBackToGrid() {
    setSelectedId(null);
    setAwaitingDispositionId(null);
  }

  function handleSelectMessage(messageId: string) {
    const message = messages.find((item) => item.gmailId === messageId);
    if (message?.isNsfw) {
      setTriageNotice("This email is blocked by the NSFW filter and cannot be opened.");
      return;
    }

    if (triageEnabled && isMessageLocked(messageId, messages, triageQueueOptions)) {
      setTriageNotice(
        awaitingDispositionId || activeDispositionId
          ? "Finish responding or actioning the current email before opening another."
          : "Work through the queue in order — open and action the highlighted cell first."
      );
      return;
    }

    setTriageNotice(null);
    if (activeDisposition?.messageId !== messageId) {
      setActiveDisposition(null);
    }
    const week = findWeekGroupForMessage(weekGroups, messageId);
    if (week) {
      setExpandedWeekKey(week.key);
    }
    setSelectedId(messageId);
    setAwaitingDispositionId(messageId);
    selectModule("inbox");
    setOpenedMessageIds((current) => {
      const next = new Set(current);
      next.add(messageId);
      return next;
    });
  }

  function handleQuickAction(action: "trash" | "spam", messageId: string) {
    markDispositioned(messageId);
    setAwaitingDispositionId(null);
    clearDisposition();
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
      const foldersPromise = !isLoadMore ? fetch("/api/folders") : null;
      const messagesRes = await fetch(buildInboxUrl(options));
      if (!messagesRes.ok) {
        const body = (await messagesRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Failed to load inbox (${messagesRes.status})`);
      }

      const messagesJson = await messagesRes.json();
      const incoming: Message[] = (messagesJson.messages ?? []).map((message: Message) => ({
        ...message,
        accentColor: message.accentColor ?? null
      }));
      const handled: AutoHandledSummary[] = messagesJson.autoHandled ?? [];
      let nextMessages = incoming;

      setMessages((current) => {
        nextMessages = isLoadMore ? mergeMessages(current, incoming) : incoming;
        return nextMessages;
      });

      setNextPageToken(messagesJson.nextPageToken ?? null);
      setTotalEstimate(messagesJson.resultSizeEstimate ?? null);
      setAutoHandled((current) => (isLoadMore ? [...current, ...handled] : handled));

      if (!isLoadMore) {
        setExpandedWeekKey(null);
        setOpenedMessageIds(new Set());
        setAwaitingDispositionId(null);
        setDispositionedMessageIds(new Set());
        setTriageNotice(null);
        setActiveDisposition(null);

        if (foldersPromise) {
          const foldersRes = await foldersPromise;
          if (foldersRes.ok) {
            const foldersJson = await foldersRes.json();
            setFolders(
              (foldersJson.folders ?? []).map((folder: EmailFolder) => ({
                ...folder,
                color: folder.color ?? DEFAULT_FOLDER_COLOR
              }))
            );
          } else {
            setFolders([]);
          }
        }
      }

      if (triageEnabled) {
        setSelectedId(null);
        setAwaitingDispositionId(null);
      } else if (!isLoadMore) {
        setSelectedId(nextMessages.find((message) => !message.isNsfw)?.gmailId ?? null);
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
      const body = (await res.json()) as { senderRule?: Parameters<typeof formatSenderRuleNotice>[0] };
      const learned = formatSenderRuleNotice(body.senderRule);
      if (learned) {
        setTriageNotice(learned);
      }

      if (triageEnabled) {
        markDispositioned(messageId);
      }

      setMessages((current) => {
        const next = current.filter((msg) => msg.gmailId !== messageId);
        setOpenedMessageIds((opened) => {
          const updated = new Set(opened);
          updated.delete(messageId);
          return updated;
        });
        clearDisposition();
        if (triageEnabled) {
          advanceTriageQueueAfterDisposition(next, messageId);
        } else if (selectedId === messageId) {
          setSelectedId(next[0]?.gmailId ?? null);
        }
        return next;
      });
      if (!learned) {
        setTriageNotice(null);
      }
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
    const previous = messages;
    const previousSelectedId = selectedId;
    const targetMessage = previous.find((msg) => msg.gmailId === messageId);
    const isBlockedContent = targetMessage?.isNsfw === true;
    const willRemoveFromView = actionRemovesFromView(action, activeMailbox);

    const requiresReadFirst =
      triageEnabled &&
      !isBlockedContent &&
      (action === "archive" || action === "trash" || action === "spam");
    if (requiresReadFirst && !openedMessageIds.has(messageId)) {
      setTriageNotice("Open this email first, then choose an action.");
      return;
    }

    if (
      triageEnabled &&
      (action === "archive" || action === "trash" || action === "spam") &&
      (messageId === awaitingDispositionId || isBlockedContent)
    ) {
      markDispositioned(messageId);
      setAwaitingDispositionId(null);
      clearDisposition();
    }

    if (isBlockedContent && willRemoveFromView) {
      setTriageNotice(null);
      setMessages((current) => current.filter((msg) => msg.gmailId !== messageId));
      if (selectedId === messageId) {
        setSelectedId(null);
      }
      setOpenedMessageIds((opened) => {
        const updated = new Set(opened);
        updated.delete(messageId);
        return updated;
      });
    } else if (action !== "delete_forever") {
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

      const body = (await res.json()) as { senderRule?: Parameters<typeof formatSenderRuleNotice>[0] };
      const learned = formatSenderRuleNotice(body.senderRule);
      if (learned) {
        setTriageNotice(learned);
      }

      if (willRemoveFromView && !isBlockedContent) {
        setMessages((current) => {
          const next = current.filter((msg) => msg.gmailId !== messageId);
          if (isTriageMailbox(activeMailbox)) {
            setOpenedMessageIds((opened) => {
              const updated = new Set(opened);
              updated.delete(messageId);
              return updated;
            });
            advanceTriageQueueAfterDisposition(next, messageId);
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

  async function handleFolderColorChange(folderId: string, color: string) {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color })
      });
      if (!res.ok) {
        throw new Error("Failed to update folder colour");
      }
      const data = (await res.json()) as { folder: EmailFolder };
      setFolders((current) =>
        current.map((folder) =>
          folder.id === folderId ? { ...data.folder, ruleCount: folder.ruleCount } : folder
        )
      );
    } catch {
      setError("Could not update folder colour");
    }
  }

  async function reloadFolders() {
    try {
      const res = await fetch("/api/folders");
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { folders?: EmailFolder[] };
      setFolders(
        (data.folders ?? []).map((folder) => ({
          ...folder,
          color: folder.color ?? DEFAULT_FOLDER_COLOR
        }))
      );
    } catch {
      // ignore background refresh errors
    }
  }

  function handleFolderDeleted(folderId: string) {
    setFolders((current) => current.filter((folder) => folder.id !== folderId));
    if (viewingFolderId === folderId) {
      handleFolderViewChange(null);
    }
    if (fileTargetFolderId === folderId) {
      setFileTargetFolderId("");
    }
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
    if (isMessageLocked(selectedId, messages, triageQueueOptions)) {
      setSelectedId(null);
    }
  }, [messages, selectedId, triageEnabled, triageQueueOptions]);

  useEffect(() => {
    const respondedId = searchParams.get("responded");
    if (!respondedId) {
      return;
    }
    void finishDisposition(respondedId, "archive");
    router.replace("/inbox");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handle compose return once
  }, [searchParams]);

  const activeOverviewFilter = useMemo(() => getOverviewFilter(summaryFilter), [summaryFilter]);
  const folderSummary = viewingFolder ? viewingFolder.name : "Inbox";

  const showQueue = autoHandled.length > 0 || (triageEnabled && messages.length > 0);

  const visibleModuleIds = useMemo(() => {
    const ids: InboxModuleId[] = ["overview", "transport", "folders", "mailboxes"];
    if (showQueue) {
      ids.push("queue");
    }
    ids.push("teamHoles", "inbox");
    return ids;
  }, [showQueue]);

  const moduleSummaries = useMemo(
    () => ({
      overview: activeOverviewFilter.label,
      transport: `${messages.length} tracks`,
      folders: `${folders.length} · ${folderSummary}`,
      mailboxes: activeMailboxView.label,
      queue: triageEnabled
        ? `${queueCounts.response} respond · ${queueCounts.action} action`
        : `${autoHandled.length} auto-handled`,
      teamHoles: "Team grid",
      inbox: selected?.subject ?? "Grid · workspace"
    }),
    [
      activeOverviewFilter.label,
      messages.length,
      folders.length,
      folderSummary,
      activeMailboxView.label,
      triageEnabled,
      queueCounts.response,
      queueCounts.action,
      autoHandled.length,
      selected?.subject
    ]
  );

  function selectModule(id: InboxModuleId) {
    setActiveModuleId(id);
    saveActiveModuleId(id);
  }

  function cycleModule(direction: -1 | 1) {
    const index = visibleModuleIds.indexOf(activeModuleId);
    if (index === -1) {
      selectModule(visibleModuleIds[0] ?? DEFAULT_ACTIVE_MODULE);
      return;
    }
    const nextIndex = (index + direction + visibleModuleIds.length) % visibleModuleIds.length;
    selectModule(visibleModuleIds[nextIndex] ?? DEFAULT_ACTIVE_MODULE);
  }

  function minimizeActiveModule() {
    if (activeModuleId !== "inbox") {
      selectModule("inbox");
    }
  }

  useEffect(() => {
    setActiveModuleId(loadActiveModuleId());
  }, []);

  useEffect(() => {
    if (!visibleModuleIds.includes(activeModuleId)) {
      selectModule("inbox");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep active tab valid when queue visibility changes
  }, [visibleModuleIds, activeModuleId]);

  useEffect(() => {
    if (selected?.isNsfw) {
      setSelectedId(null);
    }
  }, [selected]);

  useEffect(() => {
    if (!mobileDetailMode) {
      return;
    }
    document.documentElement.classList.add("overflow-hidden");
    document.body.classList.add("overflow-hidden");
    if (mobileResponseMode) {
      document.body.dataset.inboxResponse = "true";
    } else {
      delete document.body.dataset.inboxResponse;
    }
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
      delete document.body.dataset.inboxResponse;
    };
  }, [mobileDetailMode, mobileResponseMode]);

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${mobileDetailMode ? "overflow-hidden" : ""}`}>
      {!mobileDetailMode ? (
      <InboxModuleTabs
        activeId={activeModuleId}
        visibleIds={visibleModuleIds}
        summaries={moduleSummaries}
        onSelect={selectModule}
        onCycle={cycleModule}
        onFocusInbox={() => selectModule("inbox")}
      />
      ) : null}

      <main className={`mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col ${!isMdUp && selected && activeModuleId === "inbox" ? "p-0" : "p-4"}`}>
        {error && !mobileResponseMode ? (
          <p className="mb-4 border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        {triageNotice && !mobileResponseMode ? (
          <p className="mb-4 border border-ableton-orange/60 bg-ableton-pane2 p-3 text-sm text-ableton-text">
            {triageNotice}
          </p>
        ) : null}

        {activeModuleId === "overview" ? (
          <ModulePanel
            title="AI Overview"
            summary={moduleSummaries.overview}
            onMinimize={minimizeActiveModule}
          >
            <AiOverview
              selectedFilter={summaryFilter}
              onFilterChange={handleSummaryFilterChange}
              onSelectMessage={handleSelectMessage}
            />
          </ModulePanel>
        ) : null}

        {activeModuleId === "transport" ? (
          <ModulePanel
            title={`Transport · ${viewingFolder ? viewingFolder.name : activeMailboxView.label}`}
            summary={moduleSummaries.transport}
            onMinimize={minimizeActiveModule}
          >
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold">
                  {viewingFolder ? viewingFolder.name : activeMailboxView.label}
                </h1>
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
          </ModulePanel>
        ) : null}

        {activeModuleId === "folders" ? (
          <ModulePanel title="Folders" summary={moduleSummaries.folders} onMinimize={minimizeActiveModule}>
            <FolderManager
              folders={folders}
              selectedFolderId={viewingFolderId}
              onFolderViewChange={handleFolderViewChange}
              onFolderCreated={(folder) => {
                setFolders((current) => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
                setFileTargetFolderId(folder.id);
                selectModule("folders");
              }}
              onFolderColorChange={handleFolderColorChange}
              onFolderDeleted={handleFolderDeleted}
              onRulesChange={() => void reloadFolders()}
            />
          </ModulePanel>
        ) : null}

        {activeModuleId === "mailboxes" ? (
          <ModulePanel title="Mailboxes" summary={moduleSummaries.mailboxes} onMinimize={minimizeActiveModule}>
            <MailboxNav activeMailbox={activeMailbox} onMailboxChange={handleMailboxChange} />
          </ModulePanel>
        ) : null}

        {activeModuleId === "queue" && showQueue ? (
          <ModulePanel title="Queue & alerts" summary={moduleSummaries.queue} onMinimize={minimizeActiveModule}>
            <div className="space-y-3 p-3">
              <SmartHandlingBanner autoHandled={autoHandled} onDismiss={() => setAutoHandled([])} />
              {triageEnabled && messages.length > 0 ? (
                <ObligationQueueBanner
                  responseCount={queueCounts.response}
                  actionCount={queueCounts.action}
                  lockedCount={lockedMessageCount}
                  unlockedSubject={unlockedMessage?.subject ?? null}
                  unlockedQueue={unlockedQueue}
                />
              ) : null}
            </div>
          </ModulePanel>
        ) : null}

        {activeModuleId === "teamHoles" ? (
          <ModulePanel title="Team pigeon holes" summary={moduleSummaries.teamHoles} onMinimize={minimizeActiveModule}>
            <TeamPigeonHoles />
          </ModulePanel>
        ) : null}

        {activeModuleId === "inbox" ? (
      <div className={!isMdUp && selected ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <PigeonWorkspace
        showWorkspaceOnMobile={Boolean(selected)}
        compactChrome={mobileResponseMode}
        onBackToGrid={handleBackToGrid}
        workspaceTitle={mobileResponseMode ? "Respond or action" : (selected?.subject ?? undefined)}
        hint={
          triageEnabled
            ? "One active cell at a time"
            : viewingFolderId
              ? `Folder · ${viewingFolder?.name ?? ""}`
              : "Expand a row to see cells"
        }
        inboxGrid={
          loading ? (
            <div className="pigeon-grid pigeon-grid-inbox">
              <p className="pigeon-cell pigeon-cell-span text-sm text-ableton-muted">Loading grid...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="pigeon-grid pigeon-grid-inbox">
              <div className="pigeon-cell pigeon-cell-span text-center text-sm text-ableton-muted">No cells occupied</div>
            </div>
          ) : (
            <WeekGroupedMessageList
              groups={weekGroups}
              selectedId={selectedId}
              expandedWeekKey={expandedWeekKey}
              unlockedMessageId={unlockedMessageId}
              awaitingDispositionId={awaitingDispositionId}
              triageEnabled={triageEnabled}
              onWeekToggle={handleWeekToggle}
              onSelect={handleSelectMessage}
              onQuickAction={handleQuickAction}
              footer={
                nextPageToken ? (
                  <button
                    type="button"
                    onClick={() => void loadInbox({ pageToken: nextPageToken })}
                    disabled={loadingMore}
                    className="pigeon-cell pigeon-cell-span text-center text-xs uppercase tracking-[0.08em] disabled:opacity-60"
                  >
                    {loadingMore ? "Loading more..." : "Load more cells"}
                  </button>
                ) : null
              }
            />
          )
        }
        workspace={
          selected ? (
            selected.isNsfw ? (
              <NsfwBlockedPanel
                onTrash={() => applyAction("trash", selected.gmailId)}
                onSpam={() => applyAction("spam", selected.gmailId)}
              />
            ) : (
              <div className={mobileDetailMode ? "flex h-full min-h-0 flex-col overflow-hidden" : undefined}>
                {mobileResponseMode ? (
                  <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-hidden px-3 py-2">
                    {showDispositionFlow && !dispositionModeForSelected ? (
                      <DispositionChooser
                        compact
                        suggestedQueue={selected.obligationQueue ?? "action"}
                        onChoose={handleChooseDisposition}
                      />
                    ) : null}
                    {showDispositionFlow && dispositionModeForSelected === "action" ? (
                      <FolderBins
                        compact
                        folders={folders}
                        filing={filing}
                        suggestedFolderId={suggestedFolderId}
                        onFile={(folderId) => void fileToFolder(selected.gmailId, folderId)}
                        onArchive={() => void finishDisposition(selected.gmailId, "archive")}
                      />
                    ) : null}
                    {showDispositionFlow && dispositionModeForSelected === "respond" ? (
                      <RespondPanel
                        compact
                        messageId={selected.gmailId}
                        sending={sendingQuickReply}
                        onQuickReply={(template) => void handleQuickReply(template)}
                        onArchiveAfterReply={() => void finishDisposition(selected.gmailId, "archive")}
                      />
                    ) : null}
                    {triageEnabled ? (
                      <TriageSafetyActions
                        compact
                        onTrash={() => applyAction("trash", selected.gmailId)}
                        onSpam={() => applyAction("spam", selected.gmailId)}
                      />
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className={mobileDetailMode ? "min-h-0 flex-1 overflow-y-auto px-4 pt-4" : undefined}>
                      {selectedWeekGroup && isMdUp ? (
                        <div className="mb-4 border border-ableton-border bg-ableton-pane2 p-3">
                          <p className="pigeon-slot-id">ROW {selectedWeekGroup.label}</p>
                          <p className="mt-1 text-xs text-ableton-muted">{selectedWeekGroup.rangeLabel}</p>
                          <div className="mt-3">
                            <WeekProgress
                              openedCount={selectedWeekGroup.openedCount}
                              totalCount={selectedWeekGroup.totalCount}
                              triage={triageEnabled}
                            />
                          </div>
                        </div>
                      ) : null}
                      {selected.isPhishingRisk ? <PhishingWarningBanner /> : null}
                      <p className="pigeon-slot-id">Workspace</p>
                      <h2 className="mb-2 mt-1 text-xl font-semibold">{selected.subject ?? "(No subject)"}</h2>
                      <p className="mb-1 text-sm text-ableton-muted">{selected.fromAddress ?? "Unknown sender"}</p>
                      <p className="mb-4 font-mono text-[11px] text-ableton-orange">
                        {selected.internalDate ? new Date(selected.internalDate).toLocaleString() : "No timestamp"}
                      </p>
                      <MessageBodyPanel messageId={selected.gmailId} fallbackSnippet={selected.snippet} fill={mobileDetailMode} />
                    </div>
                    <div
                      className={
                        mobileDetailMode
                          ? "shrink-0 border-t border-ableton-border bg-ableton-pane px-4 py-3"
                          : undefined
                      }
                    >
                      {showDispositionFlow && !dispositionModeForSelected ? (
                        <DispositionChooser
                          suggestedQueue={selected.obligationQueue ?? "action"}
                          onChoose={handleChooseDisposition}
                        />
                      ) : null}
                      {showDispositionFlow && dispositionModeForSelected === "action" ? (
                        <FolderBins
                          folders={folders}
                          filing={filing}
                          suggestedFolderId={suggestedFolderId}
                          onFile={(folderId) => void fileToFolder(selected.gmailId, folderId)}
                          onArchive={() => void finishDisposition(selected.gmailId, "archive")}
                        />
                      ) : null}
                      {showDispositionFlow && dispositionModeForSelected === "respond" ? (
                        <RespondPanel
                          messageId={selected.gmailId}
                          sending={sendingQuickReply}
                          onQuickReply={(template) => void handleQuickReply(template)}
                          onArchiveAfterReply={() => void finishDisposition(selected.gmailId, "archive")}
                        />
                      ) : null}
                      {!triageEnabled && !viewingFolderId ? (
                        <FileToFolder
                          folders={folders}
                          selectedFolderId={fileTargetFolderId}
                          onFolderSelect={setFileTargetFolderId}
                          onFile={() => void fileToFolder(selected.gmailId, fileTargetFolderId)}
                          canFile={canFileSelected}
                          filing={filing}
                          required={false}
                        />
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {!triageEnabled && activeMailbox !== "DRAFT" && activeMailbox !== "SENT" ? (
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
                        {!triageEnabled ? (
                          visibleMailboxActions.map((action) => (
                            <button
                              key={action}
                              className={`ableton-btn ${action === "delete_forever" ? "border-red-800 text-red-300" : ""}`}
                              onClick={() => applyAction(action, selected.gmailId)}
                            >
                              {ACTION_LABELS[action]}
                            </button>
                          ))
                        ) : (
                          <TriageSafetyActions
                            onTrash={() => applyAction("trash", selected.gmailId)}
                            onSpam={() => applyAction("spam", selected.gmailId)}
                          />
                        )}
                        {triageEnabled && showDispositionFlow && !dispositionModeForSelected && isMdUp ? (
                          <p className="w-full text-xs text-ableton-muted">Choose Respond, Action, or FYI to continue.</p>
                        ) : null}
                        {triageEnabled && lockedMessageCount > 0 && isMdUp ? (
                          <p className="w-full text-xs text-ableton-muted">
                            {lockedMessageCount} cell{lockedMessageCount === 1 ? "" : "s"} locked in the grid.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {isMdUp ? (
                      <WeekInboxDigest
                        groups={weekGroups}
                        selectedWeekKey={selectedWeekGroup?.key ?? null}
                        onJumpToWeek={jumpToWeek}
                      />
                    ) : null}
                  </>
                )}
              </div>
            )
          ) : (
            <>
              <div className="flex min-h-[12rem] flex-col items-center justify-center border border-dashed border-ableton-border bg-ableton-surface/50 p-6 text-center">
                <p className="pigeon-slot-id">WS · empty</p>
                <p className="mt-2 text-sm text-ableton-muted">Select a grid cell to open it here</p>
              </div>
              {weekGroups.length > 0 ? (
                <div className="mt-4">
                  <WeekInboxDigest groups={weekGroups} selectedWeekKey={null} onJumpToWeek={jumpToWeek} />
                </div>
              ) : null}
            </>
          )
        }
      />
      </div>
        ) : null}
      </main>
    </div>
  );
}
