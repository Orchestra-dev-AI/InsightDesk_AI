from fastapi import FastAPI

app = FastAPI(
    title="InsightDesk-AI: Core Intelligence",
    description="Handles RAGless reasoning architectures, WebRTC-based UDP transport, and Agentic Self-Healing test logic.",
    version="1.0.0",
)

@app.get("/")
async def root():
    return {"message": "Core Intelligence Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
