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
  const filter = getOverviewFilter(filterId);
  const text = `${subject} ${snippet}`;
  let score = 0;
  if (filter.keywords.test(text)) score += 4;
  if (subject.length > 8) score += 1;
  if (filterId === "all" && /\b(unsubscribe|promo)\b/i.test(text)) score += 1;
  if (filterId !== "deals" && /\b(unsubscribe)\b/i.test(text) && !filter.keywords.test(text)) score -= 1;
  return score;
}

function buildFallbackOverview(messages: RawMessage[], filterId: OverviewFilterId): OverviewItem[] {
  const ranked = messages
    .map((message) => ({
      message,
      score: scoreForFilter(message.subject, message.snippet, filterId)
    }))
    .sort((a, b) => b.score - a.score || b.message.receivedAt.getTime() - a.message.receivedAt.getTime());

  const threshold = filterId === "all" ? 0 : 1;
  const picks = ranked.filter((entry) => entry.score >= threshold).slice(0, 8);
  const fallbackPool = picks.length > 0 ? picks : ranked.slice(0, 6);

  return fallbackPool.map(({ message }) => ({
    id: message.id,
    headline: message.subject || "New inbox update",
    summary: message.snippet || "Open this email for more details.",
    source: parseSender(message.from),
    receivedAt: message.receivedAt.toISOString(),
    messageId: message.id
  }));
}

async function buildAiOverview(messages: RawMessage[], filterId: OverviewFilterId): Promise<OverviewItem[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || messages.length === 0) {
    return null;
  }

  const filter = getOverviewFilter(filterId);
  const compact = messages.slice(0, 25).map((message) => ({
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
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You summarize inbox emails into short highlights for category: "${filter.label}". Category focus: ${filter.description}. Return JSON: { "items": [{ "id": string, "headline": string, "summary": string, "source": string, "receivedAt": string, "messageId": string }] }. Pick 5-8 best matches for this category. Keep headlines under 90 chars and summaries under 180 chars.`
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
      messageId: item.messageId || item.id
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
    maxResults: 40
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

  const messages = rawMessages.filter((message): message is RawMessage => message !== null);
  const aiItems = await buildAiOverview(messages, filterId);
  if (aiItems?.length) {
    return { items: aiItems, generatedBy: "ai", filter: filterId };
  }

  return { items: buildFallbackOverview(messages, filterId), generatedBy: "rules", filter: filterId };
}
