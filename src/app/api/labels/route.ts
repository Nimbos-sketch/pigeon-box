import { auth } from "@/lib/auth";
import { listLabels } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  try {
    const labels = await listLabels(session.user.id);
    return ok({ labels: labels.map((label) => ({ id: label.id, name: label.name })) });
  } catch (error) {
    return handleApiError(error, "GET /api/labels");
  }
}
