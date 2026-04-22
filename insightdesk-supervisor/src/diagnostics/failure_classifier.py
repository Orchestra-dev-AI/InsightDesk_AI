# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Failure Classifier
# Strict taxonomy for classifying production failures based on signals
# extracted from AgentExecutionState, ToolInvocation, and VoiceSession.
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from enum import Enum
from typing import Any, Dict, List, Optional

from src.config import settings

logger = logging.getLogger("insightdesk.infra.classifier")


class FailureCategory(str, Enum):
    """Strict failure taxonomy for RCA traces."""
    MALFORMED_TOOL_CALL = "MALFORMED_TOOL_CALL"
    RETRIEVAL_FAILURE = "RETRIEVAL_FAILURE"
    LATENT_API_RESPONSE = "LATENT_API_RESPONSE"
    HALLUCINATION = "HALLUCINATION"
    LOW_CONFIDENCE_CHAIN = "LOW_CONFIDENCE_CHAIN"
    VOICE_DEGRADATION = "VOICE_DEGRADATION"
    UNKNOWN = "UNKNOWN"


class FailureClassifier:
    """
    Classifies failures into the strict taxonomy by analyzing
    signals from the agent's execution state.

    Detection signals per category:
      MALFORMED_TOOL_CALL   — ToolInvocation.success == False
      RETRIEVAL_FAILURE     — Tool returned empty/error results
      LATENT_API_RESPONSE   — ToolInvocation.latency_ms > SLA × multiplier
      HALLUCINATION         — AgentExecutionState.hallucination_flag == True
      LOW_CONFIDENCE_CHAIN  — Average ThoughtStep.confidence < floor
      VOICE_DEGRADATION     — MOS < 4.0 or TTFA > 300ms
    """

    def __init__(self) -> None:
        self.latency_threshold = (
            settings.SLA_LATENCY_MS * settings.RCA_LATENCY_SPIKE_MULTIPLIER
        )
        self.confidence_floor = settings.RCA_CONFIDENCE_FLOOR

    def classify(
        self,
        *,
        steps: List[Dict[str, Any]],
        tool_calls: List[Dict[str, Any]],
        hallucination_flag: bool = False,
        accuracy_score: float = 1.0,
        voice_mos: Optional[float] = None,
        voice_ttfa_ms: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Analyze an interaction and return all detected failure signals.

        Returns a list of dicts, each with:
          - category (FailureCategory)
          - severity (critical | high | medium | low)
          - step_index (optional)
          - tool_name (optional)
          - detail (str)
        """
        findings: List[Dict[str, Any]] = []

        # ── Check for hallucination ──────────────────────────────────────────
        if hallucination_flag:
            findings.append({
                "category": FailureCategory.HALLUCINATION,
                "severity": "critical",
                "detail": (
                    f"Interaction flagged for hallucination. "
                    f"Accuracy score: {accuracy_score:.2f} (SLA: {settings.SLA_ACCURACY})."
                ),
            })

        # ── Check tool calls ─────────────────────────────────────────────────
        for tc in tool_calls:
            tool_name = tc.get("tool_name", "unknown")

            if not tc.get("success", True):
                findings.append({
                    "category": FailureCategory.MALFORMED_TOOL_CALL,
                    "severity": "high",
                    "tool_name": tool_name,
                    "detail": (
                        f"Tool '{tool_name}' returned success=False. "
                        f"Error: {tc.get('error', 'N/A')}"
                    ),
                })

            latency = tc.get("latency_ms", 0.0)
            if latency > self.latency_threshold:
                findings.append({
                    "category": FailureCategory.LATENT_API_RESPONSE,
                    "severity": "medium",
                    "tool_name": tool_name,
                    "detail": (
                        f"Tool '{tool_name}' latency {latency:.0f}ms "
                        f"exceeds threshold {self.latency_threshold:.0f}ms."
                    ),
                })

            # Check for empty results (retrieval failure signal)
            result = tc.get("result")
            if tc.get("success", True) and self._is_empty_result(result):
                findings.append({
                    "category": FailureCategory.RETRIEVAL_FAILURE,
                    "severity": "medium",
                    "tool_name": tool_name,
                    "detail": f"Tool '{tool_name}' returned empty/null results.",
                })

        # ── Check reasoning chain confidence ─────────────────────────────────
        if steps:
            confidences = [s.get("confidence", 1.0) for s in steps]
            avg_confidence = sum(confidences) / len(confidences)
            if avg_confidence < self.confidence_floor:
                # Find the weakest step
                min_idx = min(range(len(confidences)), key=lambda i: confidences[i])
                findings.append({
                    "category": FailureCategory.LOW_CONFIDENCE_CHAIN,
                    "severity": "high",
                    "step_index": min_idx,
                    "detail": (
                        f"Average chain confidence {avg_confidence:.2f} "
                        f"below floor {self.confidence_floor}. "
                        f"Weakest step: {min_idx} ({confidences[min_idx]:.2f})."
                    ),
                })

        # ── Check voice quality ──────────────────────────────────────────────
        if voice_mos is not None and voice_mos < settings.SLA_MOS_SCORE:
            findings.append({
                "category": FailureCategory.VOICE_DEGRADATION,
                "severity": "medium",
                "detail": f"Voice MOS {voice_mos:.1f} below target {settings.SLA_MOS_SCORE}.",
            })
        if voice_ttfa_ms is not None and voice_ttfa_ms > settings.SLA_LATENCY_MS:
            findings.append({
                "category": FailureCategory.VOICE_DEGRADATION,
                "severity": "high",
                "detail": (
                    f"Voice TTFA {voice_ttfa_ms:.0f}ms "
                    f"exceeds {settings.SLA_LATENCY_MS:.0f}ms target."
                ),
            })

        # ── Fallback ─────────────────────────────────────────────────────────
        if not findings and accuracy_score < settings.SLA_ACCURACY:
            findings.append({
                "category": FailureCategory.UNKNOWN,
                "severity": "low",
                "detail": (
                    f"Accuracy {accuracy_score:.2f} below SLA {settings.SLA_ACCURACY} "
                    f"but no specific failure signal detected."
                ),
            })

        return findings

    @staticmethod
    def _is_empty_result(result: Any) -> bool:
        """Check if a tool result is effectively empty."""
        if result is None:
            return True
        if isinstance(result, (list, dict, str)) and len(result) == 0:
            return True
        return False
