import { auth } from "@/lib/auth";
import { withNsfwFlag } from "@/lib/nsfw-filter";
import { listInboxMessages } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  const { searchParams } = new URL(request.url);
  const labelId = searchParams.get("labelId");
  try {
    const data = await listInboxMessages(session.user.id, {
      q: searchParams.get("q") ?? undefined,
      labelIds: labelId ? [labelId] : undefined,
      pageToken: searchParams.get("pageToken") ?? undefined
    });
    return ok({
      ...data,
      messages: data.messages.map((message) => {
        const flagged = withNsfwFlag({
          subject: message.subject,
          fromAddress: message.fromAddress,
          snippet: message.snippet
        });
        return {
          ...message,
          subject: flagged.subject ?? message.subject,
          fromAddress: flagged.fromAddress ?? message.fromAddress,
          snippet: flagged.snippet ?? message.snippet,
          isNsfw: flagged.isNsfw
        };
      })
    });
  } catch (error) {
    return handleApiError(error, "GET /api/inbox");
  }
}
