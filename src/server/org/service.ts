import { db } from "@/lib/db";
import { sendEmail } from "@/server/gmail/compose";
import { ensureOrgMembership, getOrgContext, type OrgContext, type OrgRole } from "@/server/org/membership";
import type { NoticeType } from "@/server/overview/types";

export type { OrgContext, OrgRole };
export { ensureOrgMembership, getOrgContext };

export type OrgBroadcastView = {
  id: string;
  headline: string;
  body: string;
  summary: string;
  noticeType: NoticeType;
  source: string;
  receivedAt: string;
  emailed: boolean;
  isBroadcast: true;
  messageId: string;
};

export async function listOrgBroadcasts(orgId: string): Promise<OrgBroadcastView[]> {
  const broadcasts = await db.orgBroadcast.findMany({
    where: { orgId },
    include: { author: true },
    orderBy: { publishedAt: "desc" },
    take: 24
  });

  return broadcasts.map((broadcast) => ({
    id: broadcast.id,
    headline: broadcast.headline,
    body: broadcast.body,
    summary: broadcast.body,
    noticeType: broadcast.noticeType as NoticeType,
    source: broadcast.author.name ?? broadcast.author.email ?? "Manager",
    receivedAt: broadcast.publishedAt.toISOString(),
    emailed: broadcast.emailed,
    isBroadcast: true as const,
    messageId: `broadcast:${broadcast.id}`
  }));
}

export async function createOrgBroadcast(input: {
  orgId: string;
  authorId: string;
  authorEmail: string | null | undefined;
  headline: string;
  body: string;
  noticeType: NoticeType;
  sendEmail: boolean;
}): Promise<OrgBroadcastView> {
  const broadcast = await db.orgBroadcast.create({
    data: {
      orgId: input.orgId,
      authorId: input.authorId,
      headline: input.headline,
      body: input.body,
      noticeType: input.noticeType,
      emailed: input.sendEmail
    },
    include: { author: true }
  });

  if (input.sendEmail) {
    const members = await db.organizationMember.findMany({
      where: { orgId: input.orgId },
      include: { user: true }
    });
    const recipients = members
      .map((member) => member.user.email)
      .filter((email): email is string => Boolean(email) && email !== input.authorEmail);

    const subject = `[Team notice] ${input.headline}`;
    const emailBody = `${input.body}\n\n— Sent via Pigeon Box notice board`;

    await Promise.all(
      recipients.map((to) =>
        sendEmail(input.authorId, {
          to,
          subject,
          body: emailBody
        }).catch(() => null)
      )
    );
  }

  return {
    id: broadcast.id,
    headline: broadcast.headline,
    body: broadcast.body,
    summary: broadcast.body,
    noticeType: broadcast.noticeType as NoticeType,
    source: broadcast.author.name ?? broadcast.author.email ?? "Manager",
    receivedAt: broadcast.publishedAt.toISOString(),
    emailed: broadcast.emailed,
    isBroadcast: true,
    messageId: `broadcast:${broadcast.id}`
  };
}

export function broadcastToOverviewItem(broadcast: OrgBroadcastView) {
  return {
    id: `broadcast-${broadcast.id}`,
    headline: broadcast.headline,
    summary: broadcast.summary,
    source: broadcast.source,
    receivedAt: broadcast.receivedAt,
    messageId: broadcast.messageId,
    noticeType: broadcast.noticeType,
    isBroadcast: true as const,
    emailed: broadcast.emailed
  };
}
