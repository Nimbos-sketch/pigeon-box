import { z } from "zod";
import { auth } from "@/lib/auth";
import { forwardMessage } from "@/server/gmail/compose";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const forwardSchema = z.object({
  to: z.string().min(3),
  cc: z.string().optional(),
  body: z.string().optional()
});

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = forwardSchema.parse(json);
    const result = await forwardMessage(session.user.id, id, parsed);
    return ok({ message: result });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/[id]/forward");
  }
}
