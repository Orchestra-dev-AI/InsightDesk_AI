# InsightDesk AI — Features, Functions, & Terminology

InsightDesk AI is a comprehensive Quality Orchestration Platform. It is designed to act as a testbed and monitoring hub for evaluating locally hosted AI models. This document breaks down the purpose of each dashboard section, how the features work together, and definitions for all the advanced terminology used in the system.

---

## 1. Command Center Dashboard
The main hub of the application. It provides real-time telemetry and a testing sandbox to monitor your AI worker's health.

### Features
- **Global Metrics Cards:** Displays key performance indicators (KPIs) aggregated across all database interactions.
- **7-Day Trend Chart:** Shows historical tracking of your AI's accuracy and latency, visually highlighting performance degradation over time.
- **Live Worker Sandbox:** A chat interface where you can manually interrogate your local AI. This triggers a full end-to-end execution, logs the interaction to the database, and forces a panel of judge AIs to grade the response.
- **Reset DB:** A master switch to truncate all test interactions and evaluations, useful for clearing demo data.

---

## 2. Voice Intelligence (WebRTC)
A high-performance pipeline designed to facilitate zero-latency voice interactions with AI models.

### Features
- **WebRTC Handshake:** Instead of using slow TCP web sockets, it establishes a direct peer-to-peer UDP connection between the browser and the backend server.
- **Noise Injection Engine:** Allows you to test the AI's acoustic echo cancellation (AEC) by injecting background noise (Office, Street, Cafe) during an active session.
- **Audio Visualizer:** A real-time oscilloscope of the microphone input to verify audio transmission.
- **TTFA Gauge:** Visually measures the "Time To First Audio"—tracking exactly how long it takes for the AI to start speaking after you finish.

---

## 3. Self-Healing QA Engine
An automated test journey monitor designed to fix broken frontend UI test scripts.

### Features
- **Journey Health Maps:** Visual node graphs that map out simulated user workflows (e.g., "Login Flow", "Checkout Cart").
- **Auto-Patching:** If a UI element changes its ID or class, the engine compares the new DOM fingerprint to the historical one, and automatically repairs the testing script to prevent false-positive failures.
- **Maintenance Reduction Metric:** Tracks the percentage of broken tests that the engine successfully repaired without human intervention.

---

## 4. Platform Settings
The configuration center where you wire up the platform to your custom AI.

### Features
- **Worker Configuration:** Allows you to select the exact `.py` file on your local machine that contains your custom AI logic (`resolve(query)` function). 
- **Dynamic Loading:** Changes to your selected python file take effect immediately because the backend dynamically loads the module on every sandbox request.

---

## Glossary of Terms

| Term | Definition |
| :--- | :--- |
| **JRH (Judge Reliability Harness)** | A consensus system where multiple external AIs (like Qwen, Llama) grade the performance of your local worker AI. It acts as an automated grading rubric. |
| **TTFA (Time To First Audio)** | A critical metric in voice AI. It measures the milliseconds between the user finishing their sentence and the AI's first spoken syllable. The industry target is < 300ms. |
| **Barge-in / AEC** | Acoustic Echo Cancellation and "Barge-in" detection allows a user to interrupt the AI while it is speaking, forcing it to stop talking and listen to the new instruction. |
| **DAGMetric** | Directed Acyclic Graph Metric. A system that mathematically verifies if the AI followed a strict, required sequence of steps (e.g., in a billing flow) without skipping any nodes. |
| **Resolution Rate** | The percentage of user queries the AI successfully resolved autonomously, without needing to escalate to a human. |
| **Hallucination Index** | The percentage of responses where the JRH judges detected factually incorrect or fabricated information. The target is ~0%. |
| **WebRTC (UDP transport)** | A protocol originally built for video conferencing that is used here to stream audio packets as fast as possible, ignoring lost packets to maintain real-time speed. |
| **AgentExecutionState** | The internal JSON data object that captures everything the AI did during a single Sandbox test: its thought process, tool calls, and final text. |
