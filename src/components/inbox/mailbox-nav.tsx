"use client";

import { MAILBOX_VIEWS, type MailboxViewId } from "@/lib/mailbox-views";

type MailboxNavProps = {
  activeMailbox: MailboxViewId;
  onMailboxChange: (mailboxId: MailboxViewId) => void;
};

export function MailboxNav({ activeMailbox, onMailboxChange }: MailboxNavProps) {
  return (
    <div className="flex flex-wrap gap-2 p-3">
      {MAILBOX_VIEWS.map((view) => {
        const isActive = view.id === activeMailbox;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onMailboxChange(view.id)}
            className={`ableton-chip ${isActive ? "ableton-chip-active" : ""}`}
            title={view.gmailQuery}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
