export const AUTO_APPLY_THRESHOLD = 3;

export type SenderActionType = "spam" | "trash" | "archive" | "file";

export type SenderRuleView = {
  id: string;
  senderKey: string;
  senderLabel: string;
  preferredAction: SenderActionType;
  folderId: string | null;
  folderName: string | null;
  folderColor: string | null;
  actionCount: number;
  autoApply: boolean;
  actionsUntilAuto: number;
};

export type SenderHint = {
  senderKey: string;
  senderLabel: string;
  preferredAction: SenderActionType;
  actionCount: number;
  actionsUntilAuto: number;
  autoApply: boolean;
  folderColor: string | null;
  folderId: string | null;
  folderName: string | null;
};

export type AutoHandledSummary = {
  messageId: string;
  senderKey: string;
  senderLabel: string;
  action: SenderActionType;
  folderName?: string;
};
