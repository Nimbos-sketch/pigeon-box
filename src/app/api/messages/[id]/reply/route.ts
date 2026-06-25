import { z } from "zod";
import { auth } from "@/lib/auth";
import { replyToMessage } from "@/server/gmail/compose";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const replySchema = z.object({
  to: z.string().min(3),
  cc: z.string().optional(),
  body: z.string().min(1)
});

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = replySchema.parse(json);
    const result = await replyToMessage(session.user.id, id, parsed);
    return ok({ message: result });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/[id]/reply");
  }
}
