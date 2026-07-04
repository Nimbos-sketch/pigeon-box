import { z } from "zod";
import { auth } from "@/lib/auth";
import { respondToTeamLink } from "@/server/pigeon-holes/service";
import { fail, handleApiError, ok } from "@/server/http";

const respondSchema = z.object({
  accept: z.boolean()
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { id } = await context.params;
    const parsed = respondSchema.parse(await request.json());
    const updated = await respondToTeamLink({
      userId: session.user.id,
      email: session.user.email,
      linkId: id,
      accept: parsed.accept
    });
    if (!updated) {
      return fail("Link not found or access denied", 404);
    }
    return ok({ updated: true });
  } catch (error) {
    return handleApiError(error, "PATCH /api/org/team-links/[id]");
  }
}
