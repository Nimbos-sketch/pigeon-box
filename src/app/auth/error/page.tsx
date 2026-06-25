import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="ableton-shell flex min-h-screen items-center justify-center p-6">
      <div className="ableton-panel max-w-lg p-6">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">Auth Error</p>
        <h1 className="mb-2 text-xl font-semibold">Google sign-in failed</h1>
        <p className="mb-4 text-sm text-ableton-muted">
          Do not refresh the Google callback URL. Start sign-in again from the home page.
        </p>
        <Link href="/" className="ableton-btn ableton-btn-primary inline-block">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
