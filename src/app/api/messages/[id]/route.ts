import { auth } from "@/lib/auth";
import { isNsfwEmail } from "@/lib/nsfw-filter";
import { getMessageById } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  const { id } = await params;
  try {
    const message = await getMessageById(session.user.id, id);
    const isNsfw = isNsfwEmail({
      subject: message.subject,
      fromAddress: message.fromAddress,
      snippet: message.snippet
    });
    if (isNsfw) {
      return ok({
        message: {
          gmailId: message.gmailId,
          isNsfw: true,
          subject: "Content blocked",
          fromAddress: "Sender hidden",
          snippet: "This message was hidden by the NSFW filter.",
          bodyText: null,
          bodyHtml: null,
          isUnread: message.isUnread,
          internalDate: message.internalDate
        }
      });
    }
    return ok({ message: { ...message, isNsfw: false } });
  } catch (error) {
    return handleApiError(error, "GET /api/messages/[id]");
  }
}
