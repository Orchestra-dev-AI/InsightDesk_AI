"use client";

import { useState } from "react";
import { Download, CheckCircle, XCircle } from "lucide-react";

interface TestRun {
  id: number;
  noiseProfile: string;
  dbLevel: number;
  interruptDetectionRate: number;
  falseStopRate: number;
  wer: number;
  passed: boolean;
}

const DEMO_RUNS: TestRun[] = [
  { id: 1, noiseProfile: "Office", dbLevel: 55, interruptDetectionRate: 94.2, falseStopRate: 3.1, wer: 8.5, passed: true },
  { id: 2, noiseProfile: "Café", dbLevel: 60, interruptDetectionRate: 91.7, falseStopRate: 4.8, wer: 12.3, passed: true },
  { id: 3, noiseProfile: "Street", dbLevel: 65, interruptDetectionRate: 87.3, falseStopRate: 6.2, wer: 18.1, passed: false },
  { id: 4, noiseProfile: "White Noise", dbLevel: 60, interruptDetectionRate: 92.5, falseStopRate: 3.9, wer: 10.8, passed: true },
];

export function StressResults({ className = "" }: { className?: string }) {
  const [runs] = useState<TestRun[]>(DEMO_RUNS);

  const exportResults = () => {
    const blob = new Blob([JSON.stringify(runs, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stress-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const avgInterrupt = runs.reduce((s, r) => s + r.interruptDetectionRate, 0) / runs.length;
  const avgFalseStop = runs.reduce((s, r) => s + r.falseStopRate, 0) / runs.length;

  return (
    <div className={`glass-card-static p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stress Test Results</h3>
        <button onClick={exportResults} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
          <Download className="w-3 h-3" /> Export JSON
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Avg Interrupt Detection</p>
          <span className={`text-xl font-bold font-mono ${avgInterrupt >= 90 ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>{avgInterrupt.toFixed(1)}%</span>
          <span className="text-[10px] text-[var(--text-muted)] ml-1">target &gt;90%</span>
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] mt-2">
            <div className={`h-full rounded-full ${avgInterrupt >= 90 ? "bg-[var(--green)]" : "bg-[var(--amber)]"}`} style={{ width: `${Math.min(avgInterrupt, 100)}%`, opacity: 0.8 }} />
          </div>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Avg False Stop Rate</p>
          <span className={`text-xl font-bold font-mono ${avgFalseStop <= 5 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{avgFalseStop.toFixed(1)}%</span>
          <span className="text-[10px] text-[var(--text-muted)] ml-1">target &lt;5%</span>
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] mt-2">
            <div className={`h-full rounded-full ${avgFalseStop <= 5 ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} style={{ width: `${Math.min(avgFalseStop * 10, 100)}%`, opacity: 0.8 }} />
          </div>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left py-2 px-2 text-[var(--text-muted)] font-medium">Profile</th>
            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">dB</th>
            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">Interrupt%</th>
            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">False Stop%</th>
            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">WER%</th>
            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-medium">Pass</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
              <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{r.noiseProfile}</td>
              <td className="py-2 px-2 text-center font-mono text-[var(--text-secondary)]">{r.dbLevel}</td>
              <td className="py-2 px-2 text-center"><span className={`font-mono font-semibold ${r.interruptDetectionRate >= 90 ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>{r.interruptDetectionRate}%</span></td>
              <td className="py-2 px-2 text-center"><span className={`font-mono font-semibold ${r.falseStopRate <= 5 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{r.falseStopRate}%</span></td>
              <td className="py-2 px-2 text-center font-mono text-[var(--text-secondary)]">{r.wer}%</td>
              <td className="py-2 px-2 text-center">{r.passed ? <CheckCircle className="w-4 h-4 text-[var(--green)] inline" /> : <XCircle className="w-4 h-4 text-[var(--red)] inline" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
