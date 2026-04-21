"use client";

import { useState, useEffect, useRef } from "react";

export interface InferenceStatus {
  isRunning: boolean;
  modelName: string;
  modelParams: string;
  tokensPerSec: number;
  memoryUsagePct: number;
  queueDepth: number;
  totalInferences: number;
  avgLatencyMs: number;
}

const MOCK_MODELS = [
  { name: "Qwen 2.5", params: "32B", tps: 46, mem: 72 },
  { name: "Llama 3.3", params: "70B", tps: 21, mem: 91 },
];

/**
 * Polls the local inference backend for throughput metrics.
 * Falls back to simulated data when no local inference server is running.
 */
export function useInferenceStatus(pollMs: number = 2000): InferenceStatus {
  const [status, setStatus] = useState<InferenceStatus>({
    isRunning: false,
    modelName: "—",
    modelParams: "—",
    tokensPerSec: 0,
    memoryUsagePct: 0,
    queueDepth: 0,
    totalInferences: 0,
    avgLatencyMs: 0,
  });

  const tickRef = useRef(0);

  useEffect(() => {
    // Attempt to poll a real local inference server
    const poll = async () => {
      try {
        const res = await fetch("http://localhost:11434/api/status", {
          signal: AbortSignal.timeout(1000),
        });
        if (res.ok) {
          const data = await res.json();
          setStatus({
            isRunning: true,
            modelName: data.model_name ?? "Unknown",
            modelParams: data.model_params ?? "?B",
            tokensPerSec: data.tokens_per_sec ?? 0,
            memoryUsagePct: data.memory_usage_pct ?? 0,
            queueDepth: data.queue_depth ?? 0,
            totalInferences: data.total_inferences ?? 0,
            avgLatencyMs: data.avg_latency_ms ?? 0,
          });
          return;
        }
      } catch {
        // No local server — use simulated data for demo
      }

      // Simulated data for demonstration
      tickRef.current += 1;
      const model = MOCK_MODELS[tickRef.current % 60 < 40 ? 0 : 1];
      const jitter = (Math.random() - 0.5) * 4;

      setStatus({
        isRunning: true,
        modelName: model.name,
        modelParams: model.params,
        tokensPerSec: Math.round((model.tps + jitter) * 10) / 10,
        memoryUsagePct: Math.round(model.mem + (Math.random() - 0.5) * 3),
        queueDepth: Math.floor(Math.random() * 3),
        totalInferences: 1247 + tickRef.current,
        avgLatencyMs: Math.round(180 + Math.random() * 40),
      });
    };

    poll();
    const timer = setInterval(poll, pollMs);
    return () => clearInterval(timer);
  }, [pollMs]);

  return status;
}
