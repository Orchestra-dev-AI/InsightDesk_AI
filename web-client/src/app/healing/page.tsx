"use client";

import { useCallback } from "react";
import { Heart, Wrench, TrendingDown } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { HealingMap } from "@/components/diagnostics/healing-map";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";

export default function HealingPage() {
  const { data: journeys } = useApi({
    fetcher: useCallback(() => api.healing.listJourneys(), []),
    pollInterval: 15000,
  });

  const { data: stats } = useApi({
    fetcher: useCallback(() => api.healing.getStats(), []),
    pollInterval: 15000,
  });

  const healthyCount = journeys?.filter((j) => j.is_healthy).length ?? 0;
  const totalCount = journeys?.length ?? 0;
  const healthPct = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Heart className="w-6 h-6 text-[var(--green)]" />
            Self-Healing Engine
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Autonomous test journey maintenance — 85% reduction target
          </p>
        </div>
        <StatusBadge
          status={totalCount === 0 ? "operational" : healthPct >= 80 ? "operational" : healthPct >= 50 ? "degraded" : "offline"}
          label="Healing Engine"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Journey Health"
          value={healthPct}
          unit="%"
          status={healthPct >= 80 ? "healthy" : healthPct >= 50 ? "warning" : "critical"}
          trend={healthPct >= 80 ? "up" : "down"}
          trendValue={`${healthyCount}/${totalCount} healthy`}
          icon={<Heart className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Healing Runs"
          value={stats?.total_healing_runs ?? 0}
          status="neutral"
          icon={<Wrench className="w-4 h-4" />}
        />
        <MetricCard
          title="Maintenance Reduction"
          value={stats?.maintenance_reduction_pct ?? 0}
          unit="%"
          status={
            (stats?.maintenance_reduction_pct ?? 0) >= 85
              ? "healthy"
              : (stats?.maintenance_reduction_pct ?? 0) >= 50
              ? "warning"
              : "critical"
          }
          trend="up"
          trendValue="Target: 85%"
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <MetricCard
          title="Registered Journeys"
          value={stats?.registered_journeys ?? 0}
          status="neutral"
        />
      </div>

      {/* Journey Health Grid */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Test Journey Registry
        </h2>

        {journeys && journeys.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {journeys.map((journey) => (
              <HealingMap key={journey.journey_id} journey={journey} />
            ))}
          </div>
        ) : (
          <div className="glass-card-static p-12 text-center">
            <Heart className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)]">
              No test journeys registered yet.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Register journeys via POST /healing/journeys on the Core Intelligence API.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
