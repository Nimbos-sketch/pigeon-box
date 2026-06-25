import { db } from "@/lib/db";
import { createGmailClient } from "@/server/gmail/client";

type MessageSummary = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds: string[];
  internalDate?: string;
};

function headerValue(
  payloadHeaders: { name?: string | null; value?: string | null }[] | undefined,
  key: string
): string | null {
  const hit = payloadHeaders?.find((h) => h.name?.toLowerCase() === key.toLowerCase());
  return hit?.value ?? null;
}

export async function listInboxMessages(userId: string, params?: { q?: string; pageToken?: string; maxResults?: number }) {
  const { gmail, accountId } = await createGmailClient(userId);
  const response = await gmail.users.messages.list({
    userId: "me",
    q: params?.q,
    pageToken: params?.pageToken,
    maxResults: params?.maxResults ?? 50
  });
  const summaries = (response.data.messages ?? []) as MessageSummary[];
  const rows = await Promise.all(
    summaries.map(async (message) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full"
      });
      const data = detail.data;
      const subject = headerValue(data.payload?.headers, "subject");
      const from = headerValue(data.payload?.headers, "from");
      const internalDate = data.internalDate ? new Date(Number(data.internalDate)) : null;
      const labels = data.labelIds ?? [];
      const record = await db.gmailMessage.upsert({
        where: { accountId_gmailId: { accountId, gmailId: message.id } },
        update: {
          threadId: data.threadId ?? message.threadId,
          subject,
          fromAddress: from,
          snippet: data.snippet,
          internalDate,
          isUnread: labels.includes("UNREAD"),
          isStarred: labels.includes("STARRED"),
          labelIdsJson: JSON.stringify(labels)
        },
        create: {
          accountId,
          gmailId: message.id,
          threadId: data.threadId ?? message.threadId,
          subject,
          fromAddress: from,
          snippet: data.snippet,
          internalDate,
          isUnread: labels.includes("UNREAD"),
          isStarred: labels.includes("STARRED"),
          labelIdsJson: JSON.stringify(labels)
        }
      });
      return record;
    })
  );

  return { messages: rows, nextPageToken: response.data.nextPageToken ?? null, resultSizeEstimate: response.data.resultSizeEstimate ?? 0 };
}

export async function getMessageById(userId: string, messageId: string) {
  const { gmail, accountId } = await createGmailClient(userId);
  const detail = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full"
  });
  const data = detail.data;
  const labels = data.labelIds ?? [];
  const bodyText = data.snippet ?? "";
  const subject = headerValue(data.payload?.headers, "subject");
  const from = headerValue(data.payload?.headers, "from");
  return db.gmailMessage.upsert({
    where: { accountId_gmailId: { accountId, gmailId: messageId } },
    update: {
      threadId: data.threadId ?? "",
      subject,
      fromAddress: from,
      snippet: data.snippet,
      bodyText,
      internalDate: data.internalDate ? new Date(Number(data.internalDate)) : null,
      isUnread: labels.includes("UNREAD"),
      isStarred: labels.includes("STARRED"),
      labelIdsJson: JSON.stringify(labels)
    },
    create: {
      accountId,
      gmailId: messageId,
      threadId: data.threadId ?? "",
      subject,
      fromAddress: from,
      snippet: data.snippet,
      bodyText,
      internalDate: data.internalDate ? new Date(Number(data.internalDate)) : null,
      isUnread: labels.includes("UNREAD"),
      isStarred: labels.includes("STARRED"),
      labelIdsJson: JSON.stringify(labels)
    }
  });
}

export async function listLabels(userId: string) {
  const { gmail, accountId } = await createGmailClient(userId);
  const response = await gmail.users.labels.list({ userId: "me" });
  const labels = response.data.labels ?? [];
  await Promise.all(
    labels.map((label) =>
      db.gmailLabel.upsert({
        where: { accountId_gmailId: { accountId, gmailId: label.id ?? "" } },
        update: {
          name: label.name ?? "",
          type: label.type ?? "user"
        },
        create: {
          accountId,
          gmailId: label.id ?? "",
          name: label.name ?? "",
          type: label.type ?? "user"
        }
      })
    )
  );
  return labels;
}

export async function modifyMessage(
  userId: string,
  messageId: string,
  data: { addLabelIds?: string[]; removeLabelIds?: string[] }
) {
  const { gmail, accountId } = await createGmailClient(userId);
  const response = await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: data.addLabelIds ?? [],
      removeLabelIds: data.removeLabelIds ?? []
    }
  });
  await db.auditLog.create({
    data: {
      accountId,
      action: "MESSAGE_MODIFY",
      targetId: messageId,
      metaJson: JSON.stringify(data)
    }
  });
  return response.data;
}
