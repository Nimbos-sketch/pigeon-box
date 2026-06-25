export type NoticeType = "maintenance" | "billing" | "security" | "product" | "account" | "general";

export type OverviewItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  receivedAt: string;
  messageId: string;
  noticeType?: NoticeType;
};
