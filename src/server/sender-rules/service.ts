import { db } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/async-pool";
import {
  AUTO_APPLY_THRESHOLD,
  type AutoHandledSummary,
  type SenderActionType,
  type SenderHint,
  type SenderRuleView
} from "@/lib/sender-rules";
import { extractSenderKey, formatSenderKeyLabel } from "@/lib/sender-key";
import { createGmailClient } from "@/server/gmail/client";
import { fileMessageToFolder } from "@/server/gmail/folders";
import { modifyMessage } from "@/server/gmail/service";

export { AUTO_APPLY_THRESHOLD };
export type { AutoHandledSummary, SenderActionType, SenderHint, SenderRuleView };

function actionsUntilAuto(actionCount: number, autoApply: boolean): number {
  if (autoApply) {
    return 0;
  }
  return Math.max(0, AUTO_APPLY_THRESHOLD - actionCount);
}

function toRuleView(rule: {
  id: string;
  senderKey: string;
  preferredAction: string;
  folderId: string | null;
  actionCount: number;
  autoApply: boolean;
  folder?: { name: string; color: string } | null;
}): SenderRuleView {
  return {
    id: rule.id,
    senderKey: rule.senderKey,
    senderLabel: formatSenderKeyLabel(rule.senderKey),
    preferredAction: rule.preferredAction as SenderActionType,
    folderId: rule.folderId,
    folderName: rule.folder?.name ?? null,
    folderColor: rule.folder?.color ?? null,
    actionCount: rule.actionCount,
    autoApply: rule.autoApply,
    actionsUntilAuto: actionsUntilAuto(rule.actionCount, rule.autoApply)
  };
}

export async function listSenderRules(userId: string): Promise<SenderRuleView[]> {
  const rules = await db.senderRule.findMany({
    where: { userId },
    include: { folder: true },
    orderBy: { updatedAt: "desc" }
  });
  return rules.map(toRuleView);
}

export async function getSenderRulesMap(userId: string) {
  const rules = await listSenderRules(userId);
  return new Map(rules.map((rule) => [rule.senderKey, rule]));
}

export async function recordSenderAction(
  userId: string,
  fromAddress: string | null | undefined,
  action: SenderActionType,
  folderId?: string | null
): Promise<SenderRuleView | null> {
  const senderKey = extractSenderKey(fromAddress);
  if (!senderKey) {
    return null;
  }

  const existing = await db.senderRule.findUnique({
    where: { userId_senderKey: { userId, senderKey } },
    include: { folder: true }
  });

  if (!existing || existing.preferredAction !== action) {
    const created = await db.senderRule.upsert({
      where: { userId_senderKey: { userId, senderKey } },
      update: {
        preferredAction: action,
        folderId: action === "file" ? folderId ?? null : null,
        actionCount: 1,
        autoApply: false,
        lastActionAt: new Date()
      },
      create: {
        userId,
        senderKey,
        preferredAction: action,
        folderId: action === "file" ? folderId ?? null : null,
        actionCount: 1,
        autoApply: false
      },
      include: { folder: true }
    });
    return toRuleView(created);
  }

  const nextCount = existing.actionCount + 1;
  const autoApply = nextCount >= AUTO_APPLY_THRESHOLD;
  const updated = await db.senderRule.update({
    where: { id: existing.id },
    data: {
      actionCount: nextCount,
      autoApply,
      folderId: action === "file" ? folderId ?? existing.folderId : null,
      lastActionAt: new Date()
    },
    include: { folder: true }
  });

  return toRuleView(updated);
}

export async function updateSenderRule(
  userId: string,
  ruleId: string,
  data: {
    autoApply?: boolean;
    preferredAction?: SenderActionType;
    folderId?: string | null;
  }
): Promise<SenderRuleView> {
  const existing = await db.senderRule.findFirst({
    where: { id: ruleId, userId },
    include: { folder: true }
  });
  if (!existing) {
    throw new Error("Rule not found");
  }

  const preferredAction = data.preferredAction ?? (existing.preferredAction as SenderActionType);
  let folderId = data.folderId !== undefined ? data.folderId : existing.folderId;
  if (preferredAction !== "file") {
    folderId = null;
  } else if (folderId) {
    const folder = await db.emailFolder.findFirst({ where: { id: folderId, userId } });
    if (!folder) {
      throw new Error("Folder not found");
    }
  }

  const updated = await db.senderRule.update({
    where: { id: ruleId },
    data: {
      autoApply: data.autoApply ?? existing.autoApply,
      preferredAction,
      folderId,
      lastActionAt: new Date()
    },
    include: { folder: true }
  });

  return toRuleView(updated);
}

export async function deleteSenderRule(userId: string, ruleId: string): Promise<void> {
  const existing = await db.senderRule.findFirst({ where: { id: ruleId, userId } });
  if (!existing) {
    throw new Error("Rule not found");
  }
  await db.senderRule.delete({ where: { id: ruleId } });
}

export async function countRulesByFolder(userId: string): Promise<Map<string, number>> {
  const rows = await db.senderRule.groupBy({
    by: ["folderId"],
    where: { userId, folderId: { not: null } },
    _count: { _all: true }
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.folderId) {
      map.set(row.folderId, row._count._all);
    }
  }
  return map;
}

async function applyRuleToMessage(
  userId: string,
  messageId: string,
  rule: SenderRuleView
): Promise<void> {
  switch (rule.preferredAction) {
    case "spam":
      await modifyMessage(userId, messageId, { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] });
      break;
    case "trash":
      await modifyMessage(userId, messageId, { addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"] });
      break;
    case "archive":
      await modifyMessage(userId, messageId, { removeLabelIds: ["INBOX"] });
      break;
    case "file":
      if (rule.folderId) {
        await fileMessageToFolder(userId, messageId, rule.folderId);
      } else {
        await modifyMessage(userId, messageId, { removeLabelIds: ["INBOX"] });
      }
      break;
  }

  const { accountId } = await createGmailClient(userId);
  await db.auditLog.create({
    data: {
      accountId,
      action: "SENDER_RULE_AUTO",
      targetId: messageId,
      metaJson: JSON.stringify({
        senderKey: rule.senderKey,
        preferredAction: rule.preferredAction,
        folderId: rule.folderId
      })
    }
  });
}

export async function applyAutoSenderRules<T extends { gmailId: string; fromAddress: string | null }>(
  userId: string,
  messages: T[],
  rulesMap?: Map<string, SenderRuleView>
): Promise<{ remaining: T[]; autoHandled: AutoHandledSummary[] }> {
  const map = rulesMap ?? (await getSenderRulesMap(userId));
  const autoHandled: AutoHandledSummary[] = [];
  const remaining: T[] = [];
  const toAutoApply: { message: T; rule: SenderRuleView }[] = [];

  for (const message of messages) {
    const senderKey = extractSenderKey(message.fromAddress);
    const rule = senderKey ? map.get(senderKey) : undefined;

    if (rule?.autoApply) {
      toAutoApply.push({ message, rule });
    } else {
      remaining.push(message);
    }
  }

  await mapWithConcurrency(toAutoApply, 4, async ({ message, rule }) => {
    try {
      await applyRuleToMessage(userId, message.gmailId, rule);
      autoHandled.push({
        messageId: message.gmailId,
        senderKey: rule.senderKey,
        senderLabel: rule.senderLabel,
        action: rule.preferredAction,
        folderName: rule.folderName ?? undefined
      });
    } catch {
      remaining.push(message);
    }
  });

  return { remaining, autoHandled };
}

export function buildSenderHint(
  fromAddress: string | null | undefined,
  rulesMap: Map<string, SenderRuleView>
): SenderHint | null {
  const senderKey = extractSenderKey(fromAddress);
  if (!senderKey) {
    return null;
  }
  const rule = rulesMap.get(senderKey);
  if (!rule) {
    return null;
  }
  return {
    senderKey: rule.senderKey,
    senderLabel: rule.senderLabel,
    preferredAction: rule.preferredAction,
    actionCount: rule.actionCount,
    actionsUntilAuto: rule.actionsUntilAuto,
    autoApply: rule.autoApply,
    folderColor: rule.folderColor,
    folderId: rule.folderId,
    folderName: rule.folderName
  };
}
