export type ObligationQueue = "response" | "action";

export type QueueClassifyInput = {
  subject?: string | null;
  fromAddress?: string | null;
  snippet?: string | null;
};

const NOREPLY_SENDER = /no[-_.]?reply|donotreply|mailer-daemon|notifications?@/i;

const ACTION_PATTERN =
  /\b(receipt|invoice|order confirmed|shipped|delivered|tracking|notification|alert|statement|password reset|verification code|unsubscribe|newsletter|digest|summary|auto[- ]?reply)\b/i;

const RESPONSE_PATTERN =
  /\?|\b(please (confirm|reply|respond|let me know)|your (input|feedback|approval|response)|rsvp|waiting for your|can you|could you|need your|follow up|following up)\b/i;

const DIRECT_ADDRESS_PATTERN = /\b(hi|hello|dear|thanks for|thank you for)\b/i;

export function classifyObligationQueue(input: QueueClassifyInput): ObligationQueue {
  const subject = input.subject ?? "";
  const fromAddress = input.fromAddress ?? "";
  const snippet = input.snippet ?? "";
  const text = `${subject} ${fromAddress} ${snippet}`;

  if (NOREPLY_SENDER.test(fromAddress)) {
    return "action";
  }

  const wantsResponse = RESPONSE_PATTERN.test(text);
  const looksAutomated = ACTION_PATTERN.test(text);

  if (wantsResponse && !looksAutomated) {
    return "response";
  }

  if (looksAutomated) {
    return "action";
  }

  if (subject.toLowerCase().startsWith("re:") || DIRECT_ADDRESS_PATTERN.test(snippet)) {
    return "response";
  }

  if (text.includes("?")) {
    return "response";
  }

  return "action";
}

export function countByQueue<T extends QueueClassifyInput>(
  messages: T[],
  classify: (input: T) => ObligationQueue = classifyObligationQueue
): { response: number; action: number } {
  return messages.reduce(
    (counts, message) => {
      const queue = classify(message);
      counts[queue] += 1;
      return counts;
    },
    { response: 0, action: 0 }
  );
}
