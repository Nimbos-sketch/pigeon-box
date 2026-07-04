import { z } from "zod";
import { auth } from "@/lib/auth";
import { normalizeFolderColor } from "@/lib/folder-colors";
import { updateUserFolderColor } from "@/server/gmail/folders";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const json = await request.json();
    const { color } = patchSchema.parse(json);
    const folder = await updateUserFolderColor(session.user.id, id, normalizeFolderColor(color));
    return ok({ folder });
  } catch (error) {
    return handleApiError(error, "PATCH /api/folders/[id]");
  }
}
