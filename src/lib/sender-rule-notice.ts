import type { SenderRuleView } from "@/lib/sender-rules";

export function formatSenderRuleNotice(rule: SenderRuleView | null | undefined): string | null {
  if (!rule) {
    return null;
  }
  if (rule.autoApply) {
    return `Smart handling ON for ${rule.senderLabel} — future ${rule.preferredAction} emails auto-clear from your queue.`;
  }
  if (rule.actionsUntilAuto > 0) {
    return `${rule.actionsUntilAuto} more ${rule.preferredAction} from ${rule.senderLabel} enables auto-handle.`;
  }
  return null;
}
