import { z } from "zod";
import { auth } from "@/lib/auth";
import { createPigeonHole, listTeamPigeonHoles } from "@/server/pigeon-holes/service";
import { fail, handleApiError, ok } from "@/server/http";

const createHoleSchema = z.object({
  email: z.string().email(),
  label: z.string().min(1).max(80).optional(),
  scope: z.enum(["personal", "team"]).default("personal")
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const forceProvision = new URL(request.url).searchParams.get("provision") === "1";
    if (forceProvision) {
      const { ensureOrgMembership } = await import("@/server/org/membership");
      const { ensureOrgPigeonHoles } = await import("@/server/pigeon-holes/service");
      const org = await ensureOrgMembership(session.user.id, session.user.email ?? null);
      if (org) {
        await ensureOrgPigeonHoles(org.orgId);
      }
    }

    const data = await listTeamPigeonHoles(session.user.id, session.user.email ?? null);
    return ok(data);
  } catch (error) {
    return handleApiError(error, "GET /api/org/pigeon-holes");
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const parsed = createHoleSchema.parse(await request.json());
    const hole = await createPigeonHole({
      userId: session.user.id,
      email: session.user.email,
      targetEmail: parsed.email,
      label: parsed.label,
      scope: parsed.scope
    });
    if (!hole) {
      return fail("Could not create pigeon hole", 400);
    }
    return ok({ hole });
  } catch (error) {
    return handleApiError(error, "POST /api/org/pigeon-holes");
  }
}
