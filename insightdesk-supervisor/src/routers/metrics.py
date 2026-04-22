# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Metrics Router
# /metrics/* endpoints for dashboard data and DAGMetric validation.
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.engine import get_async_session
from src.db import repository
from src.metrics.dag_metric import DAGMetric
from src.metrics.aggregator import MetricsAggregator

logger = logging.getLogger("insightdesk.infra.router.metrics")

router = APIRouter(prefix="/metrics", tags=["Metrics"])

_dag_metric: Optional[DAGMetric] = None
_aggregator: Optional[MetricsAggregator] = None


def init_metrics(dag: DAGMetric, agg: MetricsAggregator) -> None:
    """Called during app startup."""
    global _dag_metric, _aggregator
    _dag_metric = dag
    _aggregator = agg


@router.get("/dashboard", summary="Aggregated dashboard metrics")
async def get_dashboard(
    window_hours: int = Query(default=24, ge=1, le=720),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Return aggregated platform metrics for the analytics dashboard:
    Hallucination Index, Resolution Rate, Accuracy, Latency, JRH Agreement.
    """
    if not _aggregator:
        raise HTTPException(503, "Metrics aggregator not initialized")

    return await _aggregator.get_dashboard_metrics(session, window_hours=window_hours)


@router.get(
    "/dag-validate/{session_id}",
    summary="Run DAGMetric validation on a session",
)
async def dag_validate(
    session_id: str,
    dag_name: str = Query(..., description="Name of the DAG to validate against"),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Validate that an interaction's reasoning path followed the expected
    deterministic DAG for high-stakes operations.
    """
    if not _dag_metric:
        raise HTTPException(503, "DAGMetric not initialized")

    interaction = await repository.get_interaction_by_session(session, session_id)
    if not interaction:
        raise HTTPException(404, f"Interaction '{session_id}' not found")

    result = _dag_metric.validate(
        dag_name=dag_name,
        steps=interaction.steps or [],
    )
    return {
        "session_id": session_id,
        "dag_name": dag_name,
        **result.to_dict(),
    }


@router.get("/dags", summary="List all registered DAG definitions")
async def list_dags():
    """Return names of all registered deterministic DAGs."""
    if not _dag_metric:
        raise HTTPException(503, "DAGMetric not initialized")
    return {"dags": _dag_metric.list_dags()}


@router.get("/trends", summary="Time-series trend data")
async def get_trends(
    window_hours: int = Query(default=168, ge=1, le=720),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Return time-bucketed trend data for accuracy, latency, and resolution rate.
    Default window: 7 days (168 hours).
    """
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    interactions = await repository.list_interactions(
        session, since=since, limit=500,
    )

    if not interactions:
        return {"window_hours": window_hours, "data_points": 0, "trends": []}

    # Bucket into 24-hour periods
    buckets: Dict[str, list] = {}
    for i in interactions:
        if i.created_at:
            day_key = i.created_at.strftime("%Y-%m-%d")
        else:
            day_key = "unknown"
        buckets.setdefault(day_key, []).append(i)

    trends = []
    for day, items in sorted(buckets.items()):
        count = len(items)
        trends.append({
            "date": day,
            "count": count,
            "avg_accuracy": round(sum(i.accuracy_score for i in items) / count, 4),
            "avg_latency_ms": round(sum(i.total_latency_ms for i in items) / count, 2),
            "resolution_rate": round(
                sum(1 for i in items if i.autonomous_resolution) / count, 4,
            ),
            "hallucination_rate": round(
                sum(1 for i in items if i.hallucination_flag) / count, 4,
            ),
        })

    return {
        "window_hours": window_hours,
        "data_points": len(interactions),
        "trends": trends,
    }
