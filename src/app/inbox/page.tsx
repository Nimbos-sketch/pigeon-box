import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { InboxClient } from "@/components/inbox/inbox-client";
import { MailShell } from "@/components/layout/mail-shell";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  return (
    <MailShell email={session.user.email}>
      <Suspense fallback={<p className="p-6 text-sm text-ableton-muted">Loading inbox...</p>}>
        <InboxClient />
      </Suspense>
    </MailShell>
  );
}
