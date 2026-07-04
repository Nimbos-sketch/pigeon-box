export type DispositionMode = "respond" | "action" | "fyi";

export type ActiveDisposition = {
  messageId: string;
  mode: DispositionMode;
};

export const QUICK_REPLY_TEMPLATES = {
  on_it: "Thanks for your email — I'm on it and will follow up shortly.",
  received: "Received, thank you. I've noted this and will get back to you if needed.",
  will_review: "Thanks — I'll review this and respond with a full answer soon."
} as const;

export type QuickReplyTemplate = keyof typeof QUICK_REPLY_TEMPLATES;
