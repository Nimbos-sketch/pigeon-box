import type { MailboxViewId } from "@/lib/mailbox-views";

export type TriageMessage = {
  gmailId: string;
  isUnread: boolean;
  internalDate: string | null;
  isNsfw?: boolean;
};

export type TriageQueueOptions = {
  /** Message opened but not yet actioned — holds the queue until disposition completes. */
  awaitingDispositionId?: string | null;
  /** Message with respond/action/fyi flow in progress. */
  activeDispositionId?: string | null;
  /** Messages already dispositioned this session — skipped when finding the next unlock. */
  dispositionedIds?: ReadonlySet<string>;
};

function triageEligible<T extends TriageMessage>(messages: T[]): T[] {
  return messages.filter((message) => !message.isNsfw);
}

export function isTriageMailbox(mailboxId: MailboxViewId): boolean {
  return (
    mailboxId === "INBOX" ||
    mailboxId === "IMPORTANT" ||
    mailboxId.startsWith("CATEGORY_")
  );
}

export function sortMessagesOldestFirst<T extends TriageMessage>(messages: T[]): T[] {
  return [...messages].sort((a, b) => {
    const aTime = a.internalDate ? new Date(a.internalDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.internalDate ? new Date(b.internalDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.gmailId.localeCompare(b.gmailId);
  });
}

function pendingMessages(
  messages: TriageMessage[],
  dispositionedIds?: ReadonlySet<string>
): TriageMessage[] {
  const eligible = triageEligible(messages);
  if (!dispositionedIds || dispositionedIds.size === 0) {
    return sortMessagesOldestFirst(eligible);
  }
  return sortMessagesOldestFirst(
    eligible.filter((message) => !dispositionedIds.has(message.gmailId))
  );
}

/** Oldest undispositioned email, or the one currently opened / in a disposition flow. */
export function getUnlockedMessageId(
  messages: TriageMessage[],
  options: TriageQueueOptions = {}
): string | null {
  const {
    awaitingDispositionId = null,
    activeDispositionId = null,
    dispositionedIds
  } = options;

  if (activeDispositionId) {
    return activeDispositionId;
  }

  const sorted = pendingMessages(messages, dispositionedIds);
  if (sorted.length === 0) {
    return null;
  }

  if (
    awaitingDispositionId &&
    sorted.some((message) => message.gmailId === awaitingDispositionId)
  ) {
    return awaitingDispositionId;
  }

  return sorted[0]?.gmailId ?? null;
}

export function isMessageLocked(
  messageId: string,
  messages: TriageMessage[],
  options: TriageQueueOptions = {}
): boolean {
  const message = messages.find((item) => item.gmailId === messageId);
  if (!message) {
    return false;
  }
  if (message.isNsfw) {
    return true;
  }

  const unlocked = getUnlockedMessageId(messages, options);
  if (!unlocked) {
    return false;
  }
  return messageId !== unlocked;
}

export function hasMessageBeenOpened(message: TriageMessage, openedIds: ReadonlySet<string>): boolean {
  return openedIds.has(message.gmailId) || !message.isUnread;
}

export function canFileMessage(
  messageId: string,
  messages: TriageMessage[],
  openedIds: ReadonlySet<string>
): boolean {
  const message = messages.find((item) => item.gmailId === messageId);
  if (!message) {
    return false;
  }
  return openedIds.has(message.gmailId);
}

export const canArchiveMessage = canFileMessage;

export function countLockedMessages(
  messages: TriageMessage[],
  options: TriageQueueOptions = {}
): number {
  const unlocked = getUnlockedMessageId(messages, options);
  if (!unlocked) {
    return 0;
  }
  return triageEligible(messages).filter((message) => message.gmailId !== unlocked).length;
}

export function countReadAwaitingFile(messages: TriageMessage[]): number {
  return messages.filter((message) => !message.isUnread).length;
}
