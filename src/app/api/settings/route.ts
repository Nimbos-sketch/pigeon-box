import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getAutoForwarding,
  getUserSettings,
  listForwardingAddresses,
  updateUserSettings
} from "@/server/settings/service";
import { fail, handleApiError, ok } from "@/server/http";

const settingsSchema = z.object({
  displayName: z.string().nullable().optional(),
  signature: z.string().nullable().optional(),
  replyBehavior: z.enum(["reply", "replyAll"]).optional(),
  forwardPrefix: z.string().optional(),
  autoBcc: z.string().nullable().optional(),
  vacationEnabled: z.boolean().optional(),
  vacationMessage: z.string().nullable().optional()
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  try {
    const [settings, forwardingAddresses, autoForwarding] = await Promise.all([
      getUserSettings(session.user.id),
      listForwardingAddresses(session.user.id).catch(() => []),
      getAutoForwarding(session.user.id).catch(() => null)
    ]);
    return ok({ settings, forwardingAddresses, autoForwarding });
  } catch (error) {
    return handleApiError(error, "GET /api/settings");
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  try {
    const json = await request.json();
    const parsed = settingsSchema.parse(json);
    const settings = await updateUserSettings(session.user.id, parsed);
    return ok({ settings });
  } catch (error) {
    return handleApiError(error, "PATCH /api/settings");
  }
}
