export type PhishingCheckInput = {
  subject?: string | null;
  fromAddress?: string | null;
  snippet?: string | null;
};

const URGENCY_PATTERN =
  /\b(urgent|immediately|act now|action required|within 24 hours|account suspended|unusual activity|verify now)\b/i;

const CREDENTIAL_PATTERN =
  /\b(password|credentials|sign[\s-]?in|log[\s-]?in|verify your account|confirm your identity|update your payment|bank account|ssn|social security)\b/i;

const SUSPICIOUS_LINK_PATTERN =
  /\b(click here|bit\.ly|tinyurl|t\.co|goo\.gl|shorturl|verify[\s-]?link)\b/i;

const SPOOFED_BRAND_PATTERN =
  /\b(paypal|apple id|microsoft|google account|amazon|netflix|bank of america|chase|wells fargo)\b/i;

function extractEmailAddress(fromAddress: string): string | null {
  const bracketMatch = fromAddress.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1].toLowerCase();
  }
  const plainMatch = fromAddress.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return plainMatch?.[0]?.toLowerCase() ?? null;
}

function domainLooksSuspicious(email: string, text: string): boolean {
  const domain = email.split("@")[1] ?? "";
  if (!domain) {
    return false;
  }

  const brandMentioned = SPOOFED_BRAND_PATTERN.test(text);
  const officialDomains: Record<string, RegExp> = {
    paypal: /paypal\.com$/i,
    apple: /apple\.com$/i,
    microsoft: /(microsoft|outlook|live|office365)\.com$/i,
    google: /google\.com$/i,
    amazon: /amazon\.(com|co\.uk)$/i,
    netflix: /netflix\.com$/i
  };

  if (!brandMentioned) {
    return false;
  }

  for (const pattern of Object.values(officialDomains)) {
    if (pattern.test(domain)) {
      return false;
    }
  }

  return true;
}

export function isPhishingRisk(input: PhishingCheckInput): boolean {
  const subject = input.subject ?? "";
  const fromAddress = input.fromAddress ?? "";
  const snippet = input.snippet ?? "";
  const text = `${subject} ${fromAddress} ${snippet}`;

  const hasUrgency = URGENCY_PATTERN.test(text);
  const asksForCredentials = CREDENTIAL_PATTERN.test(text);
  const hasSuspiciousLink = SUSPICIOUS_LINK_PATTERN.test(text);

  const email = fromAddress ? extractEmailAddress(fromAddress) : null;
  const spoofedDomain = email ? domainLooksSuspicious(email, text) : false;

  return (
    (hasUrgency && asksForCredentials) ||
    (asksForCredentials && hasSuspiciousLink) ||
    spoofedDomain ||
    (hasUrgency && spoofedDomain)
  );
}
