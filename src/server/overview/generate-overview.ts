import { isNsfwEmail } from "@/lib/nsfw-filter";
import { createGmailClient } from "@/server/gmail/client";
import { logger } from "@/lib/logger";
import { getOverviewFilter, type OverviewFilterId } from "@/lib/overview-filters";
import type { OverviewItem } from "@/server/overview/types";

type RawMessage = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: Date;
};

function parseSender(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match?.[1]) {
    return match[1].trim();
  }
  return from.split("@")[0] || "Unknown sender";
}

function scoreForFilter(subject: string, snippet: string, filterId: OverviewFilterId): number {
  if (filterId === "recent48h") {
    return 1;
  }

  if (filterId === "noticeboard") {
    let score = 0;
    const text = `${subject} ${snippet}`;
    const filter = getOverviewFilter(filterId);
    if (filter.keywords.test(text)) score += 5;
    if (/\b(noreply|no-reply|notifications?|billing|support|admin|accounts?)\b/i.test(text)) score += 1;
    if (/\b(sale|discount|coupon|promo|% off|unsubscribe)\b/i.test(text)) score -= 3;
    return score;
  }

  const filter = getOverviewFilter(filterId);
  const text = `${subject} ${snippet}`;
  let score = 0;
  if (filter.keywords.test(text)) score += 4;
  if (subject.length > 8) score += 1;
  if (filterId === "all" && /\b(unsubscribe|promo)\b/i.test(text)) score += 1;
  if (filterId !== "deals" && /\b(unsubscribe)\b/i.test(text) && !filter.keywords.test(text)) score -= 1;
  return score;
}

function cleanSubject(subject: string): string {
  return subject.replace(/^(re:|fwd?:)\s*/gi, "").trim();
}

function inferNoticeType(subject: string, snippet: string): OverviewItem["noticeType"] {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (/\b(maintenance|downtime|outage|incident|deployment)\b/.test(text)) return "maintenance";
  if (/\b(billing|invoice|payment|receipt|subscription|renewal)\b/.test(text)) return "billing";
  if (/\b(security|password|verification|suspicious|2fa|login)\b/.test(text)) return "security";
  if (/\b(product update|changelog|release|feature|api)\b/.test(text)) return "product";
  if (/\b(account|policy|terms|profile)\b/.test(text)) return "account";
  return "general";
}

function buildFallbackItem(message: RawMessage, filterId?: OverviewFilterId): OverviewItem {
  const sender = parseSender(message.from);
  const topic = cleanSubject(message.subject) || "a new message";
  const snippet = message.snippet?.trim();

  const summary = snippet
    ? `${sender} wrote about ${topic.toLowerCase()} — ${snippet}`
    : `${sender} sent you something about ${topic.toLowerCase()}. Open it to read the full message.`;

  return {
    id: message.id,
    headline: topic,
    summary,
    source: sender,
    receivedAt: message.receivedAt.toISOString(),
    messageId: message.id,
    noticeType: filterId === "noticeboard" ? inferNoticeType(message.subject, message.snippet) : undefined
  };
}

function buildFallbackOverview(messages: RawMessage[], filterId: OverviewFilterId): OverviewItem[] {
  if (filterId === "noticeboard") {
    return messages
      .map((message) => ({
        message,
        score: scoreForFilter(message.subject, message.snippet, filterId)
      }))
      .filter((entry) => entry.score >= 2)
      .sort((a, b) => b.message.receivedAt.getTime() - a.message.receivedAt.getTime())
      .slice(0, 12)
      .map(({ message }) => buildFallbackItem(message, filterId));
  }

  if (filterId === "recent48h") {
    return messages
      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
      .slice(0, 10)
      .map((message) => buildFallbackItem(message, filterId));
  }

  const ranked = messages
    .map((message) => ({
      message,
      score: scoreForFilter(message.subject, message.snippet, filterId)
    }))
    .sort((a, b) => b.score - a.score || b.message.receivedAt.getTime() - a.message.receivedAt.getTime());

  const threshold = filterId === "all" ? 0 : 1;
  const picks = ranked.filter((entry) => entry.score >= threshold).slice(0, 8);
  const fallbackPool = picks.length > 0 ? picks : ranked.slice(0, 6);

  return fallbackPool.map(({ message }) => buildFallbackItem(message, filterId));
}

function buildAiSystemPrompt(filterId: OverviewFilterId): string {
  const filter = getOverviewFilter(filterId);
  const rewriteRules = [
    "Rewrite every email in your own words — never copy the subject line or Gmail snippet verbatim.",
    "headline: a fresh, concise title you create (under 90 chars) that captures what the email is really about.",
    "summary: 1-2 sentences in plain language explaining the key point, request, or information (under 200 chars).",
    "source: sender name or organization.",
    'Return JSON: { "items": [{ "id": string, "headline": string, "summary": string, "source": string, "receivedAt": string, "messageId": string, "noticeType": "maintenance" | "billing" | "security" | "product" | "account" | "general" }] }.'
  ].join(" ");

  if (filterId === "noticeboard") {
    return [
      "You are building a business notice board from service update emails (SaaS tools, vendors, platforms, utilities, billing, security, maintenance, and account notices).",
      "Each item is a bulletin for the business team — not marketing promos or newsletters.",
      rewriteRules,
      "noticeType: classify each notice as maintenance, billing, security, product, account, or general.",
      "Include 6-12 genuine business service updates only.",
      "Order by urgency then recency (maintenance/security first, then billing/account, then product).",
      "Summaries should state what changed and whether any action is needed."
    ].join(" ");
  }

  if (filterId === "recent48h") {
    return [
      "You are an inbox briefing assistant summarizing the user's last 48 hours of inbox mail.",
      rewriteRules,
      "Include 8-12 items covering the most recent and substantive emails.",
      "Order items newest first.",
      "Each summary should explain what the email is actually about, not just repeat its title."
    ].join(" ");
  }

  return [
    `You are an inbox briefing assistant for category "${filter.label}".`,
    `Category focus: ${filter.description}.`,
    rewriteRules,
    "Pick 5-8 best matches for this category.",
    "Each summary should explain what the email is actually about, not just repeat its title."
  ].join(" ");
}

async function buildAiOverview(messages: RawMessage[], filterId: OverviewFilterId): Promise<OverviewItem[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || messages.length === 0) {
    return null;
  }

  const messageLimit = filterId === "recent48h" ? 40 : filterId === "noticeboard" ? 35 : 25;
  const compact = messages.slice(0, messageLimit).map((message) => ({
    id: message.id,
    subject: message.subject,
    from: message.from,
    snippet: message.snippet,
    receivedAt: message.receivedAt.toISOString()
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildAiSystemPrompt(filterId)
          },
          {
            role: "user",
            content: JSON.stringify(compact)
          }
        ]
      })
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "OpenAI overview request failed");
      return null;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { items?: OverviewItem[] };
    if (!parsed.items?.length) return null;

    return parsed.items.map((item, index) => ({
      id: item.id || item.messageId || `ai-${index}`,
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      receivedAt: item.receivedAt,
      messageId: item.messageId || item.id,
      noticeType: item.noticeType ?? (filterId === "noticeboard" ? "general" : undefined)
    }));
  } catch (error) {
    logger.warn({ err: error }, "Failed to generate AI overview");
    return null;
  }
}

function headerValue(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  key: string
): string {
  return headers?.find((header) => header.name?.toLowerCase() === key.toLowerCase())?.value ?? "";
}

export async function generateEmailOverview(
  userId: string,
  filterId: OverviewFilterId = "all"
): Promise<{
  items: OverviewItem[];
  generatedBy: "ai" | "rules";
  filter: OverviewFilterId;
}> {
  const filter = getOverviewFilter(filterId);
  const { gmail } = await createGmailClient(userId);
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: filter.gmailQuery,
    maxResults: filterId === "recent48h" ? 50 : filterId === "noticeboard" ? 50 : 40
  });

  const messageRefs = listResponse.data.messages ?? [];
  const rawMessages = await Promise.all(
    messageRefs.map(async (ref) => {
      if (!ref.id) return null;
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: ref.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From"]
      });
      const headers = detail.data.payload?.headers;
      const subject = headerValue(headers, "subject");
      const from = headerValue(headers, "from");
      const receivedAt = detail.data.internalDate ? new Date(Number(detail.data.internalDate)) : new Date();
      return {
        id: ref.id,
        subject,
        from,
        snippet: detail.data.snippet ?? "",
        receivedAt
      } satisfies RawMessage;
    })
  );

  const messages = rawMessages
    .filter((message): message is RawMessage => message !== null)
    .filter((message) => !isNsfwEmail({ subject: message.subject, fromAddress: message.from, snippet: message.snippet }));
  const aiItems = await buildAiOverview(messages, filterId);
  if (aiItems?.length) {
    return { items: aiItems, generatedBy: "ai", filter: filterId };
  }

  return { items: buildFallbackOverview(messages, filterId), generatedBy: "rules", filter: filterId };
}
