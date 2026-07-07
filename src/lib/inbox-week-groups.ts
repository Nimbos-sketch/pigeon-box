export type InboxMessageForGrouping = {
  gmailId: string;
  subject: string | null;
  fromAddress: string | null;
  snippet: string | null;
  isUnread: boolean;
  internalDate: string | null;
  isNsfw?: boolean;
  isPhishingRisk?: boolean;
  obligationQueue?: "response" | "action";
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

export type InboxWeekGroup = {
  key: string;
  label: string;
  rangeLabel: string;
  start: Date;
  end: Date;
  messages: InboxMessageForGrouping[];
  openedCount: number;
  totalCount: number;
  unreadCount: number;
};

function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeekSunday(weekStart: Date): Date {
  const copy = new Date(weekStart);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWeekLabel(weekStart: Date, weekEnd: Date, now: Date): { label: string; rangeLabel: string } {
  const thisWeekStart = startOfWeekMonday(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`;

  if (weekStart.getTime() === thisWeekStart.getTime()) {
    return { label: "This week", rangeLabel };
  }
  if (weekStart.getTime() === lastWeekStart.getTime()) {
    return { label: "Last week", rangeLabel };
  }

  return { label: `Week of ${formatShortDate(weekStart)}`, rangeLabel };
}

export function groupInboxMessagesByWeek(
  messages: InboxMessageForGrouping[],
  options?: {
    weekOrder?: "newest" | "oldest";
    messageOrder?: "newest" | "oldest";
    /** When set, drives opened/unread counts instead of Gmail read state (triage mode). */
    isCompleted?: (message: InboxMessageForGrouping) => boolean;
  }
): InboxWeekGroup[] {
  const weekOrder = options?.weekOrder ?? "newest";
  const messageOrder = options?.messageOrder ?? "newest";
  const isCompleted = options?.isCompleted ?? ((message) => !message.isUnread);
  const now = new Date();
  const buckets = new Map<string, InboxMessageForGrouping[]>();

  for (const message of messages) {
    const date = message.internalDate ? new Date(message.internalDate) : null;
    const key = date ? startOfWeekMonday(date).toISOString() : "unknown";
    const bucket = buckets.get(key) ?? [];
    bucket.push(message);
    buckets.set(key, bucket);
  }

  const groups: InboxWeekGroup[] = [];

  for (const [key, bucket] of buckets.entries()) {
    const sorted = [...bucket].sort((a, b) => {
      const aTime = a.internalDate ? new Date(a.internalDate).getTime() : 0;
      const bTime = b.internalDate ? new Date(b.internalDate).getTime() : 0;
      return messageOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });

    if (key === "unknown") {
      const openedCount = sorted.filter((message) => isCompleted(message)).length;
      groups.push({
        key,
        label: "No date",
        rangeLabel: "Messages without a timestamp",
        start: new Date(0),
        end: new Date(0),
        messages: sorted,
        openedCount,
        totalCount: sorted.length,
        unreadCount: sorted.length - openedCount
      });
      continue;
    }

    const start = new Date(key);
    const end = endOfWeekSunday(start);
    const { label, rangeLabel } = formatWeekLabel(start, end, now);
    const openedCount = sorted.filter((message) => isCompleted(message)).length;

    groups.push({
      key,
      label,
      rangeLabel,
      start,
      end,
      messages: sorted,
      openedCount,
      totalCount: sorted.length,
      unreadCount: sorted.length - openedCount
    });
  }

  return groups.sort((a, b) => {
    if (a.key === "unknown") return 1;
    if (b.key === "unknown") return -1;
    return weekOrder === "oldest"
      ? a.start.getTime() - b.start.getTime()
      : b.start.getTime() - a.start.getTime();
  });
}

export function findWeekGroupForMessage(
  groups: InboxWeekGroup[],
  messageId: string | null
): InboxWeekGroup | null {
  if (!messageId) return null;
  return groups.find((group) => group.messages.some((message) => message.gmailId === messageId)) ?? null;
}

export function formatOpenedCount(opened: number, total: number, triage = false): string {
  return triage
    ? `${opened} of ${total} actioned`
    : `${opened} of ${total} opened`;
}
