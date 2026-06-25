import { z } from "zod";
import { auth } from "@/lib/auth";
import { fileMessageToFolder } from "@/server/gmail/folders";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const fileSchema = z.object({
  folderId: z.string().min(1)
});

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const json = await request.json();
    const { folderId } = fileSchema.parse(json);
    const { id } = await params;
    const result = await fileMessageToFolder(session.user.id, id, folderId);
    return ok({ result });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/[id]/file");
  }
}
