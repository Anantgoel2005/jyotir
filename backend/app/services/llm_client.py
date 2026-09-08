"""OpenAI-compatible LLM client with bounded transient retries (supports Groq, DeepSeek, etc.)."""

import asyncio
import json
from collections.abc import AsyncIterator

import httpx

from app.config import get_settings

settings = get_settings()


def _headers() -> dict[str, str]:
    api_key = settings.active_llm_api_key
    if not api_key:
        raise RuntimeError("LLM_NOT_CONFIGURED")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


async def stream_chat_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> AsyncIterator[str]:
    selected_model = model or settings.active_llm_model
    base_url = settings.active_llm_base_url.rstrip("/")
    api_key = settings.active_llm_api_key

    payload = {
        "model": selected_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/chat/completions",
                    json=payload,
                    headers=_headers(),
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            return
                        data = json.loads(raw)
                        if data.get("error"):
                            raise RuntimeError("LLM_STREAM_ERROR")
                        choices = data.get("choices") or []
                        if choices:
                            content = choices[0].get("delta", {}).get("content")
                            if content:
                                yield content
                    return
        except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as exc:
            last_error = exc
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code < 500:
                body = exc.response.text[:500]
                if api_key:
                    body = body.replace(api_key, "[redacted]")
                raise RuntimeError(
                    f"LLM_HTTP_{exc.response.status_code}: {body}"
                ) from exc
            await asyncio.sleep(0.5 * (2**attempt))
        except (json.JSONDecodeError, RuntimeError) as exc:
            raise RuntimeError("LLM_INVALID_RESPONSE") from exc
    raise RuntimeError("LLM_UNAVAILABLE") from last_error


async def chat_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    chunks = [
        token
        async for token in stream_chat_completion(
            messages, model=model, temperature=temperature, max_tokens=max_tokens
        )
    ]
    return "".join(chunks)
