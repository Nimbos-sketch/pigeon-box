"use client";

import { MessageBodyPanel } from "@/components/inbox/message-body-panel";
import { PhishingWarningBanner } from "@/components/inbox/phishing-warning-banner";
import { MOBILE_EMAIL_SCROLL_CLASS } from "@/lib/email-html";

type MobileMessage = {
  gmailId: string;
  subject: string | null;
  fromAddress: string | null;
  snippet: string | null;
  internalDate: string | null;
  isPhishingRisk?: boolean;
};

type MobileEmailScrollContentProps = {
  message: MobileMessage;
  preferFormatted?: boolean;
  className?: string;
};

export function MobileEmailScrollContent({
  message,
  preferFormatted = false,
  className = ""
}: MobileEmailScrollContentProps) {
  return (
    <div
      className={`${MOBILE_EMAIL_SCROLL_CLASS} px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${className}`}
    >
      {message.isPhishingRisk ? <PhishingWarningBanner /> : null}
      <h2 className="text-lg font-semibold leading-snug">{message.subject ?? "(No subject)"}</h2>
      <p className="mt-1 text-xs text-ableton-muted">{message.fromAddress ?? "Unknown sender"}</p>
      <p className="mb-3 font-mono text-[10px] text-ableton-orange">
        {message.internalDate ? new Date(message.internalDate).toLocaleString() : "No timestamp"}
      </p>
      <MessageBodyPanel
        messageId={message.gmailId}
        fallbackSnippet={message.snippet}
        preferFormatted={preferFormatted}
        embedded
      />
    </div>
  );
}
