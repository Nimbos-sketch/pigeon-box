import { MailNav } from "@/components/layout/mail-nav";
import { PigeonLogo } from "@/components/brand/pigeon-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth";

export function MailShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="ableton-shell flex h-dvh flex-col overflow-hidden">
      <header className="ableton-topbar shrink-0 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <PigeonLogo size={52} className="rounded-md border border-ableton-border bg-ableton-pane2 p-1" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-ableton-text">Pigeon Box</p>
            <p className="truncate text-xs text-ableton-muted">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="ableton-btn" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <MailNav />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
