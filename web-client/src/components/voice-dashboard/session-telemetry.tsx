"use client";

import { Activity, Waves, Signal } from "lucide-react";
import type { VoiceSession } from "@/lib/types/voice";

interface SessionTelemetryProps {
  session: VoiceSession | null;
}

export function SessionTelemetry({ session }: SessionTelemetryProps) {
  const metrics = [
    {
      label: "Jitter",
      value: session?.jitter_ms,
      unit: "ms",
      threshold: 30,
      icon: <Waves className="w-3.5 h-3.5" />,
    },
    {
      label: "Packet Loss",
      value: session?.packet_loss_pct,
      unit: "%",
      threshold: 1,
      icon: <Signal className="w-3.5 h-3.5" />,
    },
    {
      label: "MOS Score",
      value: session?.mos_score,
      unit: "/5",
      threshold: 4.3,
      icon: <Activity className="w-3.5 h-3.5" />,
      invertThreshold: true,
    },
  ];

  return (
    <div className="glass-card-static p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Session Telemetry
      </h3>

      <div className="space-y-4">
        {metrics.map((m) => {
          const isGood = m.invertThreshold
            ? (m.value ?? 0) >= m.threshold
            : (m.value ?? Infinity) <= m.threshold;

          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {m.icon}
                  {m.label}
                </div>
                <span
                  className={`text-sm font-mono font-semibold ${
                    m.value !== null && m.value !== undefined
                      ? isGood
                        ? "text-[var(--green)]"
                        : "text-[var(--amber)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {m.value !== null && m.value !== undefined
                    ? `${m.value.toFixed(1)}${m.unit}`
                    : `—${m.unit}`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isGood ? "bg-[var(--green)]" : "bg-[var(--amber)]"
                  }`}
                  style={{
                    width:
                      m.value !== null && m.value !== undefined
                        ? m.invertThreshold
                          ? `${Math.min((m.value / 5) * 100, 100)}%`
                          : `${Math.min((m.value / (m.threshold * 3)) * 100, 100)}%`
                        : "0%",
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
