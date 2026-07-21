/** Strip common active content from HTML email before inline rendering on mobile. */
export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
}

export const MOBILE_EMAIL_SCROLL_CLASS =
  "mobile-message-scroll min-h-0 flex-1 basis-0 overflow-y-auto overscroll-y-contain";
