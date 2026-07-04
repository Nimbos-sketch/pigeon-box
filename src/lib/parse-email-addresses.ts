const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.\w+/g;

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const bracketMatch = trimmed.match(/<([^>]+)>/);
  const candidate = bracketMatch?.[1] ?? trimmed;
  const plain = candidate.match(EMAIL_PATTERN)?.[0];
  return plain?.toLowerCase() ?? null;
}

export function parseRecipientEmails(...fields: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const field of fields) {
    if (!field) {
      continue;
    }
    const matches = field.match(EMAIL_PATTERN) ?? [];
    for (const match of matches) {
      const email = match.toLowerCase();
      if (!seen.has(email)) {
        seen.add(email);
        results.push(email);
      }
    }
  }

  return results;
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
