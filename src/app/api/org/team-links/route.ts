import { z } from "zod";
import { auth } from "@/lib/auth";
import { listTeamLinks, requestTeamLink } from "@/server/pigeon-holes/service";
import { fail, handleApiError, ok } from "@/server/http";

const requestLinkSchema = z.object({
  partnerSlug: z.string().min(2).max(64)
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const links = await listTeamLinks(session.user.id, session.user.email);
    return ok({ links });
  } catch (error) {
    return handleApiError(error, "GET /api/org/team-links");
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const parsed = requestLinkSchema.parse(await request.json());
    const link = await requestTeamLink({
      userId: session.user.id,
      email: session.user.email,
      partnerSlug: parsed.partnerSlug
    });
    if (!link) {
      return fail("Could not request link — check slug and manager permissions", 400);
    }
    return ok({ link });
  } catch (error) {
    return handleApiError(error, "POST /api/org/team-links");
  }
}
