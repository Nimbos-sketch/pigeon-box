import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createGmailClient } from "@/server/gmail/client";
import { getMessageById } from "@/server/gmail/service";

const DEFAULT_BATCH_SIZE = Number(process.env.SYNC_BATCH_SIZE ?? "50");

async function runInitialSync(userId: string, accountId: string) {
  const { gmail } = await createGmailClient(userId);
  let pageToken: string | undefined;
  let total = 0;
  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "newer_than:30d",
      maxResults: DEFAULT_BATCH_SIZE,
      pageToken
    });
    const messages = response.data.messages ?? [];
    for (const msg of messages) {
      if (!msg.id) continue;
      await getMessageById(userId, msg.id);
      total += 1;
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  const profile = await gmail.users.getProfile({ userId: "me" });
  await db.gmailAccount.update({
    where: { id: accountId },
    data: {
      historyId: profile.data.historyId ?? undefined,
      lastSyncedAt: new Date(),
      syncCursorError: null
    }
  });
  return total;
}

async function runIncrementalSync(userId: string, accountId: string, startHistoryId: string) {
  const { gmail } = await createGmailClient(userId);
  let pageToken: string | undefined;
  let latestHistoryId = startHistoryId;
  let changed = 0;

  do {
    const response = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      pageToken,
      maxResults: DEFAULT_BATCH_SIZE,
      historyTypes: ["messageAdded", "labelAdded", "labelRemoved"]
    });
    const historyItems = response.data.history ?? [];
    for (const item of historyItems) {
      const touchedMessages = [
        ...(item.messagesAdded?.map((x) => x.message).filter(Boolean) ?? []),
        ...(item.labelsAdded?.map((x) => x.message).filter(Boolean) ?? []),
        ...(item.labelsRemoved?.map((x) => x.message).filter(Boolean) ?? [])
      ];
      for (const message of touchedMessages) {
        if (!message?.id) continue;
        await getMessageById(userId, message.id);
        changed += 1;
      }
      if (item.id) {
        latestHistoryId = item.id;
      }
    }
    pageToken = response.data.nextPageToken ?? undefined;
    if (response.data.historyId) {
      latestHistoryId = response.data.historyId;
    }
  } while (pageToken);

  await db.gmailAccount.update({
    where: { id: accountId },
    data: { historyId: latestHistoryId, lastSyncedAt: new Date(), syncCursorError: null }
  });
  return changed;
}

export async function syncMailbox(userId: string): Promise<{ mode: "initial" | "incremental"; processed: number }> {
  const account = await db.gmailAccount.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!account) {
    throw new Error("No Gmail account linked");
  }

  const syncRun = await db.syncState.create({
    data: { accountId: account.id, syncType: account.historyId ? "incremental" : "initial", status: "running" }
  });

  try {
    const processed = account.historyId
      ? await runIncrementalSync(userId, account.id, account.historyId)
      : await runInitialSync(userId, account.id);
    await db.syncState.update({
      where: { id: syncRun.id },
      data: {
        status: "success",
        completedAt: new Date(),
        detailsJson: JSON.stringify({ processed })
      }
    });
    return { mode: account.historyId ? "incremental" : "initial", processed };
  } catch (error) {
    logger.error({ err: error }, "Mailbox sync failed");
    await db.gmailAccount.update({
      where: { id: account.id },
      data: { syncCursorError: error instanceof Error ? error.message : "Unknown sync error" }
    });
    await db.syncState.update({
      where: { id: syncRun.id },
      data: {
        status: "error",
        completedAt: new Date(),
        detailsJson: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown sync error" })
      }
    });
    throw error;
  }
}
