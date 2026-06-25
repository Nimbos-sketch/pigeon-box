import type { MailboxViewId } from "@/lib/mailbox-views";

export type TriageMessage = {
  gmailId: string;
  isUnread: boolean;
  internalDate: string | null;
  isNsfw?: boolean;
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

/** Oldest unread email, or if all are read the oldest still waiting to be filed. */
export function getUnlockedMessageId(messages: TriageMessage[]): string | null {
  const sorted = sortMessagesOldestFirst(triageEligible(messages));
  if (sorted.length === 0) {
    return null;
  }
  const oldestUnread = sorted.find((message) => message.isUnread);
  return oldestUnread?.gmailId ?? sorted[0].gmailId;
}

/**
 * Unread mail: only the oldest unread can be opened.
 * Already-read mail stays openable so you can file it without getting stuck.
 */
export function isMessageLocked(messageId: string, messages: TriageMessage[]): boolean {
  const message = messages.find((item) => item.gmailId === messageId);
  if (!message) {
    return false;
  }
  if (message.isNsfw) {
    return true;
  }
  if (!message.isUnread) {
    return false;
  }
  const oldestUnread = sortMessagesOldestFirst(triageEligible(messages)).find((item) => item.isUnread);
  if (!oldestUnread) {
    return false;
  }
  return messageId !== oldestUnread.gmailId;
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
  return hasMessageBeenOpened(message, openedIds);
}

export const canArchiveMessage = canFileMessage;

export function countLockedMessages(messages: TriageMessage[]): number {
  const oldestUnread = sortMessagesOldestFirst(triageEligible(messages)).find((message) => message.isUnread);
  if (!oldestUnread) {
    return 0;
  }
  return messages.filter((message) => message.isUnread && message.gmailId !== oldestUnread.gmailId).length;
}

export function countReadAwaitingFile(messages: TriageMessage[]): number {
  return messages.filter((message) => !message.isUnread).length;
}
