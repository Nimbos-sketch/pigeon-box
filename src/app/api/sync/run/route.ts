import { auth } from "@/lib/auth";
import { syncMailbox } from "@/server/sync/sync-engine";
import { fail, handleApiError, ok } from "@/server/http";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const result = await syncMailbox(session.user.id);
    return ok(result);
  } catch (error) {
    return handleApiError(error, "POST /api/sync/run");
  }
}
