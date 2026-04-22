"use client";

import { Cpu, Gauge, HardDrive, Layers, DollarSign, Activity } from "lucide-react";
import { useHardwareDetect } from "@/hooks/local-inference/use-hardware-detect";
import { useInferenceStatus } from "@/hooks/local-inference/use-inference-status";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";

export default function InferencePage() {
  const hw = useHardwareDetect();
  const inf = useInferenceStatus(2000);

  // Cost savings estimate: $0.015 per 1K tokens cloud vs $0 local
  const savedTokens = inf.totalInferences * 280; // ~280 tokens avg per inference
  const savedDollars = (savedTokens / 1000) * 0.015;

  const tpsStatus = inf.tokensPerSec >= 40 ? "healthy" : inf.tokensPerSec >= 20 ? "warning" : "critical";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Cpu className="w-6 h-6 text-[var(--violet)]" />
            Local Inference Hub
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Edge QA — 2026 Apple Silicon optimized local LLM judges
          </p>
        </div>
        <StatusBadge
          status={inf.isRunning ? "operational" : "offline"}
          label={inf.isRunning ? "Inference Active" : "Offline"}
        />
      </div>

      {/* Hardware Detection Card */}
      <div className="glass-card-static p-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[var(--cyan)]" />
          Hardware Detection
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Device Tier</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{hw.label}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Max Model</p>
            <p className="text-sm font-semibold text-[var(--cyan)]">{hw.maxModelParams}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Expected Throughput</p>
            <p className="text-sm font-semibold text-[var(--green)]">{hw.expectedThroughput}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">WebGPU</p>
            <p className={`text-sm font-semibold ${hw.hasGPU ? "text-[var(--green)]" : "text-[var(--text-muted)]"}`}>
              {hw.tier === "detecting" ? "Detecting…" : hw.hasGPU ? "Available" : "Not Available"}
            </p>
          </div>
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tokens / sec"
          value={inf.tokensPerSec}
          unit="t/s"
          status={tpsStatus}
          trend={inf.tokensPerSec >= 40 ? "up" : "flat"}
          trendValue="Target: 42-50 t/s"
          icon={<Gauge className="w-4 h-4" />}
        />
        <MetricCard
          title="Memory Usage"
          value={inf.memoryUsagePct}
          unit="%"
          status={inf.memoryUsagePct <= 85 ? "healthy" : "warning"}
          icon={<HardDrive className="w-4 h-4" />}
        />
        <MetricCard
          title="Queue Depth"
          value={inf.queueDepth}
          status={inf.queueDepth <= 2 ? "healthy" : "warning"}
          icon={<Layers className="w-4 h-4" />}
        />
        <MetricCard
          title="Cloud Savings"
          value={`$${savedDollars.toFixed(2)}`}
          status="healthy"
          trend="up"
          trendValue={`${(savedTokens / 1000).toFixed(0)}K tokens local`}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      {/* Model Roster + Live Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Model */}
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--green)]" />
            Active Model
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{inf.modelName}</p>
                <p className="text-xs text-[var(--text-muted)]">{inf.modelParams} parameters</p>
              </div>
              <div className={`text-3xl font-bold font-mono ${
                inf.tokensPerSec >= 40 ? "text-[var(--green)]" : inf.tokensPerSec >= 20 ? "text-[var(--amber)]" : "text-[var(--red)]"
              }`}>
                {inf.tokensPerSec.toFixed(1)}
                <span className="text-xs text-[var(--text-muted)] ml-1">t/s</span>
              </div>
            </div>

            {/* Throughput bar */}
            <div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span>Throughput</span>
                <span>{Math.round((inf.tokensPerSec / 50) * 100)}% of peak</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[var(--bg-surface)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    inf.tokensPerSec >= 40 ? "bg-[var(--green)]" : inf.tokensPerSec >= 20 ? "bg-[var(--amber)]" : "bg-[var(--red)]"
                  }`}
                  style={{ width: `${Math.min((inf.tokensPerSec / 50) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Memory bar */}
            <div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                <span>Unified Memory</span>
                <span>{inf.memoryUsagePct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[var(--bg-surface)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    inf.memoryUsagePct <= 80 ? "bg-[var(--cyan)]" : "bg-[var(--amber)]"
                  }`}
                  style={{ width: `${inf.memoryUsagePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Model Roster Table */}
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Model Roster — Edge QA
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left py-2 text-[var(--text-muted)] font-medium">Model</th>
                <th className="text-center py-2 text-[var(--text-muted)] font-medium">Params</th>
                <th className="text-center py-2 text-[var(--text-muted)] font-medium">Tier</th>
                <th className="text-center py-2 text-[var(--text-muted)] font-medium">Speed</th>
                <th className="text-center py-2 text-[var(--text-muted)] font-medium">Use Case</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-2.5 font-medium text-[var(--text-primary)]">Llama 3.3 Instruct</td>
                <td className="py-2.5 text-center font-mono text-[var(--violet)]">70B</td>
                <td className="py-2.5 text-center text-[var(--text-secondary)]">NVIDIA NIM</td>
                <td className="py-2.5 text-center font-mono text-[var(--green)]">High Logic</td>
                <td className="py-2.5 text-center text-[var(--text-muted)]">Supervisor Judge 1 (Reasoning)</td>
              </tr>
              <tr className="border-b border-[var(--border-subtle)]">
                <td className="py-2.5 font-medium text-[var(--text-primary)]">Qwen 2.5 Coder</td>
                <td className="py-2.5 text-center font-mono text-[var(--cyan)]">32B</td>
                <td className="py-2.5 text-center text-[var(--text-secondary)]">NVIDIA NIM</td>
                <td className="py-2.5 text-center font-mono text-[var(--green)]">Specialist</td>
                <td className="py-2.5 text-center text-[var(--text-muted)]">Supervisor Judge 2 (Audit/Code)</td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-[var(--text-primary)]">Internal Worker</td>
                <td className="py-2.5 text-center font-mono text-[var(--amber)]">70B+</td>
                <td className="py-2.5 text-center text-[var(--text-secondary)]">Groq/NVIDIA</td>
                <td className="py-2.5 text-center font-mono text-[var(--green)]">Fast</td>
                <td className="py-2.5 text-center text-[var(--text-muted)]">Configurable Base AI</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
