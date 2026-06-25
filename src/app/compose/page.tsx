import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ComposeClient } from "@/components/compose/compose-client";
import { MailShell } from "@/components/layout/mail-shell";

export default async function ComposePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  return (
    <MailShell email={session.user.email}>
      <Suspense fallback={<p className="p-6 text-sm text-ableton-muted">Loading compose...</p>}>
        <ComposeClient />
      </Suspense>
    </MailShell>
  );
}
