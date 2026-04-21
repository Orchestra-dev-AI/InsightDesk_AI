"use client";

import { AlertTriangle, Lightbulb, Code } from "lucide-react";
import type { RCATrace } from "@/lib/types/evaluation";

const severityColors: Record<string, string> = {
  critical: "bg-[var(--red-glow)] text-[var(--red)] border-[var(--red)]",
  high: "bg-[var(--amber-glow)] text-[var(--amber)] border-[var(--amber)]",
  medium: "bg-[var(--violet-glow)] text-[var(--violet)] border-[var(--violet)]",
  low: "bg-[var(--cyan-glow)] text-[var(--cyan)] border-[var(--cyan)]",
};

interface RCADetailProps {
  trace: RCATrace | null;
  className?: string;
}

export function RCADetail({ trace, className = "" }: RCADetailProps) {
  if (!trace) {
    return (
      <div className={`glass-card-static p-6 flex items-center justify-center h-64 ${className}`}>
        <p className="text-sm text-[var(--text-muted)]">Select a trace to view RCA details</p>
      </div>
    );
  }

  const sevClass = severityColors[trace.severity] ?? severityColors.medium;

  return (
    <div className={`glass-card-static p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Root Cause Analysis</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-opacity-30 ${sevClass}`}>
          {trace.severity}
        </span>
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Failure Category
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{trace.failure_category}</p>
        </div>

        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Lightbulb className="w-3.5 h-3.5" /> Root Cause
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{trace.root_cause_explanation}</p>
        </div>

        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Lightbulb className="w-3.5 h-3.5" /> Recommended Action
          </div>
          <p className="text-xs text-[var(--cyan)]">{trace.recommended_action}</p>
        </div>

        {trace.failed_tool_name && (
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>Failed Tool: <span className="font-mono text-[var(--red)]">{trace.failed_tool_name}</span></span>
            {trace.failed_step_index !== null && trace.failed_step_index !== undefined && (
              <span>Step: <span className="font-mono text-[var(--amber)]">#{trace.failed_step_index}</span></span>
            )}
          </div>
        )}

        {trace.regression_test_generated && (
          <div className="flex items-center gap-2 p-2 rounded bg-[var(--green-glow)] text-[var(--green)] text-[11px] font-medium">
            <Code className="w-3.5 h-3.5" />
            Shift-Left regression test auto-generated
          </div>
        )}
      </div>
    </div>
  );
}
