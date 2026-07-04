import Link from "next/link";
import { env } from "@/lib/env";

const ERROR_HINTS: Record<string, string> = {
  Configuration:
    "Server auth config is wrong. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_URL, and NEXTAUTH_URL in .env.",
  AccessDenied:
    "Google blocked the sign-in. If the app is in Testing mode, add your Gmail address under OAuth consent screen → Test users.",
  Verification:
    "Google could not verify this app. Add yourself as a test user while the app is in Testing mode.",
  OAuthSignin: "Could not start Google sign-in. Try again from the home page — do not refresh the callback URL.",
  OAuthCallback:
    "Google callback failed. Usually redirect URI mismatch — see the redirect URI checklist below.",
  OAuthCreateAccount: "Could not create your account after Google sign-in. Try again.",
  CallbackRouteError: "Something went wrong on the callback route. Clear Safari cache and sign in again from the home page.",
  Default: "Sign-in failed. Start again from the home page — do not bookmark or refresh the Google callback URL."
};

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const code = error ?? "Default";
  const hint = ERROR_HINTS[code] ?? ERROR_HINTS.Default;
  const callbackUri = `${env.authUrl}/api/auth/callback/google`;
  const origin = env.authUrl;

  return (
    <main className="ableton-shell flex min-h-screen items-center justify-center p-6">
      <div className="ableton-panel max-w-lg p-6">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">Auth Error</p>
        <h1 className="mb-2 text-xl font-semibold">Google sign-in failed</h1>
        {error ? (
          <p className="mb-2 font-mono text-xs text-red-300">Error code: {error}</p>
        ) : null}
        <p className="mb-4 text-sm text-ableton-muted">{hint}</p>
        <div className="mb-4 border border-ableton-border bg-ableton-pane2 p-3 text-xs text-ableton-subtle">
          <p className="font-semibold text-ableton-text">Google Cloud Console checklist</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Credentials → Web client → Authorized redirect URI (exact):</li>
          </ul>
          <p className="mt-1 break-all font-mono text-[10px] text-ableton-orange">{callbackUri}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Authorized JavaScript origin: {origin}</li>
            <li>OAuth consent screen → add your Gmail as a Test user (if app is in Testing)</li>
            <li>Enable Gmail API for this Google Cloud project</li>
          </ul>
        </div>
        <Link href="/" className="ableton-btn ableton-btn-primary inline-block">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
