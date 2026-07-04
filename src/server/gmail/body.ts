type GmailPayload = {
  mimeType?: string | null;
  body?: { data?: string | null };
  parts?: unknown[];
};

function decodeBodyData(data?: string | null): string {
  if (!data) {
    return "";
  }
  return Buffer.from(data, "base64").toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function collectBodies(payload: GmailPayload | null | undefined, textParts: string[], htmlParts: string[]) {
  if (!payload) {
    return;
  }

  const mimeType = payload.mimeType ?? "";
  if (mimeType === "text/plain" && payload.body?.data) {
    textParts.push(decodeBodyData(payload.body.data));
  } else if (mimeType === "text/html" && payload.body?.data) {
    htmlParts.push(decodeBodyData(payload.body.data));
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      collectBodies(part as GmailPayload, textParts, htmlParts);
    }
  }
}

export function extractBodiesFromPayload(
  payload: GmailPayload | null | undefined
): { text: string; html: string | null } {
  const textParts: string[] = [];
  const htmlParts: string[] = [];
  collectBodies(payload, textParts, htmlParts);

  const html = htmlParts.join("").trim() || null;
  const text = textParts.join("\n\n").trim() || (html ? stripHtml(html) : "");

  return { text, html };
}

export function extractBodyFromPayload(payload: GmailPayload | null | undefined): string {
  return extractBodiesFromPayload(payload).text;
}
