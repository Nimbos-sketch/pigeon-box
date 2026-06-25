import { db } from "@/lib/db";
import { createGmailClient } from "@/server/gmail/client";

export type UserSettingsData = {
  displayName: string | null;
  signature: string | null;
  replyBehavior: string;
  forwardPrefix: string;
  autoBcc: string | null;
  vacationEnabled: boolean;
  vacationMessage: string | null;
};

const defaults: UserSettingsData = {
  displayName: null,
  signature: null,
  replyBehavior: "reply",
  forwardPrefix: "Fwd:",
  autoBcc: null,
  vacationEnabled: false,
  vacationMessage: null
};

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const row = await db.userSettings.findUnique({ where: { userId } });
  if (!row) return defaults;
  return {
    displayName: row.displayName,
    signature: row.signature,
    replyBehavior: row.replyBehavior,
    forwardPrefix: row.forwardPrefix,
    autoBcc: row.autoBcc,
    vacationEnabled: row.vacationEnabled,
    vacationMessage: row.vacationMessage
  };
}

export async function updateUserSettings(userId: string, input: Partial<UserSettingsData>) {
  return db.userSettings.upsert({
    where: { userId },
    update: {
      displayName: input.displayName,
      signature: input.signature,
      replyBehavior: input.replyBehavior,
      forwardPrefix: input.forwardPrefix,
      autoBcc: input.autoBcc,
      vacationEnabled: input.vacationEnabled,
      vacationMessage: input.vacationMessage
    },
    create: {
      userId,
      displayName: input.displayName ?? null,
      signature: input.signature ?? null,
      replyBehavior: input.replyBehavior ?? defaults.replyBehavior,
      forwardPrefix: input.forwardPrefix ?? defaults.forwardPrefix,
      autoBcc: input.autoBcc ?? null,
      vacationEnabled: input.vacationEnabled ?? false,
      vacationMessage: input.vacationMessage ?? null
    }
  });
}

export async function listForwardingAddresses(userId: string) {
  const { gmail } = await createGmailClient(userId);
  const response = await gmail.users.settings.forwardingAddresses.list({ userId: "me" });
  return response.data.forwardingAddresses ?? [];
}

export async function getAutoForwarding(userId: string) {
  const { gmail } = await createGmailClient(userId);
  const response = await gmail.users.settings.getAutoForwarding({ userId: "me" });
  return response.data;
}
