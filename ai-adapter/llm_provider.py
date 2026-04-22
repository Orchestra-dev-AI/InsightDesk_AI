# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Multi-Provider LLM Router
# Abstracts the reasoning engine's connection to different LLM backends.
# Supports Google GenAI (Gemini 2.0 Flash) and Groq (Llama 3).
# ──────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from groq import Groq

from schemas.reasoning import ActionType, ThoughtStep

logger = logging.getLogger("insightdesk.engine.llm")


class MultiProviderRouter:
    """Routes inference requests to the configured LLM provider."""

    def __init__(self):
        self.provider = os.getenv("PRIMARY_LLM_PROVIDER", "groq").lower()
        self.groq_client = None
        self.nvidia_api_key = None

        if self.provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key or api_key == "your-groq-api-key-here":
                logger.warning("GROQ_API_KEY not set. Engine will operate in mock mode.")
            else:
                self.groq_client = Groq(api_key=api_key)
        else:
            logger.warning(f"Unknown provider '{self.provider}'. Falling back to mock mode.")

        # Setup secondary fallback (Nvidia)
        self.nvidia_api_key = os.getenv("NVIDIA_API_KEY")

    async def generate_thought(
        self,
        system_prompt: str,
        user_context: str,
        tools: List[str],
        step_idx: int,
        state_query: str,
        mock_fallback: Any = None,
    ) -> ThoughtStep:
        """
        Calls the active LLM provider to generate the next ThoughtStep.
        If the primary provider (Groq) fails, seamlessly falls back to Nvidia.
        """
        if self.provider == "groq" and self.groq_client:
            result = await self._call_groq(system_prompt, user_context, tools, step_idx)
            if result.confidence > 0.0:  # LLM call succeeded
                return result
            
            logger.warning("Groq call failed — seamlessly falling back to Nvidia")
            if self.nvidia_api_key:
                nvidia_result = await self._call_nvidia(system_prompt, user_context, tools, step_idx)
                if nvidia_result.confidence > 0.0:
                    return nvidia_result
            logger.warning("Nvidia fallback failed — falling back to mock mode")
        
        # Fallback to deterministic routing (Mock mode)
        logger.info("Using mock deterministic router for step %d", step_idx)
        return mock_fallback(step_idx, tools)

    async def _call_nvidia(self, system_prompt: str, user_context: str, tools: List[str], step_idx: int) -> ThoughtStep:
        """Execute inference using NVIDIA NIM (Llama 3.1 70B) with JSON mode as fallback."""
        model_name = "meta/llama-3.1-70b-instruct"
        base_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    base_url,
                    headers={"Authorization": f"Bearer {self.nvidia_api_key}"},
                    json={
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt + "\n\nRespond ONLY with a valid JSON object matching the ThoughtStep schema."},
                            {"role": "user", "content": user_context}
                        ],
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"},
                    },
                )
                resp.raise_for_status()
                data = json.loads(resp.json()["choices"][0]["message"]["content"])
                
            return ThoughtStep(
                step_index=step_idx,
                thinking=data.get("thinking", "No reasoning provided (Nvidia fallback)"),
                action_type=ActionType(data.get("action_type", "response")),
                action_input=data.get("action_input", {}),
                confidence=float(data.get("confidence", 0.8))
            )
            
        except Exception as e:
            logger.error(f"Nvidia API error: {e}")
            return ThoughtStep(
                step_index=step_idx,
                thinking=f"Error calling Nvidia LLM: {e}",
                action_type=ActionType.RESPONSE,
                action_input={"answer": "I encountered an internal error while processing your request."},
                confidence=0.0
            )

    async def _call_groq(self, system_prompt: str, user_context: str, tools: List[str], step_idx: int) -> ThoughtStep:
        """Execute inference using Groq (Llama 3 70B) with JSON mode."""
        model_name = "llama3-70b-8192"
        
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            
            def _sync_call():
                return self.groq_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt + "\n\nRespond ONLY with a valid JSON object matching the ThoughtStep schema."},
                        {"role": "user", "content": user_context}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
            
            response = await loop.run_in_executor(None, _sync_call)
            
            data = json.loads(response.choices[0].message.content)
            return ThoughtStep(
                step_index=step_idx,
                thinking=data.get("thinking", "No reasoning provided"),
                action_type=ActionType(data.get("action_type", "response")),
                action_input=data.get("action_input", {}),
                confidence=float(data.get("confidence", 0.8))
            )
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return ThoughtStep(
                step_index=step_idx,
                thinking=f"Error calling LLM: {e}",
                action_type=ActionType.RESPONSE,
                action_input={"answer": "I encountered an internal error while processing your request."},
                confidence=0.0
            )
