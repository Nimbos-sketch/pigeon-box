"use client";

import type { ReactNode } from "react";

type PigeonWorkspaceProps = {
  inboxGrid: ReactNode;
  workspace: ReactNode;
  hint?: string;
};

export function PigeonWorkspace({ inboxGrid, workspace, hint }: PigeonWorkspaceProps) {
  return (
    <div className="pigeon-board overflow-hidden">
      <div className="ableton-panel-header flex flex-wrap items-center justify-between gap-2 border-b border-ableton-border">
        <span>Pigeon box · grid</span>
        {hint ? (
          <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-ableton-muted">{hint}</span>
        ) : null}
      </div>
      <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="max-h-[680px] overflow-y-auto bg-ableton-border p-px">{inboxGrid}</div>
        <div className="pigeon-workspace-pane max-h-[680px] overflow-y-auto p-4 lg:min-h-[560px]">{workspace}</div>
      </div>
    </div>
  );
}
