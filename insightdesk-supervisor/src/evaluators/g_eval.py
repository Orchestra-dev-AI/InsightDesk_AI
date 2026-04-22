# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — G-Eval with Chain-of-Thought Reasoning
# Implements the G-Eval framework for subjective quality assessment.
# Uses CoT prompting to score coherence, consistency, fluency, relevance.
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from src.evaluators.judge_models import BaseJudge, JudgeScore, create_default_judges

logger = logging.getLogger("insightdesk.infra.g_eval")


@dataclass
class GEvalResult:
    """Result from a G-Eval assessment."""
    coherence: float = 0.0
    consistency: float = 0.0
    fluency: float = 0.0
    relevance: float = 0.0
    composite_quality: float = 0.0
    cot_reasoning: str = ""
    judge_provider: str = ""
    judge_model: str = ""
    latency_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "coherence": round(self.coherence, 2),
            "consistency": round(self.consistency, 2),
            "fluency": round(self.fluency, 2),
            "relevance": round(self.relevance, 2),
            "composite_quality": round(self.composite_quality, 2),
            "cot_reasoning": self.cot_reasoning,
            "judge_provider": self.judge_provider,
            "judge_model": self.judge_model,
            "latency_ms": round(self.latency_ms, 1),
        }


class GEvaluator:
    """
    G-Eval evaluator using Chain-of-Thought prompting.

    Process:
      1. Sends the interaction to a judge with a CoT rubric
      2. Judge generates step-by-step reasoning about quality
      3. Scores 4 dimensions: coherence, consistency, fluency, relevance
      4. Computes a weighted composite quality score
    """

    # Weights for composite score calculation
    WEIGHTS = {
        "coherence": 0.25,
        "consistency": 0.30,
        "fluency": 0.15,
        "relevance": 0.30,
    }

    def __init__(self, judge: BaseJudge | None = None) -> None:
        self.judge = judge or create_default_judges()[0]

    async def evaluate(
        self,
        query: str,
        thought_chain: List[Dict[str, Any]],
        final_resolution: str,
        tool_calls: List[Dict[str, Any]],
    ) -> GEvalResult:
        """
        Run G-Eval with CoT on a single interaction.

        The judge's evaluate() method already uses the G-Eval rubric prompt,
        which asks for per-dimension scores and chain-of-thought reasoning.
        """
        score: JudgeScore = await self.judge.evaluate(
            query, thought_chain, final_resolution, tool_calls,
        )

        coherence = score.coherence or 5.0
        consistency = score.consistency or 5.0
        fluency = score.fluency or 5.0
        relevance = score.relevance or 5.0

        composite = (
            coherence * self.WEIGHTS["coherence"]
            + consistency * self.WEIGHTS["consistency"]
            + fluency * self.WEIGHTS["fluency"]
            + relevance * self.WEIGHTS["relevance"]
        )

        result = GEvalResult(
            coherence=coherence,
            consistency=consistency,
            fluency=fluency,
            relevance=relevance,
            composite_quality=composite,
            cot_reasoning=score.reasoning,
            judge_provider=score.provider,
            judge_model=score.model,
            latency_ms=score.latency_ms,
        )

        logger.info(
            "G-Eval complete — composite=%.2f (coh=%.1f con=%.1f flu=%.1f rel=%.1f)",
            composite, coherence, consistency, fluency, relevance,
        )
        return result
