import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { PigeonLogo } from "@/components/brand/pigeon-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/inbox");
  }

  return (
    <main className="ableton-shell flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-3 flex justify-end">
          <ThemeToggle />
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          className="ableton-panel p-8"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <PigeonLogo size={88} className="rounded-lg border border-ableton-border bg-ableton-pane2 p-2" />
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ableton-orange">Session</p>
            <h1 className="mt-1 text-3xl font-semibold">Pigeon Box</h1>
          </div>
          <p className="mb-6 text-center text-sm text-ableton-muted">
            Sign in with Google to open Pigeon Box.
          </p>
          <button type="submit" className="ableton-btn ableton-btn-primary w-full py-2.5 text-sm">
            Sign in with Google
          </button>
          <p className="mt-4 text-center text-xs text-ableton-muted">
            <a href="/auth/setup" className="text-ableton-orange underline">
              Google OAuth setup (redirect URI mismatch?)
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
