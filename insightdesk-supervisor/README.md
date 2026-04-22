# Platform Infrastructure (Supervisor) — "The Conscience & Memory"

**Lead**: Strategic AI Architect  
**Role**: Interaction Auditing, Reliability Scoring & Data Persistence

The **Supervisor Infrastructure** acts as the auditing and calibration layer for InsightDesk AI. While the AI Adapter *executes* the local AI models, the Supervisor *judges, grades, and records* their performance to ensure enterprise SLA targets are met.

---

## How It Works

Every time a user asks a question via the Sandbox, the backend triggers a pipeline to grade the AI's response for reliability and groundedness.

### 1. Interaction Ingestion (`repository.py`)
- The output from the AI Adapter (including the final text, the thought process, and latency) is sent to the `/interactions/ingest` endpoint.
- It is saved to a persistent SQLite database (`insightdesk_infra.db`), keeping a permanent log of all tests, allowing developers to review historical execution data.

### 2. The Judge Reliability Harness (JRH)
- The JRH (`jrh_ensemble.py`) acts as a panel of automated evaluators.
- Instead of relying on a single AI model to grade the worker, JRH queries an ensemble of external LLM APIs (e.g., Llama 3.3, Qwen 2.5).
- Each judge scores the worker's output out of 10 based on fluency, logic, and accuracy. 
- The JRH algorithm calculates a confidence-weighted **Composite Score** (converted to a % on the frontend) and determines if human calibration is required.

### 3. Diagnostics & Telemetry
- Metrics like `Hallucination Index` and `Resolution Rate` are calculated across all historical database entries.
- These aggregate statistics are exposed via the `/metrics` endpoints and actively stream to the frontend Command Center.

---

## Internal Architecture

```text
platform-infra/
├── main.py                    ← FastAPI entrypoint
├── src/
│   ├── db/                    ← Interaction Intelligence Repository (SQLite)
│   ├── evaluators/            ← Judge Reliability Harness (JRH Ensemble)
│   ├── diagnostics/           ← Automated Root Cause Analysis
│   ├── metrics/               ← Dashboard KPI Aggregators
│   └── routers/               ← API Layer (Interactions, Evaluation, Metrics)
```

## Quick Start
```bash
cd insightdesk-supervisor
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
*Note: The platform is designed to be started via the root `start.py` script which auto-handles port binding and dependency checks.*
