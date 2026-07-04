export function PhishingWarningBanner() {
  return (
    <div className="mb-4 border border-amber-700/70 bg-amber-950/30 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">Possible phishing</p>
      <p className="mt-2 text-sm text-ableton-text">
        This message looks suspicious. Do not click links, download attachments, or enter passwords.
      </p>
      <p className="mt-2 text-xs text-ableton-muted">
        Pigeon Box never asks for your password by email. Verify senders directly on the official website.
      </p>
    </div>
  );
}
