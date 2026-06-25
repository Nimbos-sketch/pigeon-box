import { auth } from "@/lib/auth";
import { getMessageById } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  const { id } = await params;
  try {
    const message = await getMessageById(session.user.id, id);
    return ok({ message });
  } catch (error) {
    return handleApiError(error, "GET /api/messages/[id]");
  }
}
