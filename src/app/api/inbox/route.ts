import { auth } from "@/lib/auth";
import { classifyObligationQueue } from "@/lib/inbox-queues";
import { isPhishingRisk } from "@/lib/phishing-guard";
import { withNsfwFlag } from "@/lib/nsfw-filter";
import { logger } from "@/lib/logger";
import { ensureOrgMembership } from "@/server/org/membership";
import { listInboxMessages } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";
import {
  applyAutoSenderRules,
  buildSenderHint,
  getSenderRulesMap,
  type SenderRuleView
} from "@/server/sender-rules/service";

function shouldAutoHandleInbox(labelId: string | null, query: string | null): boolean {
  if (labelId === "INBOX") {
    return true;
  }
  if (!labelId && (!query || query.includes("in:inbox"))) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  const { searchParams } = new URL(request.url);
  const labelId = searchParams.get("labelId");
  const query = searchParams.get("q");
  try {
    await ensureOrgMembership(session.user.id, session.user.email);
    const data = await listInboxMessages(session.user.id, {
      q: query ?? undefined,
      labelIds: labelId ? [labelId] : undefined,
      pageToken: searchParams.get("pageToken") ?? undefined
    });

    let rulesMap = new Map<string, SenderRuleView>();
    let sourceMessages = data.messages;
    let autoHandled: Awaited<ReturnType<typeof applyAutoSenderRules>>["autoHandled"] = [];

    try {
      rulesMap = await getSenderRulesMap(session.user.id);
      if (shouldAutoHandleInbox(labelId, query)) {
        const autoResult = await applyAutoSenderRules(session.user.id, sourceMessages);
        sourceMessages = autoResult.remaining;
        autoHandled = autoResult.autoHandled;
      }
    } catch (senderRulesError) {
      logger.warn({ err: String(senderRulesError) }, "Sender rules unavailable — run prisma migrate deploy");
    }

    return ok({
      ...data,
      messages: sourceMessages.map((message) => {
        const flagged = withNsfwFlag({
          subject: message.subject,
          fromAddress: message.fromAddress,
          snippet: message.snippet
        });
        const senderHint = flagged.isNsfw ? null : buildSenderHint(message.fromAddress, rulesMap);
        return {
          ...message,
          subject: flagged.subject ?? message.subject,
          fromAddress: flagged.fromAddress ?? message.fromAddress,
          snippet: flagged.snippet ?? message.snippet,
          isNsfw: flagged.isNsfw,
          isPhishingRisk: flagged.isNsfw
            ? false
            : isPhishingRisk({
                subject: message.subject,
                fromAddress: message.fromAddress,
                snippet: message.snippet
              }),
          obligationQueue: flagged.isNsfw
            ? "action"
            : classifyObligationQueue({
                subject: message.subject,
                fromAddress: message.fromAddress,
                snippet: message.snippet
              }),
          senderHint,
          accentColor: senderHint?.folderColor ?? null
        };
      }),
      autoHandled
    });
  } catch (error) {
    return handleApiError(error, "GET /api/inbox");
  }
}
