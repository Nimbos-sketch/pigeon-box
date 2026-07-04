import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteSenderRule, updateSenderRule, type SenderActionType } from "@/server/sender-rules/service";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  autoApply: z.boolean().optional(),
  preferredAction: z.enum(["spam", "trash", "archive", "file"]).optional(),
  folderId: z.string().nullable().optional()
});

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const json = await request.json();
    const data = patchSchema.parse(json);
    const rule = await updateSenderRule(session.user.id, id, {
      autoApply: data.autoApply,
      preferredAction: data.preferredAction as SenderActionType | undefined,
      folderId: data.folderId
    });
    return ok({ rule });
  } catch (error) {
    return handleApiError(error, "PATCH /api/rules/[id]");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    await deleteSenderRule(session.user.id, id);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/rules/[id]");
  }
}
