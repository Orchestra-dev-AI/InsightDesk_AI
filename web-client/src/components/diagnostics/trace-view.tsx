"use client";

import type { ThoughtStep, ToolInvocation, ActionType } from "@/lib/types/reasoning";
import { Brain, Wrench, MessageSquare, RotateCcw, AlertTriangle } from "lucide-react";

const actionIcons: Record<string, React.ReactNode> = {
  tool_call: <Wrench className="w-3.5 h-3.5" />,
  memory_update: <Brain className="w-3.5 h-3.5" />,
  response: <MessageSquare className="w-3.5 h-3.5" />,
  self_correct: <RotateCcw className="w-3.5 h-3.5" />,
};

interface TraceViewProps {
  steps: ThoughtStep[];
  toolCalls: ToolInvocation[];
  failedStepIndex?: number | null;
  rcaExplanation?: string;
  className?: string;
}

export function TraceView({ steps, toolCalls, failedStepIndex, rcaExplanation, className = "" }: TraceViewProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {steps.map((step, i) => {
        const isFailed = failedStepIndex === step.step_index;
        const toolCall = step.action_type === ("tool_call" as ActionType)
          ? toolCalls.find((_, ti) => ti === i)
          : null;

        return (
          <div key={i} className="relative pl-8">
            {/* Vertical line */}
            {i < steps.length - 1 && (
              <div className={`absolute left-[14px] top-8 bottom-0 w-px ${isFailed ? "bg-[var(--red)]" : "bg-[var(--border-glass)]"}`} />
            )}

            {/* Node dot */}
            <div className={`absolute left-[7px] top-2 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center ${
              isFailed
                ? "border-[var(--red)] bg-[var(--red-glow)]"
                : step.confidence >= 0.8
                ? "border-[var(--green)] bg-[var(--green-glow)]"
                : "border-[var(--amber)] bg-[var(--amber-glow)]"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                isFailed ? "bg-[var(--red)]" : step.confidence >= 0.8 ? "bg-[var(--green)]" : "bg-[var(--amber)]"
              }`} />
            </div>

            {/* Content */}
            <div className={`pb-5 ${isFailed ? "animate-pulse" : ""}`}>
              <div className={`p-3 rounded-lg border transition-all ${
                isFailed
                  ? "bg-[var(--red-glow)] border-[var(--red)] border-opacity-30"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-glass)]"
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      Step {step.step_index}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isFailed ? "bg-[var(--red-glow)] text-[var(--red)]" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                    }`}>
                      {actionIcons[step.action_type]}
                      {step.action_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {step.latency_ms && (
                      <span className="font-mono text-[var(--text-muted)]">{Math.round(step.latency_ms)}ms</span>
                    )}
                    <span className={`font-mono font-semibold ${
                      step.confidence >= 0.8 ? "text-[var(--green)]" : step.confidence >= 0.5 ? "text-[var(--amber)]" : "text-[var(--red)]"
                    }`}>
                      {(step.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Thinking */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-1">
                  {step.thinking}
                </p>

                {/* Observation */}
                {step.observation && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 pl-2 border-l-2 border-[var(--border-glass)]">
                    {step.observation}
                  </p>
                )}

                {/* Tool call detail */}
                {toolCall && (
                  <div className="mt-2 p-2 rounded bg-[var(--bg-elevated)] text-[10px] font-mono">
                    <span className="text-[var(--cyan)]">{toolCall.tool_name}</span>
                    <span className="text-[var(--text-muted)]">({toolCall.latency_ms}ms)</span>
                    {!toolCall.success && (
                      <span className="text-[var(--red)] ml-2">✗ {toolCall.error}</span>
                    )}
                  </div>
                )}

                {/* RCA annotation */}
                {isFailed && rcaExplanation && (
                  <div className="mt-2 p-2 rounded bg-[var(--red-glow)] border border-[var(--red)] border-opacity-20 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--red)] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[var(--red)]">{rcaExplanation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
