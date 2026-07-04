import { z } from "zod";
import { auth } from "@/lib/auth";
import { listHoleMessages, sendToPigeonHole } from "@/server/pigeon-holes/service";
import { fail, handleApiError, ok } from "@/server/http";

const sendSchema = z.object({
  subject: z.string().min(2).max(160),
  body: z.string().min(4).max(4000),
  obligationQueue: z.enum(["response", "action"]).default("action")
});

type RouteContext = { params: Promise<{ holeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { holeId } = await context.params;
    const data = await listHoleMessages({
      userId: session.user.id,
      email: session.user.email,
      holeId
    });
    if (!data) {
      return fail("Hole not found or access denied", 404);
    }
    return ok(data);
  } catch (error) {
    return handleApiError(error, "GET /api/org/pigeon-holes/[holeId]/messages");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { holeId } = await context.params;
    const parsed = sendSchema.parse(await request.json());
    const message = await sendToPigeonHole({
      userId: session.user.id,
      email: session.user.email,
      holeId,
      subject: parsed.subject,
      body: parsed.body,
      obligationQueue: parsed.obligationQueue
    });
    if (!message) {
      return fail("Cannot send to this hole", 400);
    }
    return ok({ message });
  } catch (error) {
    return handleApiError(error, "POST /api/org/pigeon-holes/[holeId]/messages");
  }
}
