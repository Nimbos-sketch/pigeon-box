export function extractSenderKey(fromAddress: string | null | undefined): string | null {
  if (!fromAddress) {
    return null;
  }

  const bracketMatch = fromAddress.match(/<([^>]+)>/);
  const email = (bracketMatch?.[1] ?? fromAddress).trim().toLowerCase();
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    return email || null;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!domain) {
    return email;
  }

  const genericLocal = /^(no[-_.]?reply|donotreply|notifications?|mailer-daemon|info|newsletter|updates?|support)$/i;
  if (genericLocal.test(local)) {
    return domain;
  }

  return email;
}

export function formatSenderKeyLabel(senderKey: string): string {
  return senderKey.includes("@") ? senderKey : `@${senderKey}`;
}
