import { auth } from "@/lib/auth";
import { listInboxMessages } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  const { searchParams } = new URL(request.url);
  try {
    const data = await listInboxMessages(session.user.id, {
      q: searchParams.get("q") ?? undefined,
      pageToken: searchParams.get("pageToken") ?? undefined
    });
    return ok(data);
  } catch (error) {
    return handleApiError(error, "GET /api/inbox");
  }
}
