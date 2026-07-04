import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type OrgRole = "manager" | "member";

export type OrgContext = {
  orgId: string;
  orgName: string;
  role: OrgRole;
};

function orgSlug(): string {
  return process.env.ORG_SLUG?.trim() || "default";
}

function orgName(): string {
  return process.env.ORG_NAME?.trim() || "Team";
}

function managerEmails(): Set<string> {
  const raw = process.env.ORG_MANAGER_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function resolveRole(email: string | null | undefined): OrgRole {
  if (!email) {
    return "member";
  }
  return managerEmails().has(email.toLowerCase()) ? "manager" : "member";
}

async function bootstrapPigeonHoles(
  userId: string,
  email: string | null | undefined,
  orgId: string
): Promise<void> {
  try {
    const { ensureOrgPigeonHoles, linkMemberHoleForUser } = await import("@/server/pigeon-holes/service");
    await ensureOrgPigeonHoles(orgId);
    await linkMemberHoleForUser(userId, email, orgId);
  } catch (error) {
    logger.warn({ err: String(error), userId }, "Pigeon hole bootstrap failed during org membership");
  }
}

export async function ensureOrgMembership(
  userId: string,
  email: string | null | undefined
): Promise<OrgContext | null> {
  if (!userId) {
    return null;
  }

  const slug = orgSlug();
  let organization = await db.organization.findUnique({ where: { slug } });
  if (!organization) {
    organization = await db.organization.create({
      data: { name: orgName(), slug }
    });
  }

  const role = resolveRole(email);
  await db.organizationMember.upsert({
    where: { orgId_userId: { orgId: organization.id, userId } },
    update: { role },
    create: { orgId: organization.id, userId, role }
  });

  await bootstrapPigeonHoles(userId, email, organization.id);

  return { orgId: organization.id, orgName: organization.name, role };
}

export async function getOrgContext(
  userId: string,
  email: string | null | undefined
): Promise<OrgContext | null> {
  const membership = await db.organizationMember.findFirst({
    where: { userId },
    include: { org: true }
  });
  if (membership) {
    return {
      orgId: membership.orgId,
      orgName: membership.org.name,
      role: membership.role as OrgRole
    };
  }
  return ensureOrgMembership(userId, email);
}
