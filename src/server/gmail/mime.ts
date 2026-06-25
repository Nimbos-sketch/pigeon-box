export type RawEmailInput = {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
};

export function encodeRawEmail(input: RawEmailInput): string {
  const lines = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    input.cc ? `Cc: ${input.cc}` : null,
    input.bcc ? `Bcc: ${input.bcc}` : null,
    `Subject: ${input.subject}`,
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
    input.references ? `References: ${input.references}` : null,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.body
  ].filter((line): line is string => line !== null);

  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildForwardBody(original: {
  fromAddress?: string | null;
  toAddress?: string | null;
  subject?: string | null;
  body?: string | null;
  receivedAt?: string | null;
}): string {
  return [
    "",
    "---------- Forwarded message ----------",
    original.fromAddress ? `From: ${original.fromAddress}` : null,
    original.receivedAt ? `Date: ${original.receivedAt}` : null,
    original.subject ? `Subject: ${original.subject}` : null,
    original.toAddress ? `To: ${original.toAddress}` : null,
    "",
    original.body ?? ""
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function buildReplyBody(originalBody: string, signature?: string | null): string {
  const sig = signature?.trim() ? `\n\n--\n${signature.trim()}` : "";
  return `\n\n${originalBody}${sig}`;
}
