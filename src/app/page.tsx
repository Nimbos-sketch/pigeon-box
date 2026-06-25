import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/inbox");
  }

  return (
    <main className="ableton-shell flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-3 flex justify-end">
          <ThemeToggle />
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          className="ableton-panel p-6"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ableton-orange">Session</p>
          <h1 className="mb-2 text-2xl font-semibold">Pigeon Box</h1>
          <p className="mb-6 text-sm text-ableton-muted">
            Sign in with Google to open Pigeon Box.
          </p>
          <button type="submit" className="ableton-btn ableton-btn-primary w-full py-2.5 text-sm">
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
