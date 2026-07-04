import { z } from "zod";
import { auth } from "@/lib/auth";
import { normalizeFolderColor } from "@/lib/folder-colors";
import { createUserFolder, listUserFolders } from "@/server/gmail/folders";
import { fail, handleApiError, ok } from "@/server/http";

const createFolderSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const folders = await listUserFolders(session.user.id);
    return ok({ folders });
  } catch (error) {
    return handleApiError(error, "GET /api/folders");
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const json = await request.json();
    const { name, color } = createFolderSchema.parse(json);
    const folder = await createUserFolder(session.user.id, name, color);
    return ok({ folder });
  } catch (error) {
    return handleApiError(error, "POST /api/folders");
  }
}
