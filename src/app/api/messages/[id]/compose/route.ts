import { z } from "zod";
import { auth } from "@/lib/auth";
import { getComposePrefill } from "@/server/gmail/compose";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  if (mode !== "reply" && mode !== "forward") {
    return fail("mode must be reply or forward", 400);
  }

  try {
    const { id } = await params;
    const prefill = await getComposePrefill(session.user.id, mode, id);
    return ok({ prefill, mode });
  } catch (error) {
    return handleApiError(error, "GET /api/messages/[id]/compose");
  }
}
