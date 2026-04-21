from fastapi import FastAPI

app = FastAPI(
    title="InsightDesk-AI: Platform Infrastructure",
    description="Handles Interaction Intelligence Repository, Multi-Judge JRH ensemble, Evaluation frameworks, and Automated RCA.",
    version="1.0.0",
)

@app.get("/")
async def root():
    return {"message": "Platform Infrastructure Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
