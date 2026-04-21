# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Root Cause Analysis (RCA) Engine
# The Diagnostic Agent that traces failure signals, generates natural-language
# explanations, and emits shift-left regression test templates.
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from src.config import settings
from src.diagnostics.failure_classifier import FailureCategory, FailureClassifier

logger = logging.getLogger("insightdesk.infra.rca")


@dataclass
class RCADiagnostic:
    """Complete diagnostic result for a single failed interaction."""
    session_id: str
    findings: List[Dict[str, Any]] = field(default_factory=list)
    primary_category: str = FailureCategory.UNKNOWN.value
    primary_severity: str = "low"
    root_cause_explanation: str = ""
    recommended_action: str = ""
    failed_step_index: Optional[int] = None
    failed_tool_name: Optional[str] = None
    regression_test_template: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "findings_count": len(self.findings),
            "findings": self.findings,
            "primary_category": self.primary_category,
            "primary_severity": self.primary_severity,
            "root_cause_explanation": self.root_cause_explanation,
            "recommended_action": self.recommended_action,
            "failed_step_index": self.failed_step_index,
            "failed_tool_name": self.failed_tool_name,
            "regression_test_generated": self.regression_test_template is not None,
        }


# ── Severity ranking for primary-finding selection ──────────────────────────

_SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


# ── Recommended actions per category ───────────────────────────────────────

_RECOMMENDED_ACTIONS = {
    FailureCategory.MALFORMED_TOOL_CALL: (
        "Validate tool argument schema before invocation. "
        "Ensure required fields match the MCP inputSchema definition."
    ),
    FailureCategory.RETRIEVAL_FAILURE: (
        "Verify vector store connectivity and query relevance. "
        "Consider expanding the semantic search radius or updating embeddings."
    ),
    FailureCategory.LATENT_API_RESPONSE: (
        "Investigate upstream API performance. Consider caching frequent queries "
        "or implementing a circuit-breaker for degraded endpoints."
    ),
    FailureCategory.HALLUCINATION: (
        "Review the reasoning chain for unsupported claims. "
        "Strengthen grounding by requiring tool-call evidence for every assertion."
    ),
    FailureCategory.LOW_CONFIDENCE_CHAIN: (
        "The agent's self-assessed confidence is critically low. "
        "Review the query complexity and consider escalating to human review."
    ),
    FailureCategory.VOICE_DEGRADATION: (
        "Check network conditions, WebRTC ICE connectivity, and audio codec settings. "
        "Verify that TTFA < 300ms target is achievable on current infrastructure."
    ),
    FailureCategory.UNKNOWN: (
        "No specific failure signal detected. Manual review recommended."
    ),
}


class RCAEngine:
    """
    Root Cause Analysis engine — the Diagnostic Agent.

    Pipeline:
      1. Ingest a failed AgentExecutionState
      2. Walk the thought chain to find the exact failure point
      3. Inspect tool calls for errors and latency spikes
      4. Classify via FailureClassifier
      5. Generate a natural-language root cause explanation
      6. Emit a shift-left regression test template
      7. Return a structured RCADiagnostic for the self-healing loop
    """

    def __init__(self) -> None:
        self.classifier = FailureClassifier()

    def analyze(
        self,
        *,
        session_id: str,
        query: str,
        steps: List[Dict[str, Any]],
        tool_calls: List[Dict[str, Any]],
        final_resolution: Optional[str] = None,
        accuracy_score: float = 1.0,
        hallucination_flag: bool = False,
        total_latency_ms: float = 0.0,
        voice_mos: Optional[float] = None,
        voice_ttfa_ms: Optional[float] = None,
    ) -> RCADiagnostic:
        """Perform full root cause analysis on an interaction."""

        # ── Step 1: Classify all failure signals ─────────────────────────────
        findings = self.classifier.classify(
            steps=steps,
            tool_calls=tool_calls,
            hallucination_flag=hallucination_flag,
            accuracy_score=accuracy_score,
            voice_mos=voice_mos,
            voice_ttfa_ms=voice_ttfa_ms,
        )

        if not findings:
            return RCADiagnostic(
                session_id=session_id,
                root_cause_explanation="No failure signals detected. Interaction is healthy.",
                recommended_action="No action required.",
            )

        # ── Step 2: Select primary finding (highest severity) ────────────────
        findings.sort(key=lambda f: _SEVERITY_RANK.get(f.get("severity", "low"), 99))
        primary = findings[0]
        category = primary["category"]
        if isinstance(category, FailureCategory):
            category_value = category.value
        else:
            category_value = str(category)

        # ── Step 3: Build natural-language explanation ───────────────────────
        explanation = self._build_explanation(
            session_id=session_id,
            query=query,
            primary=primary,
            findings=findings,
            steps=steps,
            total_latency_ms=total_latency_ms,
        )

        # ── Step 4: Get recommended action ──────────────────────────────────
        cat_enum = (
            category if isinstance(category, FailureCategory)
            else FailureCategory(category_value)
        )
        recommended = _RECOMMENDED_ACTIONS.get(cat_enum, _RECOMMENDED_ACTIONS[FailureCategory.UNKNOWN])

        # ── Step 5: Generate shift-left regression test template ─────────────
        regression = self._generate_regression_template(
            session_id=session_id,
            query=query,
            category=category_value,
            primary=primary,
        )

        diagnostic = RCADiagnostic(
            session_id=session_id,
            findings=[
                {k: (v.value if isinstance(v, FailureCategory) else v) for k, v in f.items()}
                for f in findings
            ],
            primary_category=category_value,
            primary_severity=primary.get("severity", "medium"),
            root_cause_explanation=explanation,
            recommended_action=recommended,
            failed_step_index=primary.get("step_index"),
            failed_tool_name=primary.get("tool_name"),
            regression_test_template=regression,
        )

        logger.info(
            "RCA complete for session=%s — primary=%s severity=%s findings=%d",
            session_id, category_value, primary.get("severity"), len(findings),
        )
        return diagnostic

    def _build_explanation(
        self,
        *,
        session_id: str,
        query: str,
        primary: Dict[str, Any],
        findings: List[Dict[str, Any]],
        steps: List[Dict[str, Any]],
        total_latency_ms: float,
    ) -> str:
        """Generate a natural-language diagnostic explanation."""
        category = primary["category"]
        cat_name = category.value if isinstance(category, FailureCategory) else str(category)
        severity = primary.get("severity", "medium")

        parts = [
            f"Diagnostic Report for session {session_id}:",
            f"  Query: \"{query[:80]}{'…' if len(query) > 80 else ''}\"",
            f"  Primary failure: {cat_name} (severity: {severity})",
            f"  Detail: {primary.get('detail', 'N/A')}",
        ]

        if primary.get("step_index") is not None:
            idx = primary["step_index"]
            if idx < len(steps):
                step = steps[idx]
                parts.append(
                    f"  Failed at step {idx}: [{step.get('action_type', '?')}] "
                    f"\"{step.get('thinking', 'N/A')[:60]}…\""
                )

        if primary.get("tool_name"):
            parts.append(f"  Failed tool: {primary['tool_name']}")

        if len(findings) > 1:
            parts.append(f"  Additional findings: {len(findings) - 1} other issue(s) detected.")

        parts.append(f"  Total latency: {total_latency_ms:.0f}ms")

        return "\n".join(parts)

    @staticmethod
    def _generate_regression_template(
        *,
        session_id: str,
        query: str,
        category: str,
        primary: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Auto-generate a regression test case template from the failure."""
        return {
            "test_name": f"regression_{category.lower()}_{session_id[:8]}",
            "description": (
                f"Auto-generated regression test from RCA diagnostic. "
                f"Verifies that {category} failure does not recur."
            ),
            "input_query": query,
            "failure_category": category,
            "assertions": [
                {
                    "type": "no_failure",
                    "category": category,
                    "detail": primary.get("detail", ""),
                },
            ],
            "tool_constraints": (
                {"tool_name": primary["tool_name"], "must_succeed": True}
                if primary.get("tool_name")
                else None
            ),
            "source": "shift_left_rca",
            "source_session": session_id,
        }
