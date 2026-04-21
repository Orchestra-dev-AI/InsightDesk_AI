"use client";

import type { JudgeVerdict } from "@/lib/types/evaluation";
import { Scale } from "lucide-react";

interface JRHVerdictPanelProps {
  verdicts: JudgeVerdict[];
  compositeScore?: number | null;
  needsCalibration?: boolean;
  className?: string;
}

const subScoreKeys = [
  { key: "coherence_score", label: "Coherence" },
  { key: "consistency_score", label: "Consistency" },
  { key: "fluency_score", label: "Fluency" },
  { key: "relevance_score", label: "Relevance" },
] as const;

export function JRHVerdictPanel({ verdicts, compositeScore, needsCalibration, className = "" }: JRHVerdictPanelProps) {
  if (!verdicts.length) {
    return (
      <div className={`glass-card-static p-6 ${className}`}>
        <p className="text-sm text-[var(--text-muted)] text-center py-4">No JRH verdicts available</p>
      </div>
    );
  }

  return (
    <div className={`glass-card-static p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Scale className="w-4 h-4 text-[var(--cyan)]" />
          Multi-Judge Reliability Harness
        </h3>
        {compositeScore !== null && compositeScore !== undefined && (
          <div className="text-right">
            <span className={`text-lg font-bold font-mono ${compositeScore >= 0.85 ? "text-[var(--green)]" : compositeScore >= 0.7 ? "text-[var(--amber)]" : "text-[var(--red)]"}`}>
              {(compositeScore * 100).toFixed(1)}%
            </span>
            {needsCalibration && <p className="text-[10px] text-[var(--amber)]">Needs Calibration</p>}
          </div>
        )}
      </div>

      {/* 3-column judge comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {verdicts.map((v, i) => (
          <div key={i} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Judge {v.position_index + 1}</p>
                <p className="text-[11px] font-medium text-[var(--text-primary)]">{v.judge_provider}</p>
                <p className="text-[10px] font-mono text-[var(--text-muted)]">{v.judge_model}</p>
              </div>
              <span className={`text-lg font-bold font-mono ${v.score >= 0.85 ? "text-[var(--green)]" : v.score >= 0.7 ? "text-[var(--amber)]" : "text-[var(--red)]"}`}>
                {(v.score * 100).toFixed(0)}
              </span>
            </div>

            {/* Sub-scores as bars */}
            <div className="space-y-1.5 mt-3">
              {subScoreKeys.map(({ key, label }) => {
                const val = v[key] as number | undefined;
                return val !== undefined ? (
                  <div key={key}>
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono">{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[var(--bg-elevated)]">
                      <div className="h-full rounded-full bg-[var(--cyan)] transition-all" style={{ width: `${val * 100}%`, opacity: 0.75 }} />
                    </div>
                  </div>
                ) : null;
              })}
            </div>

            {/* Reasoning */}
            <p className="text-[10px] text-[var(--text-muted)] mt-2 line-clamp-3 leading-relaxed">{v.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
