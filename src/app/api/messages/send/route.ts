import { z } from "zod";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/server/gmail/compose";
import { fail, handleApiError, ok } from "@/server/http";

const sendSchema = z.object({
  to: z.string().min(3),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  threadId: z.string().optional()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("Unauthorized", 401);

  try {
    const json = await request.json();
    const parsed = sendSchema.parse(json);
    const result = await sendEmail(session.user.id, parsed);
    return ok({ message: result });
  } catch (error) {
    return handleApiError(error, "POST /api/messages/send");
  }
}
