"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="ableton-shell flex min-h-screen items-center justify-center p-6">
      <div className="ableton-panel max-w-lg p-6">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-orange">Runtime Error</p>
        <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
        <p className="mb-4 text-sm text-ableton-muted">{error.message || "Internal server error"}</p>
        <button type="button" className="ableton-btn ableton-btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
