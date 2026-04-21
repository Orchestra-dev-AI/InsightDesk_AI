# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Metrics Aggregator
# Dashboard-facing metrics: Hallucination Index, Resolution Rate, Accuracy
# Trend, Voice Quality, and JRH Agreement Rate.
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db import repository

logger = logging.getLogger("insightdesk.infra.aggregator")


class MetricsAggregator:
    """
    Computes dashboard metrics from the Interaction Intelligence Repository.

    Metrics:
      • Hallucination Index — rolling % of hallucination-flagged interactions
      • Resolution Rate — % of autonomous resolutions (target: 80%)
      • Accuracy Trend — moving average of accuracy_score
      • Voice Quality — aggregate MOS, WER, TTFA (future: voice data)
      • JRH Agreement Rate — % of evaluations where judges agreed
    """

    def __init__(self) -> None:
        self.sla_accuracy = settings.SLA_ACCURACY
        self.sla_resolution_rate = settings.SLA_RESOLUTION_RATE
        self.sla_mos = settings.SLA_MOS_SCORE
        self.sla_latency_ms = settings.SLA_LATENCY_MS

    async def get_dashboard_metrics(
        self,
        session: AsyncSession,
        window_hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Compute all dashboard metrics for the given time window.

        Returns a structured dict ready for the /metrics/dashboard endpoint.
        """
        since = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        stats = await repository.get_aggregate_stats(session, since=since)

        return {
            "window_hours": window_hours,
            "period_start": since.isoformat(),
            "period_end": datetime.now(timezone.utc).isoformat(),

            # ── Core KPIs ────────────────────────────────────────────────────
            "total_interactions": stats["total_interactions"],
            "resolution_rate": {
                "value": stats["resolution_rate"],
                "target": self.sla_resolution_rate,
                "meets_sla": stats["resolution_rate"] >= self.sla_resolution_rate,
            },
            "accuracy": {
                "avg_score": stats["avg_accuracy"],
                "target": self.sla_accuracy,
                "meets_sla": stats["avg_accuracy"] >= self.sla_accuracy,
            },
            "hallucination_index": {
                "value": stats["hallucination_index"],
                "count": stats["hallucination_count"],
                "target": 0.02,  # 2% max hallucination rate
                "meets_sla": stats["hallucination_index"] <= 0.02,
            },

            # ── Latency ─────────────────────────────────────────────────────
            "latency": {
                "avg_ms": stats["avg_latency_ms"],
                "target_ms": self.sla_latency_ms,
                "meets_sla": stats["avg_latency_ms"] <= self.sla_latency_ms,
            },

            # ── JRH ─────────────────────────────────────────────────────────
            "jrh": {
                "agreement_rate": stats["jrh_agreement_rate"],
                "calibration_needed_count": stats["jrh_calibration_count"],
            },

            # ── SLA Summary ─────────────────────────────────────────────────
            "sla_summary": {
                "all_met": all([
                    stats["resolution_rate"] >= self.sla_resolution_rate,
                    stats["avg_accuracy"] >= self.sla_accuracy,
                    stats["hallucination_index"] <= 0.02,
                    stats["avg_latency_ms"] <= self.sla_latency_ms,
                ]),
                "violations": self._compute_violations(stats),
            },
        }

    def _compute_violations(self, stats: Dict[str, Any]) -> list:
        """Identify which SLAs are currently violated."""
        violations = []
        if stats["resolution_rate"] < self.sla_resolution_rate:
            violations.append({
                "metric": "resolution_rate",
                "actual": stats["resolution_rate"],
                "target": self.sla_resolution_rate,
            })
        if stats["avg_accuracy"] < self.sla_accuracy:
            violations.append({
                "metric": "accuracy",
                "actual": stats["avg_accuracy"],
                "target": self.sla_accuracy,
            })
        if stats["hallucination_index"] > 0.02:
            violations.append({
                "metric": "hallucination_index",
                "actual": stats["hallucination_index"],
                "target": 0.02,
            })
        if stats["avg_latency_ms"] > self.sla_latency_ms:
            violations.append({
                "metric": "latency",
                "actual": stats["avg_latency_ms"],
                "target": self.sla_latency_ms,
            })
        return violations
