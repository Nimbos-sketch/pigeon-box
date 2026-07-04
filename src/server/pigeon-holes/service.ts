import { db } from "@/lib/db";
import { displayNameFromEmail, normalizeEmail, parseRecipientEmails } from "@/lib/parse-email-addresses";
import { ensureOrgMembership, type OrgRole } from "@/server/org/membership";
import type { ObligationQueue } from "@/lib/inbox-queues";

export type PigeonHoleKind = "member" | "contact" | "manual";

export type PigeonHoleView = {
  id: string;
  slotCode: string;
  label: string | null;
  orgId: string;
  orgName: string;
  orgSlug: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  contactEmail: string | null;
  kind: PigeonHoleKind;
  isMine: boolean;
  isContact: boolean;
  isPersonal: boolean;
  isLinkedTeam: boolean;
  unreadCount: number;
};

export type PigeonHoleMessageView = {
  id: string;
  subject: string;
  body: string;
  status: "unread" | "read" | "archived";
  obligationQueue: ObligationQueue;
  senderName: string;
  senderEmail: string | null;
  senderOrgName: string;
  isOutbound: boolean;
  createdAt: string;
};

export type TeamLinkView = {
  id: string;
  status: "pending" | "active" | "rejected";
  direction: "outgoing" | "incoming";
  partnerOrgName: string;
  partnerOrgSlug: string;
  requestedAt: string;
};

type HoleRecord = {
  id: string;
  orgId: string;
  userId: string | null;
  ownerUserId: string | null;
  contactEmail: string | null;
  kind: string;
  slotCode: string;
  label: string | null;
  org: { name: string; slug: string };
  user: { name: string | null; email: string | null } | null;
  messages?: { id: string }[];
};

function slotCodeForIndex(index: number, prefix = "T"): string {
  return `${prefix}${String(index + 1).padStart(2, "0")}`;
}

async function nextSlotCode(orgId: string, ownerUserId: string | null, prefix: string): Promise<string> {
  const count = await db.pigeonHole.count({
    where: {
      orgId,
      ownerUserId,
      slotCode: { startsWith: prefix }
    }
  });
  return slotCodeForIndex(count, prefix);
}

function mapHoleToView(hole: HoleRecord, currentUserId: string, homeOrgId: string): PigeonHoleView {
  const isMember = hole.kind === "member";
  const isContact = hole.kind === "contact" || hole.kind === "manual";
  const displayEmail = hole.contactEmail ?? hole.user?.email ?? null;
  const displayName =
    hole.label ??
    hole.user?.name ??
    (displayEmail ? displayNameFromEmail(displayEmail) : "Member");

  return {
    id: hole.id,
    slotCode: hole.slotCode,
    label: hole.label,
    orgId: hole.orgId,
    orgName: hole.org.name,
    orgSlug: hole.org.slug,
    userId: hole.userId,
    userName: displayName,
    userEmail: displayEmail,
    contactEmail: hole.contactEmail,
    kind: hole.kind as PigeonHoleKind,
    isMine: isMember ? hole.userId === currentUserId : hole.ownerUserId === currentUserId,
    isContact,
    isPersonal: isContact && hole.ownerUserId === currentUserId,
    isLinkedTeam: hole.orgId !== homeOrgId,
    unreadCount:
      hole.userId === currentUserId || hole.ownerUserId === currentUserId
        ? (hole.messages?.length ?? 0)
        : 0
  };
}

export async function ensureOrgPigeonHoles(orgId: string): Promise<void> {
  const members = await db.organizationMember.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    include: { user: true }
  });

  const existing = await db.pigeonHole.findMany({
    where: { orgId, kind: "member" },
    select: { userId: true }
  });
  const existingUsers = new Set(existing.map((hole) => hole.userId).filter(Boolean));
  let nextIndex = existing.length;

  for (const member of members) {
    if (existingUsers.has(member.userId)) {
      continue;
    }
    await db.pigeonHole.create({
      data: {
        orgId,
        userId: member.userId,
        ownerUserId: member.userId,
        kind: "member",
        slotCode: slotCodeForIndex(nextIndex),
        label: member.user.name ?? member.user.email ?? null
      }
    });
    nextIndex += 1;
  }
}

export async function linkMemberHoleForUser(
  userId: string,
  email: string | null | undefined,
  orgId: string
): Promise<void> {
  await ensureOrgPigeonHoles(orgId);

  const normalized = email ? normalizeEmail(email) : null;
  if (!normalized) {
    return;
  }

  const memberHole = await db.pigeonHole.findFirst({
    where: { orgId, userId, kind: "member" }
  });
  const manualHoles = await db.pigeonHole.findMany({
    where: {
      orgId,
      contactEmail: normalized,
      kind: { in: ["manual", "contact"] }
    }
  });

  for (const hole of manualHoles) {
    if (memberHole && hole.id !== memberHole.id) {
      await db.pigeonHole.delete({ where: { id: hole.id } });
      continue;
    }
    if (!memberHole) {
      await db.pigeonHole.update({
        where: { id: hole.id },
        data: {
          userId,
          ownerUserId: userId,
          kind: "member",
          contactEmail: null
        }
      });
    }
  }
}

async function isOrgMemberEmail(orgId: string, email: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return null;
  }
  const membership = await db.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } }
  });
  return membership ? user.id : null;
}

async function ensureContactHole(input: {
  orgId: string;
  ownerUserId: string;
  contactEmail: string;
  label?: string | null;
  createdById: string;
  kind: "contact" | "manual";
}): Promise<PigeonHoleView | null> {
  const existing = await db.pigeonHole.findFirst({
    where: {
      orgId: input.orgId,
      ownerUserId: input.ownerUserId,
      contactEmail: input.contactEmail
    },
    include: { org: true, user: true, messages: { where: { status: "unread" }, select: { id: true } } }
  });
  if (existing) {
    return mapHoleToView(existing, input.ownerUserId, input.orgId);
  }

  const slotCode = await nextSlotCode(input.orgId, input.ownerUserId, input.kind === "manual" ? "M" : "C");
  const hole = await db.pigeonHole.create({
    data: {
      orgId: input.orgId,
      ownerUserId: input.ownerUserId,
      contactEmail: input.contactEmail,
      kind: input.kind,
      slotCode,
      label: input.label ?? displayNameFromEmail(input.contactEmail),
      createdById: input.createdById
    },
    include: { org: true, user: true, messages: { where: { status: "unread" }, select: { id: true } } }
  });

  return mapHoleToView(hole, input.ownerUserId, input.orgId);
}

async function ensureTeamManualHole(input: {
  orgId: string;
  contactEmail: string;
  label?: string | null;
  createdById: string;
}): Promise<PigeonHoleView | null> {
  const memberUserId = await isOrgMemberEmail(input.orgId, input.contactEmail);
  if (memberUserId) {
    await ensureOrgPigeonHoles(input.orgId);
    const memberHole = await db.pigeonHole.findFirst({
      where: { orgId: input.orgId, userId: memberUserId },
      include: { org: true, user: true, messages: { where: { status: "unread" }, select: { id: true } } }
    });
    return memberHole ? mapHoleToView(memberHole, input.createdById, input.orgId) : null;
  }

  const existing = await db.pigeonHole.findFirst({
    where: {
      orgId: input.orgId,
      ownerUserId: null,
      contactEmail: input.contactEmail,
      kind: "manual"
    },
    include: { org: true, user: true, messages: { where: { status: "unread" }, select: { id: true } } }
  });
  if (existing) {
    return mapHoleToView(existing, input.createdById, input.orgId);
  }

  const slotCode = await nextSlotCode(input.orgId, null, "M");
  const hole = await db.pigeonHole.create({
    data: {
      orgId: input.orgId,
      ownerUserId: null,
      contactEmail: input.contactEmail,
      kind: "manual",
      slotCode,
      label: input.label ?? displayNameFromEmail(input.contactEmail),
      createdById: input.createdById
    },
    include: { org: true, user: true, messages: { where: { status: "unread" }, select: { id: true } } }
  });

  return mapHoleToView(hole, input.createdById, input.orgId);
}

export async function ensureContactHolesFromRecipients(
  userId: string,
  senderEmail: string | null | undefined,
  fields: { to: string; cc?: string; bcc?: string }
): Promise<void> {
  const org = await ensureOrgMembership(userId, senderEmail);
  if (!org) {
    return;
  }

  const self = senderEmail ? normalizeEmail(senderEmail) : null;
  const recipients = parseRecipientEmails(fields.to, fields.cc, fields.bcc).filter(
    (email) => email !== self
  );

  for (const contactEmail of recipients) {
    const memberUserId = await isOrgMemberEmail(org.orgId, contactEmail);
    if (memberUserId) {
      await ensureOrgPigeonHoles(org.orgId);
      continue;
    }

    await ensureContactHole({
      orgId: org.orgId,
      ownerUserId: userId,
      contactEmail,
      createdById: userId,
      kind: "contact"
    });
  }
}

export async function createPigeonHole(input: {
  userId: string;
  email: string | null | undefined;
  targetEmail: string;
  label?: string;
  scope: "personal" | "team";
}): Promise<PigeonHoleView | null> {
  const org = await ensureOrgMembership(input.userId, input.email);
  if (!org) {
    return null;
  }

  const contactEmail = normalizeEmail(input.targetEmail);
  if (!contactEmail) {
    return null;
  }

  if (input.scope === "team" && org.role !== "manager") {
    return null;
  }

  if (input.scope === "team") {
    return ensureTeamManualHole({
      orgId: org.orgId,
      contactEmail,
      label: input.label,
      createdById: input.userId
    });
  }

  const memberUserId = await isOrgMemberEmail(org.orgId, contactEmail);
  if (memberUserId) {
    await ensureOrgPigeonHoles(org.orgId);
    const memberHole = await db.pigeonHole.findFirst({
      where: { orgId: org.orgId, userId: memberUserId },
      include: { org: true, user: true, messages: { where: { status: "unread" }, select: { id: true } } }
    });
    return memberHole ? mapHoleToView(memberHole, input.userId, org.orgId) : null;
  }

  return ensureContactHole({
    orgId: org.orgId,
    ownerUserId: input.userId,
    contactEmail,
    label: input.label,
    createdById: input.userId,
    kind: "manual"
  });
}

async function getActiveLinkedOrgIds(orgId: string): Promise<string[]> {
  const links = await db.orgTeamLink.findMany({
    where: {
      status: "active",
      OR: [{ fromOrgId: orgId }, { toOrgId: orgId }]
    }
  });
  return links.map((link) => (link.fromOrgId === orgId ? link.toOrgId : link.fromOrgId));
}

function holeVisibilityFilter(userId: string, orgId: string, role: OrgRole) {
  const or: Array<Record<string, unknown>> = [
    { kind: "member" },
    { kind: "manual", ownerUserId: null, orgId },
    { ownerUserId: userId, kind: { in: ["contact", "manual"] } }
  ];
  if (role === "manager") {
    or.push({ orgId, kind: { in: ["contact", "manual"] } });
  }
  return { OR: or };
}

export async function listTeamPigeonHoles(userId: string, email: string | null | undefined): Promise<{
  org: { name: string; role: OrgRole } | null;
  myHoleId: string | null;
  holes: PigeonHoleView[];
}> {
  const org = await ensureOrgMembership(userId, email);
  if (!org) {
    return { org: null, myHoleId: null, holes: [] };
  }

  await ensureOrgPigeonHoles(org.orgId);

  const linkedOrgIds = await getActiveLinkedOrgIds(org.orgId);
  const orgIds = [org.orgId, ...linkedOrgIds];

  const holes = await db.pigeonHole.findMany({
    where: {
      orgId: { in: orgIds },
      ...holeVisibilityFilter(userId, org.orgId, org.role)
    },
    include: {
      org: true,
      user: true,
      messages: {
        where: { status: "unread" },
        select: { id: true }
      }
    },
    orderBy: [{ orgId: "asc" }, { kind: "asc" }, { slotCode: "asc" }]
  });

  const myHole = holes.find((hole) => hole.kind === "member" && hole.userId === userId && hole.orgId === org.orgId);

  return {
    org: { name: org.orgName, role: org.role },
    myHoleId: myHole?.id ?? null,
    holes: holes.map((hole) => mapHoleToView(hole, userId, org.orgId))
  };
}

async function canAccessHoleMessages(input: {
  userId: string;
  role: OrgRole;
  homeOrgId: string;
  hole: { id: string; orgId: string; userId: string | null; ownerUserId: string | null; kind: string };
}): Promise<boolean> {
  if (input.hole.userId === input.userId) {
    return true;
  }
  if (input.hole.ownerUserId === input.userId) {
    return true;
  }
  if (
    input.hole.orgId === input.homeOrgId &&
    input.hole.kind === "manual" &&
    input.hole.ownerUserId === null
  ) {
    return true;
  }
  if (input.hole.orgId === input.homeOrgId && input.role === "manager") {
    return true;
  }
  return false;
}

async function canSendToHole(input: {
  userId: string;
  homeOrgId: string;
  hole: { orgId: string; userId: string | null; ownerUserId: string | null; kind: string };
}): Promise<boolean> {
  if (input.hole.kind === "member") {
    if (input.hole.userId === input.userId && input.hole.orgId === input.homeOrgId) {
      return false;
    }
    if (input.hole.orgId === input.homeOrgId) {
      return true;
    }
    const linked = await getActiveLinkedOrgIds(input.homeOrgId);
    return linked.includes(input.hole.orgId);
  }

  if (input.hole.orgId === input.homeOrgId) {
    if (input.hole.ownerUserId === input.userId) {
      return false;
    }
    return true;
  }
  return false;
}

export async function listHoleMessages(input: {
  userId: string;
  email: string | null | undefined;
  holeId: string;
}): Promise<{ hole: PigeonHoleView; messages: PigeonHoleMessageView[] } | null> {
  const org = await ensureOrgMembership(input.userId, input.email);
  if (!org) {
    return null;
  }

  const hole = await db.pigeonHole.findUnique({
    where: { id: input.holeId },
    include: { org: true, user: true }
  });
  if (!hole) {
    return null;
  }

  const allowed = await canAccessHoleMessages({
    userId: input.userId,
    role: org.role,
    homeOrgId: org.orgId,
    hole
  });
  if (!allowed) {
    return null;
  }

  const messages = await db.pigeonHoleMessage.findMany({
    where: { holeId: hole.id },
    include: { sender: true },
    orderBy: { createdAt: "desc" },
    take: 40
  });

  const senderOrgIds = [...new Set(messages.map((message) => message.senderOrgId))];
  const senderOrgs = await db.organization.findMany({
    where: { id: { in: senderOrgIds } },
    select: { id: true, name: true }
  });
  const orgNameById = new Map(senderOrgs.map((item) => [item.id, item.name]));

  return {
    hole: mapHoleToView(hole, input.userId, org.orgId),
    messages: messages.map((message) => ({
      id: message.id,
      subject: message.subject,
      body: message.body,
      status: message.status as PigeonHoleMessageView["status"],
      obligationQueue: message.obligationQueue as ObligationQueue,
      senderName: message.sender.name ?? message.sender.email ?? "Sender",
      senderEmail: message.sender.email,
      senderOrgName: orgNameById.get(message.senderOrgId) ?? "Team",
      isOutbound: message.senderId === input.userId,
      createdAt: message.createdAt.toISOString()
    }))
  };
}

export async function sendToPigeonHole(input: {
  userId: string;
  email: string | null | undefined;
  holeId: string;
  subject: string;
  body: string;
  obligationQueue: ObligationQueue;
}): Promise<PigeonHoleMessageView | null> {
  const org = await ensureOrgMembership(input.userId, input.email);
  if (!org) {
    return null;
  }

  const hole = await db.pigeonHole.findUnique({
    where: { id: input.holeId },
    include: { org: true, user: true }
  });
  if (!hole) {
    return null;
  }

  const canSend = await canSendToHole({
    userId: input.userId,
    homeOrgId: org.orgId,
    hole
  });
  if (!canSend) {
    return null;
  }

  const message = await db.pigeonHoleMessage.create({
    data: {
      holeId: hole.id,
      senderId: input.userId,
      senderOrgId: org.orgId,
      subject: input.subject,
      body: input.body,
      obligationQueue: input.obligationQueue
    },
    include: { sender: true }
  });

  return {
    id: message.id,
    subject: message.subject,
    body: message.body,
    status: message.status as PigeonHoleMessageView["status"],
    obligationQueue: message.obligationQueue as ObligationQueue,
    senderName: message.sender.name ?? message.sender.email ?? "You",
    senderEmail: message.sender.email,
    senderOrgName: org.orgName,
    isOutbound: true,
    createdAt: message.createdAt.toISOString()
  };
}

export async function updatePigeonHoleMessage(input: {
  userId: string;
  email: string | null | undefined;
  messageId: string;
  status: "read" | "archived";
}): Promise<boolean> {
  const org = await ensureOrgMembership(input.userId, input.email);
  if (!org) {
    return false;
  }

  const message = await db.pigeonHoleMessage.findUnique({
    where: { id: input.messageId },
    include: { hole: true }
  });
  if (!message) {
    return false;
  }

  const allowed = await canAccessHoleMessages({
    userId: input.userId,
    role: org.role,
    homeOrgId: org.orgId,
    hole: message.hole
  });
  if (!allowed) {
    return false;
  }

  await db.pigeonHoleMessage.update({
    where: { id: message.id },
    data: { status: input.status }
  });
  return true;
}

export async function listTeamLinks(userId: string, email: string | null | undefined): Promise<TeamLinkView[]> {
  const org = await ensureOrgMembership(userId, email);
  if (!org || org.role !== "manager") {
    return [];
  }

  const links = await db.orgTeamLink.findMany({
    where: {
      OR: [{ fromOrgId: org.orgId }, { toOrgId: org.orgId }]
    },
    include: { fromOrg: true, toOrg: true },
    orderBy: { createdAt: "desc" }
  });

  return links.map((link) => {
    const outgoing = link.fromOrgId === org.orgId;
    const partner = outgoing ? link.toOrg : link.fromOrg;
    return {
      id: link.id,
      status: link.status as TeamLinkView["status"],
      direction: outgoing ? "outgoing" : "incoming",
      partnerOrgName: partner.name,
      partnerOrgSlug: partner.slug,
      requestedAt: link.createdAt.toISOString()
    };
  });
}

export async function requestTeamLink(input: {
  userId: string;
  email: string | null | undefined;
  partnerSlug: string;
}): Promise<TeamLinkView | null> {
  const org = await ensureOrgMembership(input.userId, input.email);
  if (!org || org.role !== "manager") {
    return null;
  }

  const partner = await db.organization.findUnique({
    where: { slug: input.partnerSlug.trim().toLowerCase() }
  });
  if (!partner || partner.id === org.orgId) {
    return null;
  }

  const link = await db.orgTeamLink.upsert({
    where: { fromOrgId_toOrgId: { fromOrgId: org.orgId, toOrgId: partner.id } },
    update: { status: "pending", requestedBy: input.userId, approvedBy: null },
    create: {
      fromOrgId: org.orgId,
      toOrgId: partner.id,
      requestedBy: input.userId,
      status: "pending"
    },
    include: { toOrg: true }
  });

  return {
    id: link.id,
    status: link.status as TeamLinkView["status"],
    direction: "outgoing",
    partnerOrgName: partner.name,
    partnerOrgSlug: partner.slug,
    requestedAt: link.createdAt.toISOString()
  };
}

export async function respondToTeamLink(input: {
  userId: string;
  email: string | null | undefined;
  linkId: string;
  accept: boolean;
}): Promise<boolean> {
  const org = await ensureOrgMembership(input.userId, input.email);
  if (!org || org.role !== "manager") {
    return false;
  }

  const link = await db.orgTeamLink.findUnique({ where: { id: input.linkId } });
  if (!link || link.toOrgId !== org.orgId) {
    return false;
  }

  await db.orgTeamLink.update({
    where: { id: link.id },
    data: {
      status: input.accept ? "active" : "rejected",
      approvedBy: input.userId
    }
  });

  if (input.accept) {
    await ensureOrgPigeonHoles(link.fromOrgId);
    await ensureOrgPigeonHoles(link.toOrgId);
  }

  return true;
}
