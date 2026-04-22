# Core Intelligence (AI Adapter) — "The Mind and High-Speed Body"

**Lead**: Core AI & Systems Architect  
**Role**: Dynamic Local Model Execution & AI Workflow Engine  

The **AI Adapter** (Core Intelligence) serves as the central nervous system of InsightDesk AI. This service connects the dashboard directly to any local Python worker script, allowing developers to hot-swap custom AI logic and immediately test it in a production-grade WebRTC and Reasoning environment.

---

## How It Works

The AI Adapter is designed for maximum flexibility and near-zero latency by bypassing traditional REST constraints:

### 1. Dynamic Local AI Loading (The Worker Pipeline)
Instead of hardcoding a specific AI provider, this microservice uses a **Dynamic Module Loader**. 
- The user selects a local `.py` file via the frontend.
- The backend (`engine.py`) securely executes the file's `resolve(query)` function using `importlib`.
- The execution returns an `AgentExecutionState` containing the final resolution, the chain-of-thought steps, and any tool calls made by the local model.
- **Why this matters**: It allows complete decoupling of the testing platform from the model. You can test Llama, Groq, OpenAI, or local Transformers by simply pointing to a different Python script.

### 2. WebRTC Voice Handshake
- The `/voice` endpoints establish a UDP-based **WebRTC** connection directly between the user's browser and the backend server (`voice_handler.py`).
- Audio frames are streamed at lightning speed, eliminating TCP packet queuing. 
- It detects **barge-ins** natively, allowing users to interrupt the AI stream just like a human conversation.

### 3. Self-Healing QA Maintenance
- Instead of manually fixing broken E2E tests, the `self_healing.py` module tracks the DOM fingerprints of testing journeys.
- If a UI element shifts or a selector breaks, the engine detects the drift, generates a new fallback, and autonomously validates the path.

---

## Internal Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Gateway (main.py)                     │
├──────────────┬──────────────────┬───────────────────────────────┤
│  /reasoning  │     /voice       │         /healing              │
├──────────────┼──────────────────┼───────────────────────────────┤
│  engine.py   │ voice_handler.py │      self_healing.py          │
│  Dynamic     │ WebRTC / UDP     │    Vision AI + StepIQ         │
│  Loader      │ TTFA < 300ms     │    Element Fingerprinting     │
│  Execution   │ Barge-in AEC     │    Auto Patch + Validate      │
└──────────────┴──────────────────┴───────────────────────────────┘
```

## Quick Start
```bash
cd ai-adapter
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*Note: The platform is designed to be started via the root `start.py` script which auto-handles port binding and dependency checks.*
