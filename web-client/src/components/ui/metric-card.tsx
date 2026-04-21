"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type MetricStatus = "healthy" | "warning" | "critical" | "neutral";
type TrendDirection = "up" | "down" | "flat";

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: TrendDirection;
  trendValue?: string;
  status?: MetricStatus;
  icon?: React.ReactNode;
  className?: string;
}

const statusColors: Record<MetricStatus, string> = {
  healthy: "border-glow-green glow-green",
  warning: "border-glow-amber glow-amber",
  critical: "border-glow-red glow-red",
  neutral: "",
};

const statusDotColors: Record<MetricStatus, string> = {
  healthy: "bg-[var(--green)]",
  warning: "bg-[var(--amber)]",
  critical: "bg-[var(--red)]",
  neutral: "bg-[var(--text-muted)]",
};

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  up: <TrendingUp className="w-3.5 h-3.5" />,
  down: <TrendingDown className="w-3.5 h-3.5" />,
  flat: <Minus className="w-3.5 h-3.5" />,
};

const trendColors: Record<TrendDirection, string> = {
  up: "text-[var(--green)]",
  down: "text-[var(--red)]",
  flat: "text-[var(--text-muted)]",
};

export function MetricCard({
  title,
  value,
  unit,
  trend = "flat",
  trendValue,
  status = "neutral",
  icon,
  className = "",
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    typeof value === "number" ? "0" : value
  );
  const prevValue = useRef(value);

  useEffect(() => {
    if (typeof value !== "number") {
      setDisplayValue(value);
      return;
    }

    const start = typeof prevValue.current === "number" ? prevValue.current : 0;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + (end - start) * eased;

      if (Number.isInteger(end)) {
        setDisplayValue(Math.round(current).toString());
      } else {
        setDisplayValue(current.toFixed(end < 10 ? 2 : 1));
      }

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  return (
    <div
      className={`glass-card p-5 animate-in ${statusColors[status]} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {status !== "neutral" && (
            <div
              className={`w-2 h-2 rounded-full ${statusDotColors[status]} ${
                status === "healthy" ? "pulse-live" : ""
              }`}
            />
          )}
          {icon && (
            <div className="text-[var(--text-muted)]">{icon}</div>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
          {displayValue}
        </span>
        {unit && (
          <span className="text-sm text-[var(--text-muted)] font-medium">
            {unit}
          </span>
        )}
      </div>

      {(trend || trendValue) && (
        <div
          className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColors[trend]}`}
        >
          {trendIcons[trend]}
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  );
}
