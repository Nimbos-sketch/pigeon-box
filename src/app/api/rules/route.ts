import { auth } from "@/lib/auth";
import { listSenderRules } from "@/server/sender-rules/service";
import { fail, handleApiError, ok } from "@/server/http";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const rules = await listSenderRules(session.user.id);
    return ok({ rules });
  } catch (error) {
    return handleApiError(error, "GET /api/rules");
  }
}
