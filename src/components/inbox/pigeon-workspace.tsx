"use client";

import type { ReactNode } from "react";
import { PigeonLogo } from "@/components/brand/pigeon-logo";
import { useIsMdUp } from "@/hooks/use-media-query";

type PigeonWorkspaceProps = {
  inboxGrid: ReactNode;
  workspace: ReactNode;
  hint?: string;
  /** On viewports below md, show workspace instead of the grid when true. */
  showWorkspaceOnMobile?: boolean;
  onBackToGrid?: () => void;
  workspaceTitle?: string;
  /** Tighter mobile chrome when disposition panels should fill the screen. */
  compactChrome?: boolean;
  /** Hide the mobile back/title bar (e.g. email full-screen reading). */
  hideMobileHeader?: boolean;
};

export function PigeonWorkspace({
  inboxGrid,
  workspace,
  hint,
  showWorkspaceOnMobile = false,
  onBackToGrid,
  workspaceTitle,
  compactChrome = false,
  hideMobileHeader = false
}: PigeonWorkspaceProps) {
  const isMdUp = useIsMdUp();
  const mobileDetail = !isMdUp && showWorkspaceOnMobile;

  return (
    <div
      className={`${mobileDetail ? "flex min-h-0 flex-1 flex-col border-0" : "overflow-hidden pigeon-board"}`}
    >
      <div
        className={`ableton-panel-header flex flex-wrap items-center justify-between gap-2 border-b border-ableton-border ${
          compactChrome ? "py-1" : ""
        } ${hideMobileHeader ? "hidden" : ""}`}
      >
        {mobileDetail ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" className="ableton-btn shrink-0 px-2 py-1 text-[10px]" onClick={onBackToGrid}>
              ← Grid
            </button>
            <PigeonLogo size={28} className="shrink-0 rounded border border-ableton-border bg-ableton-pane2 p-0.5" />
            <span className="truncate font-normal normal-case tracking-normal text-ableton-text">
              {workspaceTitle ?? "Message"}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <PigeonLogo size={36} className="rounded border border-ableton-border bg-ableton-pane2 p-0.5" />
              <span>Pigeon Box · grid</span>
            </div>
            {hint ? (
              <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-ableton-muted">{hint}</span>
            ) : null}
          </>
        )}
      </div>

      {mobileDetail ? (
        <div className="pigeon-workspace-pane flex min-h-0 flex-1 flex-col overflow-hidden border-0 p-0">{workspace}</div>
      ) : (
        <div className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] md:min-h-[420px] lg:min-h-[560px]">
          <div
            className={`overflow-y-auto bg-ableton-border p-px ${
              isMdUp ? "max-h-[680px]" : "max-h-[min(68dvh,720px)]"
            }`}
          >
            {inboxGrid}
          </div>
          {isMdUp ? (
            <div className="pigeon-workspace-pane max-h-[680px] overflow-y-auto p-4 lg:min-h-[560px]">{workspace}</div>
          ) : (
            <div className="border-t border-ableton-border bg-ableton-pane p-4 text-center text-sm text-ableton-muted">
              Select a cell to open the action panel
            </div>
          )}
        </div>
      )}
    </div>
  );
}
