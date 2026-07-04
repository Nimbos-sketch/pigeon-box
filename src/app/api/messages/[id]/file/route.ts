import { z } from "zod";
import { auth } from "@/lib/auth";
import { fileMessageToFolder } from "@/server/gmail/folders";
import { getMessageById } from "@/server/gmail/service";
import { recordSenderAction } from "@/server/sender-rules/service";
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
    const message = await getMessageById(session.user.id, id);
    const result = await fileMessageToFolder(session.user.id, id, folderId);
    const senderRule = await recordSenderAction(session.user.id, message.fromAddress, "file", folderId);
    return ok({ result, senderRule });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/[id]/file");
  }
}
