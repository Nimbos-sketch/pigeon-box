import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteMessage, modifyMessage } from "@/server/gmail/service";
import { fail, handleApiError, ok } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum([
    "archive",
    "read",
    "unread",
    "star",
    "unstar",
    "trash",
    "restore",
    "delete_forever",
    "spam",
    "not_spam"
  ])
});

const actionMap: Record<string, { addLabelIds?: string[]; removeLabelIds?: string[] }> = {
  archive: { addLabelIds: [], removeLabelIds: ["INBOX"] },
  read: { addLabelIds: [], removeLabelIds: ["UNREAD"] },
  unread: { addLabelIds: ["UNREAD"], removeLabelIds: [] },
  star: { addLabelIds: ["STARRED"], removeLabelIds: [] },
  unstar: { addLabelIds: [], removeLabelIds: ["STARRED"] },
  trash: { addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"] },
  restore: { addLabelIds: ["INBOX"], removeLabelIds: ["TRASH"] },
  spam: { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] },
  not_spam: { addLabelIds: ["INBOX"], removeLabelIds: ["SPAM"] }
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }
  try {
    const json = await request.json();
    const parsed = actionSchema.parse(json);
    const { id } = await params;

    if (parsed.action === "delete_forever") {
      await deleteMessage(session.user.id, id);
      return ok({ result: { id, deleted: true } });
    }

    const result = await modifyMessage(session.user.id, id, actionMap[parsed.action]);
    return ok({ result });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/[id]/actions");
  }
}
