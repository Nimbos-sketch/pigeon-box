import Link from "next/link";
import { env } from "@/lib/env";

export default function AuthSetupPage() {
  const origin = env.authUrl ?? "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/callback/google`;
  const clientId = env.googleClientId;

  return (
    <main className="ableton-shell flex min-h-screen items-center justify-center p-6">
      <div className="ableton-panel w-full max-w-lg p-6">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">OAuth setup</p>
        <h1 className="mb-2 text-xl font-semibold">Google Console values</h1>
        <p className="mb-4 text-sm text-ableton-muted">
          Open the credential whose <strong>Client ID matches exactly</strong> below — not just the name
          &quot;Pigeon Box Dev&quot;.
        </p>

        <div className="space-y-4 text-sm">
          <div className="border border-ableton-border bg-ableton-pane2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-muted">Client ID (must match)</p>
            <p className="mt-1 break-all font-mono text-xs text-ableton-orange">{clientId}</p>
          </div>

          <div className="border border-ableton-border bg-ableton-pane2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-muted">
              Authorized JavaScript origins
            </p>
            <p className="mt-1 break-all font-mono text-xs">{origin}</p>
          </div>

          <div className="border border-ableton-border bg-ableton-pane2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ableton-muted">
              Authorized redirect URIs
            </p>
            <p className="mt-1 break-all font-mono text-xs text-ableton-lime">{redirectUri}</p>
          </div>
        </div>

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-ableton-subtle">
          <li>Google Cloud Console → APIs &amp; Services → Credentials</li>
          <li>Click the Web client with the Client ID above</li>
          <li>Type must be <strong>Web application</strong> (not iOS / Android / Desktop)</li>
          <li>Paste origin and redirect URI into the correct fields, Save, wait 1 minute</li>
        </ol>

        <div className="mt-5 flex gap-2">
          <Link href="/" className="ableton-btn ableton-btn-primary">
            Try sign in
          </Link>
          <Link href="/auth/error" className="ableton-btn">
            Auth error help
          </Link>
        </div>
      </div>
    </main>
  );
}
