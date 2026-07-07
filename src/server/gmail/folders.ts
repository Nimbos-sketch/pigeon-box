import { db } from "@/lib/db";
import { normalizeFolderColor, pickFolderColor } from "@/lib/folder-colors";
import { createGmailClient } from "@/server/gmail/client";
import { modifyMessage } from "@/server/gmail/service";

export type EmailFolderRecord = {
  id: string;
  name: string;
  gmailLabelId: string;
  color: string;
  createdAt: string;
  ruleCount: number;
};

export async function listUserFolders(userId: string): Promise<EmailFolderRecord[]> {
  const folders = await db.emailFolder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { senderRules: true } } }
  });
  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    gmailLabelId: folder.gmailLabelId,
    color: normalizeFolderColor(folder.color),
    createdAt: folder.createdAt.toISOString(),
    ruleCount: folder._count.senderRules
  }));
}

export async function updateUserFolderColor(userId: string, folderId: string, color: string) {
  const folder = await db.emailFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) {
    throw new Error("Folder not found");
  }
  const updated = await db.emailFolder.update({
    where: { id: folderId },
    data: { color: normalizeFolderColor(color) }
  });
  return {
    id: updated.id,
    name: updated.name,
    gmailLabelId: updated.gmailLabelId,
    color: normalizeFolderColor(updated.color),
    createdAt: updated.createdAt.toISOString(),
    ruleCount: 0
  };
}

export async function createUserFolder(userId: string, name: string, color?: string): Promise<EmailFolderRecord> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Folder name is required");
  }
  if (trimmed.length > 64) {
    throw new Error("Folder name must be 64 characters or fewer");
  }

  const existing = await db.emailFolder.findUnique({
    where: { userId_name: { userId, name: trimmed } }
  });
  if (existing) {
  return {
    id: existing.id,
    name: existing.name,
    gmailLabelId: existing.gmailLabelId,
    color: normalizeFolderColor(existing.color),
    createdAt: existing.createdAt.toISOString(),
    ruleCount: 0
  };
  }

  const folderCount = await db.emailFolder.count({ where: { userId } });
  const folderColor = normalizeFolderColor(color, pickFolderColor(folderCount));

  const { gmail, accountId } = await createGmailClient(userId);
  const labelResponse = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: trimmed,
      labelListVisibility: "labelShow",
      messageListVisibility: "show"
    }
  });

  const gmailLabelId = labelResponse.data.id;
  if (!gmailLabelId) {
    throw new Error("Gmail did not return a label id");
  }

  await db.gmailLabel.upsert({
    where: { accountId_gmailId: { accountId, gmailId: gmailLabelId } },
    update: { name: trimmed, type: "user" },
    create: { accountId, gmailId: gmailLabelId, name: trimmed, type: "user" }
  });

  const folder = await db.emailFolder.create({
    data: { userId, name: trimmed, gmailLabelId, color: folderColor }
  });

  await db.auditLog.create({
    data: {
      accountId,
      action: "FOLDER_CREATE",
      targetId: folder.id,
      metaJson: JSON.stringify({ name: trimmed, gmailLabelId })
    }
  });

  return {
    id: folder.id,
    name: folder.name,
    gmailLabelId: folder.gmailLabelId,
    color: normalizeFolderColor(folder.color),
    createdAt: folder.createdAt.toISOString(),
    ruleCount: 0
  };
}

export async function deleteUserFolder(userId: string, folderId: string): Promise<void> {
  const folder = await db.emailFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) {
    throw new Error("Folder not found");
  }

  const { gmail, accountId } = await createGmailClient(userId);
  try {
    await gmail.users.labels.delete({ userId: "me", id: folder.gmailLabelId });
  } catch {
    // Label may already be gone in Gmail — still remove local records.
  }

  await db.gmailLabel.deleteMany({ where: { accountId, gmailId: folder.gmailLabelId } });
  await db.emailFolder.delete({ where: { id: folderId } });

  await db.auditLog.create({
    data: {
      accountId,
      action: "FOLDER_DELETE",
      targetId: folderId,
      metaJson: JSON.stringify({ name: folder.name, gmailLabelId: folder.gmailLabelId })
    }
  });
}

export async function fileMessageToFolder(userId: string, messageId: string, folderId: string) {
  const folder = await db.emailFolder.findFirst({
    where: { id: folderId, userId }
  });
  if (!folder) {
    throw new Error("Folder not found");
  }

  const { accountId } = await createGmailClient(userId);
  await modifyMessage(userId, messageId, {
    addLabelIds: [folder.gmailLabelId],
    removeLabelIds: ["INBOX"]
  });

  await db.auditLog.create({
    data: {
      accountId,
      action: "MESSAGE_FILE",
      targetId: messageId,
      metaJson: JSON.stringify({ folderId: folder.id, folderName: folder.name })
    }
  });

  return { folderId: folder.id, folderName: folder.name };
}
