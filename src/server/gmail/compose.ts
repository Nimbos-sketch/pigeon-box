import { db } from "@/lib/db";
import { ensureContactHolesFromRecipients } from "@/server/pigeon-holes/service";
import { createGmailClient } from "@/server/gmail/client";
import { buildForwardBody, buildReplyBody, encodeRawEmail } from "@/server/gmail/mime";
import { extractBodyFromPayload } from "@/server/gmail/body";
import { getUserSettings } from "@/server/settings/service";

export type SendEmailInput = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
};

function headerValue(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  key: string
): string | null {
  return headers?.find((header) => header.name?.toLowerCase() === key.toLowerCase())?.value ?? null;
}

export async function getMessageForCompose(userId: string, messageId: string) {
  const { gmail } = await createGmailClient(userId);
  const detail = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  const data = detail.data;
  const headers = data.payload?.headers;
  return {
    gmailId: messageId,
    threadId: data.threadId ?? "",
    messageIdHeader: headerValue(headers, "message-id"),
    subject: headerValue(headers, "subject"),
    fromAddress: headerValue(headers, "from"),
    toAddress: headerValue(headers, "to"),
    ccAddress: headerValue(headers, "cc"),
    body: extractBodyFromPayload(data.payload) || data.snippet || "",
    internalDate: data.internalDate ? new Date(Number(data.internalDate)).toISOString() : null
  };
}

async function resolveFromAddress(userId: string): Promise<string> {
  const settings = await getUserSettings(userId);
  const account = await db.gmailAccount.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (settings.displayName && account?.email) {
    return `${settings.displayName} <${account.email}>`;
  }
  return account?.email ?? "me";
}

export async function sendEmail(userId: string, input: SendEmailInput) {
  const { gmail, accountId } = await createGmailClient(userId);
  const settings = await getUserSettings(userId);
  const from = await resolveFromAddress(userId);
  const bodyWithSignature = input.body.includes(settings.signature ?? "")
    ? input.body
    : `${input.body}${settings.signature ? `\n\n--\n${settings.signature}` : ""}`;

  const raw = encodeRawEmail({
    from,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc || settings.autoBcc || undefined,
    subject: input.subject,
    body: bodyWithSignature
  });

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: input.threadId
    }
  });

  await db.auditLog.create({
    data: {
      accountId,
      action: "MESSAGE_SEND",
      targetId: response.data.id ?? undefined,
      metaJson: JSON.stringify({ to: input.to, subject: input.subject })
    }
  });

  const sender = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  void ensureContactHolesFromRecipients(userId, sender?.email, input).catch(() => null);

  return response.data;
}

export async function replyToMessage(
  userId: string,
  messageId: string,
  input: { to: string; cc?: string; body: string }
) {
  const original = await getMessageForCompose(userId, messageId);
  const settings = await getUserSettings(userId);
  const subject = original.subject?.startsWith("Re:") ? original.subject : `Re: ${original.subject ?? "(No subject)"}`;
  const body = buildReplyBody(input.body, settings.signature);

  return sendEmail(userId, {
    to: input.to,
    cc: input.cc,
    subject,
    body,
    threadId: original.threadId
  });
}

export async function forwardMessage(
  userId: string,
  messageId: string,
  input: { to: string; cc?: string; body?: string }
) {
  const original = await getMessageForCompose(userId, messageId);
  const settings = await getUserSettings(userId);
  const prefix = settings.forwardPrefix || "Fwd:";
  const subject = original.subject?.startsWith(prefix) ? original.subject : `${prefix} ${original.subject ?? "(No subject)"}`;
  const forwardedBody =
    input.body ??
    buildForwardBody({
      fromAddress: original.fromAddress,
      toAddress: original.toAddress,
      subject: original.subject,
      body: original.body,
      receivedAt: original.internalDate
    });

  return sendEmail(userId, {
    to: input.to,
    cc: input.cc,
    subject,
    body: forwardedBody,
    threadId: original.threadId
  });
}

export async function getComposePrefill(
  userId: string,
  mode: "reply" | "forward",
  messageId: string
) {
  const original = await getMessageForCompose(userId, messageId);
  const settings = await getUserSettings(userId);

  if (mode === "reply") {
    return {
      to: original.fromAddress ?? "",
      subject: original.subject?.startsWith("Re:") ? original.subject : `Re: ${original.subject ?? ""}`,
      body: buildReplyBody("", settings.signature),
      threadId: original.threadId
    };
  }

  return {
    to: "",
    subject: original.subject?.startsWith(settings.forwardPrefix) ? original.subject : `${settings.forwardPrefix} ${original.subject ?? ""}`,
    body: buildForwardBody({
      fromAddress: original.fromAddress,
      toAddress: original.toAddress,
      subject: original.subject,
      body: original.body,
      receivedAt: original.internalDate
    }),
    threadId: original.threadId
  };
}
