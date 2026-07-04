import { z } from "zod";
import { auth } from "@/lib/auth";
import { QUICK_REPLY_TEMPLATES, type QuickReplyTemplate } from "@/lib/inbox-disposition";
import { replyToMessage } from "@/server/gmail/compose";
import { getMessageById } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const quickReplySchema = z.object({
  template: z.enum(["on_it", "received", "will_review"])
});

function resolveReplyTo(fromAddress: string | null): string | null {
  if (!fromAddress) {
    return null;
  }
  const bracketMatch = fromAddress.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1];
  }
  const plainMatch = fromAddress.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return plainMatch?.[0] ?? null;
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = quickReplySchema.parse(json);
    const template = parsed.template as QuickReplyTemplate;
    const message = await getMessageById(session.user.id, id);
    const to = resolveReplyTo(message.fromAddress);
    if (!to) {
      return fail("Could not determine reply recipient", 400);
    }

    const result = await replyToMessage(session.user.id, id, {
      to,
      body: QUICK_REPLY_TEMPLATES[template]
    });

    return ok({ message: result });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/[id]/quick-reply");
  }
}
