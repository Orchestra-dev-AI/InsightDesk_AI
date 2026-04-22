"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle, BrainCircuit, ShieldCheck, AlertTriangle, Scale } from "lucide-react";
import * as api from "@/lib/api-client";
import type { AgentExecutionState } from "@/lib/types/reasoning";
import type { EnsembleResult } from "@/lib/types/evaluation";

export function LiveSandbox() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentExecutionState | null>(null);
  const [audit, setAudit] = useState<EnsembleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setAudit(null);
    
    try {
      // 1. Trigger Worker Resolution
      const response = await api.reasoning.resolve(query);
      setResult(response);

      // 2. Ingest into the Interaction Repository (saves to DB)
      await api.interactions.ingest(response);

      // 3. Trigger Supervisor Audit on the stored session
      const auditResult = await api.evaluate.jrh(response.session_id);
      setAudit(auditResult);

      // 4. Notify other components to refresh dashboard data
      window.dispatchEvent(new Event('refreshDashboardData'));

    } catch (err: any) {
      setError(err.message || "Failed to execute audit pipeline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card-static p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[var(--cyan)]" />
            Live Worker Sandbox
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Test your configured AI (Local, API, or Demo) and see real-time JRH evaluations.
          </p>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTest()}
          placeholder="Ask the AI a question to trigger the worker..."
          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--cyan)]"
          disabled={loading}
        />
        <button
          onClick={handleTest}
          disabled={loading || !query.trim()}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
            loading || !query.trim()
              ? "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed"
              : "bg-[var(--cyan)] text-white hover:bg-[var(--cyan-glow)] hover:shadow-[0_0_15px_var(--cyan-glow)]"
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Audit Test
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-[var(--red-glow)] border border-[var(--red)] text-[var(--red)] text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Result Area */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Output Display */}
          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Worker Output</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">
                  {result.total_latency_ms.toFixed(0)} ms
                </span>
                {result.autonomous_resolution ? (
                  <span className="text-xs text-[var(--green)] flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Resolved</span>
                ) : (
                  <span className="text-xs text-[var(--amber)] flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Escalated</span>
                )}
              </div>
            </div>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {result.final_resolution || "No output provided by the worker."}
            </p>
          </div>

          {/* Supervisor Audit - Real Data */}
          <div className={`p-4 rounded-lg border space-y-3 relative overflow-hidden transition-colors ${
            audit && audit.composite_score >= 8.0 ? "bg-[var(--green-glow)] border-[var(--green)]" : "bg-[var(--bg-surface)] border-[var(--border-active)]"
          }`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="w-16 h-16 text-[var(--violet)]" />
            </div>
            
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2 relative z-10">
              <span className="text-xs font-bold text-[var(--violet)] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> InsightDesk Supervisor Audit
              </span>
              <div className="flex items-center gap-3">
                {audit ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Reliability Score:</span>
                    <span className={`text-sm font-bold font-mono ${audit.composite_score >= 8.0 ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
                      {(audit.composite_score * 10).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Supervisor judging...</span>
                  </div>
                )}
              </div>
            </div>
            
            {audit ? (
              <div className="space-y-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {audit.judge_scores.map((judge, idx) => (
                    <div key={idx} className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-subtle)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase">{judge.model.split("/").pop()}</span>
                        <span className={`text-xs font-mono font-bold ${judge.score >= 8.0 ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
                          {judge.score.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] line-clamp-3 italic">
                        "{judge.reasoning}"
                      </p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${i < (judge.score / 2) ? "bg-[var(--violet)]" : "bg-[var(--bg-surface)]"}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {audit.needs_human_calibration && (
                  <div className="p-2 rounded bg-[var(--amber-glow)] border border-[var(--amber)] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--amber)]" />
                    <span className="text-[10px] text-[var(--amber)] font-semibold">Low consensus: Human calibration recommended</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)] relative z-10 italic">
                The worker's response has been sent to the JRH (Judge Reliability Harness). 
                NVIDIA Llama 3.3 and Qwen 2.5 are currently scoring this output...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
