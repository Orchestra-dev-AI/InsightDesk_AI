"use client";

import type { HealingPatch, TestJourney } from "@/lib/types/self-healing";
import { ArrowRight, Check, AlertTriangle, X } from "lucide-react";

interface HealingMapProps {
  journey: TestJourney;
  patches?: HealingPatch[];
  className?: string;
}

const driftLabels: Record<string, string> = {
  selector_changed: "Selector Changed",
  attribute_changed: "Attribute Changed",
  element_removed: "Element Removed",
  element_relocated: "Element Relocated",
  api_schema_changed: "API Schema Changed",
  api_path_changed: "API Path Changed",
};

export function HealingMap({ journey, patches = [], className = "" }: HealingMapProps) {
  return (
    <div className={`glass-card-static p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{journey.name}</h3>
          <p className="text-[11px] text-[var(--text-muted)]">{journey.description}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${journey.is_healthy ? "bg-[var(--green)] pulse-live" : "bg-[var(--red)]"}`} />
      </div>

      <div className="space-y-0">
        {journey.steps.map((step, i) => {
          const patch = patches.find((p) => p.step_index === step.step_index);
          const hasDrift = !!patch;

          return (
            <div key={i} className="relative pl-8 pb-4">
              {i < journey.steps.length - 1 && (
                <div className={`absolute left-[14px] top-8 bottom-0 w-px ${hasDrift ? "bg-[var(--amber)]" : "bg-[var(--border-glass)]"}`} />
              )}

              <div className={`absolute left-[7px] top-2 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center ${
                hasDrift
                  ? patch.confidence >= 0.8
                    ? "border-[var(--green)] bg-[var(--green-glow)]"
                    : "border-[var(--amber)] bg-[var(--amber-glow)]"
                  : "border-[var(--text-muted)] bg-[var(--bg-surface)]"
              }`}>
                {hasDrift ? (
                  patch.confidence >= 0.8 ? (
                    <Check className="w-2 h-2 text-[var(--green)]" />
                  ) : (
                    <AlertTriangle className="w-2 h-2 text-[var(--amber)]" />
                  )
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                )}
              </div>

              <div className={`p-3 rounded-lg border ${
                hasDrift
                  ? "bg-[var(--bg-elevated)] border-[var(--amber)] border-opacity-30"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)]"
              }`}>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="font-mono text-[var(--text-muted)]">#{step.step_index}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-medium">
                    {step.action}
                  </span>
                  <span className="text-[var(--text-muted)] text-[10px]">{step.target.element_type}</span>
                </div>

                {hasDrift && patch && (
                  <div className="mt-2 p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <p className="text-[10px] font-medium text-[var(--amber)] mb-1">{driftLabels[patch.drift_type] ?? patch.drift_type}</p>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-[var(--red)] line-through">{patch.old_fingerprint.selector ?? patch.old_fingerprint.api_path ?? patch.old_fingerprint.element_id}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-[var(--green)]">{patch.new_fingerprint.selector ?? patch.new_fingerprint.api_path ?? patch.new_fingerprint.element_id}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-semibold ${patch.confidence >= 0.8 ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
                        {(patch.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        patch.confidence >= 0.8 ? "bg-[var(--green-glow)] text-[var(--green)]" : "bg-[var(--amber-glow)] text-[var(--amber)]"
                      }`}>
                        {patch.confidence >= 0.8 ? "Auto-applied" : "Needs Review"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
