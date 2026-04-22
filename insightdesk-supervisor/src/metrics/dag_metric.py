# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — DAGMetric: Deterministic Logic Path Validation
# For high-stakes environments where reasoning MUST follow strictly
# deterministic paths (e.g., billing: verify → check → apply → confirm).
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("insightdesk.infra.dag_metric")


@dataclass
class DAGMetricResult:
    """Result of a DAG validation against an agent's reasoning path."""
    passed: bool = False
    path_completeness: float = 0.0       # 0-1: percentage of required nodes visited
    order_correct: bool = False          # True if topological order was maintained
    extra_nodes: int = 0                 # Unexpected steps (hallucination indicators)
    missing_nodes: List[str] = field(default_factory=list)
    out_of_order_nodes: List[str] = field(default_factory=list)
    actual_path: List[str] = field(default_factory=list)
    expected_path: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "path_completeness": round(self.path_completeness, 4),
            "order_correct": self.order_correct,
            "extra_nodes": self.extra_nodes,
            "missing_nodes": self.missing_nodes,
            "out_of_order_nodes": self.out_of_order_nodes,
            "actual_path": self.actual_path,
            "expected_path": self.expected_path,
        }


# ── Pre-defined DAGs for high-stakes query types ───────────────────────────

# Each DAG is a list of (node, dependencies) tuples.
# A node can only execute after ALL its dependencies have been visited.

BUILTIN_DAGS: Dict[str, List[Tuple[str, List[str]]]] = {
    "billing_adjustment": [
        ("verify_account", []),
        ("check_balance", ["verify_account"]),
        ("apply_credit", ["check_balance"]),
        ("confirm_adjustment", ["apply_credit"]),
    ],
    "subscription_management": [
        ("authenticate_user", []),
        ("fetch_subscription", ["authenticate_user"]),
        ("validate_change", ["fetch_subscription"]),
        ("apply_change", ["validate_change"]),
        ("send_confirmation", ["apply_change"]),
    ],
    "refund_processing": [
        ("verify_order", []),
        ("check_eligibility", ["verify_order"]),
        ("calculate_refund", ["check_eligibility"]),
        ("process_refund", ["calculate_refund"]),
        ("notify_customer", ["process_refund"]),
    ],
    "account_deletion": [
        ("authenticate_user", []),
        ("verify_identity", ["authenticate_user"]),
        ("backup_data", ["verify_identity"]),
        ("delete_account", ["backup_data"]),
        ("confirm_deletion", ["delete_account"]),
    ],
}


class DAGMetric:
    """
    Validates that an agent's reasoning path follows a strictly
    deterministic Directed Acyclic Graph.

    Usage::

        dag = DAGMetric()
        result = dag.validate(
            dag_name="billing_adjustment",
            steps=[
                {"action_type": "tool_call", "action_input": {"tool": "verify_account"}},
                {"action_type": "tool_call", "action_input": {"tool": "check_balance"}},
                ...
            ],
        )
        if not result.passed:
            print("Missing:", result.missing_nodes)
    """

    def __init__(self, custom_dags: Dict[str, List[Tuple[str, List[str]]]] | None = None):
        self.dags = {**BUILTIN_DAGS, **(custom_dags or {})}

    def register_dag(self, name: str, dag: List[Tuple[str, List[str]]]) -> None:
        """Register a new DAG definition at runtime."""
        self.dags[name] = dag
        logger.info("Registered DAG '%s' with %d nodes", name, len(dag))

    def list_dags(self) -> List[str]:
        """Return names of all registered DAGs."""
        return list(self.dags.keys())

    def validate(
        self,
        dag_name: str,
        steps: List[Dict[str, Any]],
    ) -> DAGMetricResult:
        """
        Validate an agent's reasoning path against a named DAG.

        Steps are matched by extracting the tool/action name from each step's
        action_input or action_type.
        """
        if dag_name not in self.dags:
            logger.warning("DAG '%s' not found. Available: %s", dag_name, list(self.dags.keys()))
            return DAGMetricResult(
                passed=False,
                actual_path=self._extract_path(steps),
                expected_path=[],
            )

        dag_def = self.dags[dag_name]
        expected_nodes = [node for node, _ in dag_def]
        dependency_map = {node: set(deps) for node, deps in dag_def}

        actual_path = self._extract_path(steps)

        # ── Check completeness ───────────────────────────────────────────────
        visited: Set[str] = set(actual_path)
        missing = [n for n in expected_nodes if n not in visited]
        completeness = (len(expected_nodes) - len(missing)) / len(expected_nodes) if expected_nodes else 1.0

        # ── Check topological order ──────────────────────────────────────────
        out_of_order: List[str] = []
        seen_so_far: Set[str] = set()
        for node in actual_path:
            if node in dependency_map:
                unmet = dependency_map[node] - seen_so_far
                if unmet:
                    out_of_order.append(node)
            seen_so_far.add(node)

        order_correct = len(out_of_order) == 0

        # ── Count extra nodes ────────────────────────────────────────────────
        expected_set = set(expected_nodes)
        extra = sum(1 for n in actual_path if n not in expected_set)

        # ── Pass/fail decision ───────────────────────────────────────────────
        passed = completeness >= 1.0 and order_correct

        result = DAGMetricResult(
            passed=passed,
            path_completeness=completeness,
            order_correct=order_correct,
            extra_nodes=extra,
            missing_nodes=missing,
            out_of_order_nodes=out_of_order,
            actual_path=actual_path,
            expected_path=expected_nodes,
        )

        logger.info(
            "DAG '%s' validation — passed=%s completeness=%.0f%% order=%s extra=%d",
            dag_name, passed, completeness * 100, order_correct, extra,
        )
        return result

    @staticmethod
    def _extract_path(steps: List[Dict[str, Any]]) -> List[str]:
        """Extract the action/tool sequence from reasoning steps."""
        path: List[str] = []
        for step in steps:
            action_input = step.get("action_input", {}) or {}
            # Try multiple fields where the tool/action name might live
            name = (
                action_input.get("tool")
                or action_input.get("tool_name")
                or action_input.get("action")
                or step.get("action_type", "unknown")
            )
            path.append(str(name))
        return path
