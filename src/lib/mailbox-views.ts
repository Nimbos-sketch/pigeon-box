export type MailboxViewId =
  | "CHAT"
  | "SENT"
  | "INBOX"
  | "IMPORTANT"
  | "TRASH"
  | "DRAFT"
  | "SPAM"
  | "CATEGORY_FORUMS"
  | "CATEGORY_UPDATES"
  | "CATEGORY_PERSONAL"
  | "CATEGORY_PROMOTIONS"
  | "CATEGORY_SOCIAL";

export type MailboxView = {
  id: MailboxViewId;
  label: string;
  gmailQuery: string;
};

export const MAILBOX_VIEWS: MailboxView[] = [
  { id: "CHAT", label: "Chat", gmailQuery: "in:chats" },
  { id: "SENT", label: "Sent", gmailQuery: "in:sent" },
  { id: "INBOX", label: "Inbox", gmailQuery: "in:inbox" },
  { id: "IMPORTANT", label: "Important", gmailQuery: "is:important" },
  { id: "TRASH", label: "Trash", gmailQuery: "in:trash" },
  { id: "DRAFT", label: "Drafts", gmailQuery: "in:draft" },
  { id: "SPAM", label: "Spam", gmailQuery: "in:spam" },
  { id: "CATEGORY_FORUMS", label: "Forums", gmailQuery: "category:forums" },
  { id: "CATEGORY_UPDATES", label: "Updates", gmailQuery: "category:updates" },
  { id: "CATEGORY_PERSONAL", label: "Personal", gmailQuery: "category:personal" },
  { id: "CATEGORY_PROMOTIONS", label: "Promotions", gmailQuery: "category:promotions" },
  { id: "CATEGORY_SOCIAL", label: "Social", gmailQuery: "category:social" }
];

export function getMailboxView(id: string | null | undefined): MailboxView {
  return MAILBOX_VIEWS.find((view) => view.id === id) ?? MAILBOX_VIEWS.find((view) => view.id === "INBOX")!;
}

export type MessageAction =
  | "archive"
  | "read"
  | "unread"
  | "star"
  | "unstar"
  | "trash"
  | "restore"
  | "delete_forever"
  | "spam"
  | "not_spam";

export function getMailboxActions(mailboxId: MailboxViewId): MessageAction[] {
  switch (mailboxId) {
    case "TRASH":
      return ["restore", "delete_forever", "read", "unread"];
    case "SPAM":
      return ["not_spam", "delete_forever", "read", "unread"];
    case "DRAFT":
      return ["delete_forever", "read", "unread"];
    case "SENT":
    case "CHAT":
      return ["read", "unread", "star", "unstar", "trash"];
    case "IMPORTANT":
    case "CATEGORY_FORUMS":
    case "CATEGORY_UPDATES":
    case "CATEGORY_PERSONAL":
    case "CATEGORY_PROMOTIONS":
    case "CATEGORY_SOCIAL":
      return ["archive", "read", "unread", "star", "unstar", "trash", "spam"];
    case "INBOX":
    default:
      return ["archive", "read", "unread", "star", "unstar", "trash", "spam"];
  }
}

export function actionRemovesFromView(action: MessageAction, mailboxId: MailboxViewId): boolean {
  switch (action) {
    case "archive":
      return mailboxId === "INBOX" || mailboxId.startsWith("CATEGORY_");
    case "trash":
      return mailboxId !== "TRASH";
    case "restore":
      return mailboxId === "TRASH";
    case "delete_forever":
      return true;
    case "spam":
      return mailboxId === "INBOX" || mailboxId.startsWith("CATEGORY_");
    case "not_spam":
      return mailboxId === "SPAM";
    default:
      return false;
  }
}
