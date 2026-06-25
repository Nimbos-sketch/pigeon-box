"use client";

import { MAILBOX_VIEWS, type MailboxViewId } from "@/lib/mailbox-views";

type MailboxNavProps = {
  activeMailbox: MailboxViewId;
  onMailboxChange: (mailboxId: MailboxViewId) => void;
};

export function MailboxNav({ activeMailbox, onMailboxChange }: MailboxNavProps) {
  return (
    <div className="mb-4 border border-ableton-border bg-ableton-pane2 px-3 py-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-ableton-muted">Mailboxes</p>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
