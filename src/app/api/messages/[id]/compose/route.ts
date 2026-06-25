import { z } from "zod";
import { auth } from "@/lib/auth";
import { isNsfwEmail } from "@/lib/nsfw-filter";
import { getComposePrefill } from "@/server/gmail/compose";
import { getMessageById } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  if (mode !== "reply" && mode !== "forward") {
    return fail("mode must be reply or forward", 400);
  }

  try {
    const { id } = await params;
    const message = await getMessageById(session.user.id, id);
    if (
      isNsfwEmail({
        subject: message.subject,
        fromAddress: message.fromAddress,
        snippet: message.snippet
      })
    ) {
      return fail("This message is blocked by the NSFW filter", 403);
    }
    const prefill = await getComposePrefill(session.user.id, mode, id);
    return ok({ prefill, mode });
  } catch (error) {
    return handleApiError(error, "GET /api/messages/[id]/compose");
  }
}
