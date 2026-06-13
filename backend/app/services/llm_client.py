"""
LLM client — calls DeepSeek API directly (OpenAI-compatible).
Base: https://api.deepseek.com/v1
"""

import json
from typing import AsyncIterator
import httpx
from app.config import get_settings

settings = get_settings()

DEEPSEEK_BASE = "https://api.deepseek.com/v1"
DEFAULT_MODEL = "deepseek-chat"


async def stream_chat_completion(
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.8,
    max_tokens: int = 1024,
    frequency_penalty: float = 0.0,
) -> AsyncIterator[str]:
    """
    Stream an LLM completion via DeepSeek API.

    Yields one token at a time as they arrive from the API.
    Uses SSE parsing — compatible with OpenAI streaming format.
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    if frequency_penalty > 0:
        payload["frequency_penalty"] = frequency_penalty

    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{DEEPSEEK_BASE}/chat/completions",
            json=payload,
            headers=headers,
        ) as response:
            response.raise_for_status()

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue

                data_str = line[6:]  # strip "data: " prefix

                if data_str.strip() == "[DONE]":
                    break

                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                # Check for API-level errors inside the SSE stream
                if "error" in data:
                    err_msg = data["error"].get("message", str(data["error"]))
                    raise Exception(f"DeepSeek streaming error: {err_msg}")

                choices = data.get("choices", [])
                if not choices:
                    continue

                delta = choices[0].get("delta", {})
                content = delta.get("content", "")

                if content:
                    yield content


async def chat_completion(
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 8192,
) -> str:
    """
    Non-streaming LLM completion — used when we want the full response at once.
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE}/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

        # ── Defensive error handling ─────────────────────
        if "error" in data:
            err_msg = data["error"].get("message", str(data["error"]))
            raise Exception(f"DeepSeek API error: {err_msg}")

        if not data.get("choices"):
            raise Exception(f"Empty response from LLM — no choices returned. Response: {json.dumps(data)[:500]}")

        choice = data["choices"][0]
        if not choice.get("message"):
            raise Exception(f"LLM response missing 'message' field. Choice: {json.dumps(choice)[:500]}")

        return choice["message"]["content"]
