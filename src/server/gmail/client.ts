import { gmail_v1, google } from "googleapis";
import { db } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/crypto";

export type GmailAuthContext = {
  prismaAccountId: string;
  gmailEmail: string;
};

export async function getPrimaryGmailAccount(userId: string): Promise<GmailAuthContext> {
  const account = await db.gmailAccount.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" }
  });
  if (!account) {
    throw new Error("No connected Gmail account found");
  }
  return { prismaAccountId: account.id, gmailEmail: account.email };
}

export async function createGmailClient(userId: string): Promise<{
  gmail: gmail_v1.Gmail;
  accountId: string;
}> {
  const account = await db.gmailAccount.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!account) {
    throw new Error("No Gmail account linked");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: decryptText(account.encryptedRefresh),
    access_token: account.encryptedAccess ? decryptText(account.encryptedAccess) : undefined,
    expiry_date: account.accessExpiresAt ? account.accessExpiresAt.getTime() : undefined
  });

  oauth2Client.on("tokens", async (tokens) => {
    await db.gmailAccount.update({
      where: { id: account.id },
      data: {
        encryptedAccess: tokens.access_token ? encryptText(tokens.access_token) : undefined,
        accessExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
      }
    });
  });

  return { gmail: google.gmail({ version: "v1", auth: oauth2Client }), accountId: account.id };
}
