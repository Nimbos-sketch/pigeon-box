"use client";

import { useEffect, useState } from "react";

type MessageDetail = {
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  isNsfw?: boolean;
};

type MessageBodyPanelProps = {
  messageId: string;
  fallbackSnippet: string | null;
};

export function MessageBodyPanel({ messageId, fallbackSnippet }: MessageBodyPanelProps) {
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormatted, setShowFormatted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    setShowFormatted(false);

    void fetch(`/api/messages/${messageId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load full message");
        }
        const data = (await response.json()) as { message?: MessageDetail };
        if (!cancelled) {
          setDetail(data.message ?? null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load message");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  const bodyText = detail?.bodyText?.trim() || detail?.snippet?.trim() || fallbackSnippet?.trim() || "";
  const bodyHtml = detail?.bodyHtml?.trim() || null;
  const canShowFormatted = Boolean(bodyHtml);

  return (
    <div className="mb-6 border border-ableton-border bg-ableton-pane">
      <div className="flex items-center justify-between gap-2 border-b border-ableton-border bg-ableton-pane2 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ableton-muted">Message</p>
        {canShowFormatted ? (
          <button
            type="button"
            className={`ableton-chip px-2 py-1 text-[10px] ${showFormatted ? "ableton-chip-active" : ""}`}
            onClick={() => setShowFormatted((current) => !current)}
          >
            {showFormatted ? "Plain text" : "Formatted"}
          </button>
        ) : null}
      </div>

      <div className="max-h-[min(50vh,28rem)] overflow-y-auto p-4 text-sm leading-relaxed text-ableton-text">
        {loading ? (
          <p className="text-ableton-muted">Loading full message...</p>
        ) : error ? (
          <p className="whitespace-pre-wrap text-ableton-text">{bodyText || "No message body available."}</p>
        ) : showFormatted && bodyHtml ? (
          <iframe
            title="Email content"
            sandbox=""
            srcDoc={wrapHtmlDocument(bodyHtml)}
            className="min-h-[12rem] w-full border border-ableton-border bg-white"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{bodyText || "No message body available."}</p>
        )}
      </div>
    </div>
  );
}

function wrapHtmlDocument(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #111; }
    img { max-width: 100%; height: auto; }
    a { color: #c45a2c; }
  </style></head><body>${html}</body></html>`;
}
