import { z } from "zod";
import { auth } from "@/lib/auth";
import { updatePigeonHoleMessage } from "@/server/pigeon-holes/service";
import { fail, handleApiError, ok } from "@/server/http";

const patchSchema = z.object({
  status: z.enum(["read", "archived"])
});

type RouteContext = { params: Promise<{ messageId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { messageId } = await context.params;
    const parsed = patchSchema.parse(await request.json());
    const updated = await updatePigeonHoleMessage({
      userId: session.user.id,
      email: session.user.email,
      messageId,
      status: parsed.status
    });
    if (!updated) {
      return fail("Message not found or access denied", 404);
    }
    return ok({ updated: true });
  } catch (error) {
    return handleApiError(error, "PATCH /api/org/pigeon-holes/messages/[messageId]");
  }
}
