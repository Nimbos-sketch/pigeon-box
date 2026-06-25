import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { MailShell } from "@/components/layout/mail-shell";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  return (
    <MailShell email={session.user.email}>
      <SettingsClient />
    </MailShell>
  );
}
