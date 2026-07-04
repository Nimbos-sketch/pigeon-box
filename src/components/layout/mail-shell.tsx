import { MailNav } from "@/components/layout/mail-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth";

export function MailShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="ableton-shell flex h-dvh flex-col overflow-hidden">
      <header className="ableton-topbar shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center border border-ableton-orange bg-ableton-pane2 text-xs font-bold text-ableton-orange">
            PB
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ableton-muted">Pigeon box</p>
            <p className="text-sm font-medium">{email}</p>
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
