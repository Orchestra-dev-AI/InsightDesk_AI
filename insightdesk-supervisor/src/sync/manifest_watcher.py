# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Manifest Watcher
# Background async task that watches for phase manifests from the Core AI Lead.
# When detected, re-calibrates DB schemas, RCA taxonomy, and DAGMetric paths.
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

from src.config import settings

logger = logging.getLogger("insightdesk.infra.manifest_watcher")


class ManifestWatcher:
    """
    Watches the project root for manifest files that signal new reasoning
    capabilities deployed by the Core AI Lead.

    Monitored files (configurable):
      • phase1_manifest.json
      • current_stage_manifest.json

    On detection:
      1. Reads the manifest
      2. Logs new capabilities
      3. Signals re-calibration events
      4. Tracks the last-processed manifest hash to avoid re-processing
    """

    def __init__(self, project_root: str | None = None) -> None:
        self.project_root = Path(project_root or settings.PROJECT_ROOT).resolve()
        self.manifest_filenames = settings.MANIFEST_FILENAMES
        self._last_hashes: Dict[str, str] = {}
        self._running = False
        self._callbacks: list = []

    def on_manifest_change(self, callback) -> None:
        """Register a callback for manifest changes: callback(filename, data)."""
        self._callbacks.append(callback)

    async def start(self, poll_interval_seconds: float = 10.0) -> None:
        """Start the background polling loop."""
        self._running = True
        logger.info(
            "Manifest watcher started — root=%s files=%s interval=%.0fs",
            self.project_root, self.manifest_filenames, poll_interval_seconds,
        )

        while self._running:
            try:
                await self._poll_manifests()
            except Exception as exc:
                logger.error("Manifest watcher error: %s", exc)
            await asyncio.sleep(poll_interval_seconds)

    async def stop(self) -> None:
        """Stop the background polling loop."""
        self._running = False
        logger.info("Manifest watcher stopped.")

    async def _poll_manifests(self) -> None:
        """Check for new or changed manifest files."""
        for filename in self.manifest_filenames:
            filepath = self.project_root / filename
            if not filepath.exists():
                continue

            # Compute a simple hash (content-based)
            content = filepath.read_text(encoding="utf-8")
            content_hash = str(hash(content))

            if self._last_hashes.get(filename) == content_hash:
                continue  # No change

            # New or changed manifest detected
            logger.info("━━━ Manifest detected: %s ━━━", filename)
            self._last_hashes[filename] = content_hash

            try:
                data = json.loads(content)
                await self._process_manifest(filename, data)
            except json.JSONDecodeError as exc:
                logger.error("Invalid JSON in %s: %s", filename, exc)

    async def _process_manifest(self, filename: str, data: Dict[str, Any]) -> None:
        """Process a manifest and trigger re-calibration."""
        phase = data.get("phase", "unknown")
        capabilities = data.get("capabilities", [])
        version = data.get("version", "0.0.0")

        logger.info(
            "Processing manifest: phase=%s version=%s capabilities=%d",
            phase, version, len(capabilities),
        )

        # Log new capabilities
        for cap in capabilities:
            cap_name = cap if isinstance(cap, str) else cap.get("name", "unnamed")
            logger.info("  → New capability: %s", cap_name)

        # Check for new DAG definitions
        new_dags = data.get("dag_definitions", {})
        if new_dags:
            logger.info("  → %d new DAG definitions to register", len(new_dags))

        # Check for schema updates
        schema_updates = data.get("schema_updates", [])
        if schema_updates:
            logger.info("  → %d schema updates detected", len(schema_updates))

        # Check for new failure categories
        new_categories = data.get("failure_categories", [])
        if new_categories:
            logger.info("  → %d new failure categories", len(new_categories))

        # Trigger registered callbacks
        for callback in self._callbacks:
            try:
                result = callback(filename, data)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as exc:
                logger.error("Manifest callback error: %s", exc)

        logger.info("Manifest '%s' processed successfully.", filename)

    def check_once(self) -> Optional[Dict[str, Any]]:
        """Synchronous one-shot check for manifest files (for startup)."""
        for filename in self.manifest_filenames:
            filepath = self.project_root / filename
            if filepath.exists():
                try:
                    data = json.loads(filepath.read_text(encoding="utf-8"))
                    logger.info("Found manifest at startup: %s", filename)
                    return data
                except json.JSONDecodeError:
                    pass
        return None
