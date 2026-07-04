import { z } from "zod";
import { auth } from "@/lib/auth";
import { createOrgBroadcast, getOrgContext, listOrgBroadcasts } from "@/server/org/service";
import type { NoticeType } from "@/server/overview/types";
import { fail, handleApiError, ok } from "@/server/http";

const noticeTypes = z.enum(["maintenance", "billing", "security", "product", "account", "general"]);

const createBroadcastSchema = z.object({
  headline: z.string().min(3).max(120),
  body: z.string().min(8).max(4000),
  noticeType: noticeTypes.default("general"),
  sendEmail: z.boolean().default(true)
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const org = await getOrgContext(session.user.id, session.user.email);
    if (!org) {
      return ok({ org: null, broadcasts: [], role: "member" as const });
    }

    const broadcasts = await listOrgBroadcasts(org.orgId);
    return ok({ org: { name: org.orgName, role: org.role }, broadcasts });
  } catch (error) {
    return handleApiError(error, "GET /api/org/broadcasts");
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorized", 401);
  }

  try {
    const org = await getOrgContext(session.user.id, session.user.email);
    if (!org) {
      return fail("Organization not configured", 400);
    }
    if (org.role !== "manager") {
      return fail("Only managers can publish team notices", 403);
    }

    const json = await request.json();
    const parsed = createBroadcastSchema.parse(json);
    const broadcast = await createOrgBroadcast({
      orgId: org.orgId,
      authorId: session.user.id,
      authorEmail: session.user.email,
      headline: parsed.headline,
      body: parsed.body,
      noticeType: parsed.noticeType as NoticeType,
      sendEmail: parsed.sendEmail
    });

    return ok({ broadcast });
  } catch (error) {
    return handleApiError(error, "POST /api/org/broadcasts");
  }
}
