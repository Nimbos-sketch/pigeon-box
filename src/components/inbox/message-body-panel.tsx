"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stripUnsafeHtml } from "@/lib/email-html";

type MessageDetail = {
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  isNsfw?: boolean;
};

type MessageBodyPanelProps = {
  messageId: string;
  fallbackSnippet: string | null;
  /** Fill remaining flex space; body scrolls inside the panel. */
  fill?: boolean;
  /** Show formatted HTML by default when available (mobile respond overlay). */
  preferFormatted?: boolean;
  /** Borderless body for scrolling under a mobile overlay panel. */
  embedded?: boolean;
};

export function MessageBodyPanel({
  messageId,
  fallbackSnippet,
  fill = false,
  preferFormatted = false,
  embedded = false
}: MessageBodyPanelProps) {
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormatted, setShowFormatted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resizeEmbeddedIframe = useCallback((iframe: HTMLIFrameElement) => {
    const doc = iframe.contentDocument;
    if (!doc?.body) {
      return;
    }
    const height = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight ?? 0, 320);
    iframe.style.height = `${height}px`;
  }, []);

  const wireEmbeddedIframe = useCallback(
    (iframe: HTMLIFrameElement) => {
      resizeEmbeddedIframe(iframe);
      const doc = iframe.contentDocument;
      if (!doc) {
        return;
      }
      doc.querySelectorAll("img").forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", () => resizeEmbeddedIframe(iframe), { once: true });
        }
      });
    },
    [resizeEmbeddedIframe]
  );

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
          if (preferFormatted && data.message?.bodyHtml?.trim()) {
            setShowFormatted(true);
          }
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
  }, [messageId, preferFormatted]);

  const bodyText = detail?.bodyText?.trim() || detail?.snippet?.trim() || fallbackSnippet?.trim() || "";
  const bodyHtml = detail?.bodyHtml?.trim() || null;
  const canShowFormatted = Boolean(bodyHtml);

  useEffect(() => {
    if (embedded || !showFormatted || !bodyHtml || !iframeRef.current) {
      return;
    }
    wireEmbeddedIframe(iframeRef.current);
  }, [embedded, showFormatted, bodyHtml, wireEmbeddedIframe]);

  return (
    <div
      className={
        embedded
          ? "mb-4"
          : `border border-ableton-border bg-ableton-pane ${
              fill ? "mb-0 flex min-h-0 flex-1 flex-col overflow-hidden" : "mb-6"
            }`
      }
    >
      {!embedded ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ableton-border bg-ableton-pane2 px-3 py-2">
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
      ) : canShowFormatted ? (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className={`ableton-chip px-2 py-1 text-[10px] ${showFormatted ? "ableton-chip-active" : ""}`}
            onClick={() => setShowFormatted((current) => !current)}
          >
            {showFormatted ? "Plain text" : "Formatted"}
          </button>
        </div>
      ) : null}

      <div
        className={`text-sm leading-relaxed text-ableton-text ${
          embedded
            ? "overflow-visible"
            : `overflow-y-auto p-4 ${fill ? "min-h-0 flex-1" : "max-h-[min(50vh,28rem)]"}`
        }`}
      >
        {loading ? (
          <p className="text-ableton-muted">Loading full message...</p>
        ) : error ? (
          <p className="whitespace-pre-wrap text-ableton-text">{bodyText || "No message body available."}</p>
        ) : showFormatted && bodyHtml ? (
          embedded ? (
            <div
              className="email-formatted-body w-full bg-white p-3 text-sm leading-relaxed text-[#111]"
              dangerouslySetInnerHTML={{ __html: stripUnsafeHtml(bodyHtml) }}
            />
          ) : (
          <iframe
            ref={iframeRef}
            title="Email content"
            sandbox=""
            scrolling="no"
            srcDoc={wrapHtmlDocument(bodyHtml)}
            onLoad={(event) => {
              wireEmbeddedIframe(event.currentTarget);
            }}
            className="min-h-[12rem] w-full border border-ableton-border bg-white"
          />
          )
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
