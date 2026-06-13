"""
Standalone test — validates the core Jyotir pipeline without Docker/PostgreSQL.

Tests:
  1. AstrologyAPI.com — fetch a real natal chart
  2. Chart enrichment — raw JSON → LLM-friendly text block
  3. Prompt building — system prompt + chart context injection
  4. LLM streaming — OpenRouter chat completion (token-level)

Run:  python test_pipeline.py
"""

import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.services.astro_api import calculate_chart
from app.services.chart_enrichment import enrich_chart
from app.services.prompt_builder import build_breakdown_messages, build_chat_messages
from app.services.llm_client import stream_chat_completion, chat_completion

# ── Test Birth Data (Example: New Delhi, India) ───────
TEST_BIRTH = {
    "system": "vedic",
    "name": "Test User",
    "birth_date": "1990-03-15",
    "birth_time": "14:30",
    "tz_offset": 5.5,          # IST = UTC+5:30
    "lat": 28.6139,            # New Delhi
    "lng": 77.2090,
    "gender": "male",
}


async def test_1_fetch_chart():
    """Step 1: Call AstrologyAPI.com and get raw planetary data."""
    print("\n" + "=" * 60)
    print("TEST 1: Fetching natal chart from AstrologyAPI.com...")
    print("=" * 60)

    try:
        raw = await calculate_chart(**TEST_BIRTH)
        # API returns a flat list of planets (not a dict with 'planets' key)
        if isinstance(raw, list):
            planets = [p for p in raw if p.get("name") != "Ascendant"]
            asc = [p for p in raw if p.get("name") == "Ascendant"]
        else:
            planets = raw.get("planets", [])
            asc = [p for p in planets if p.get("name") == "Ascendant"]
        print("✓ Chart fetched successfully!")
        print(f"  Planets returned: {len(planets)} + {'ascendant' if asc else 'no ascendant'}")
        if asc:
            a = asc[0]
            print(f"  Ascendant: {a.get('sign', '?')} ({a.get('nakshatra', '?')} pada {a.get('nakshatra_pad', '?')})")
        for p in planets[:3]:
            print(f"  - {p.get('name', '?')} in {p.get('sign', '?')} "
                  f"(house {p.get('house', '?')}, {p.get('nakshatra', '?')})")
        if len(planets) > 3:
            print(f"  ... and {len(planets) - 3} more planets")
        return raw
    except Exception as e:
        print(f"✗ Chart fetch FAILED: {e}")
        return None


async def test_2_enrich_chart(raw: dict):
    """Step 2: Transform raw API JSON into LLM-friendly text block."""
    print("\n" + "=" * 60)
    print("TEST 2: Enriching chart data for LLM consumption...")
    print("=" * 60)

    if raw is None:
        print("✗ Skipped — no raw chart data")
        return None

    enriched = enrich_chart(
        raw,
        TEST_BIRTH["system"],
        person_name=TEST_BIRTH["name"],
        birth_date=TEST_BIRTH["birth_date"],
        birth_time=TEST_BIRTH["birth_time"],
        timezone=f"UTC+{TEST_BIRTH['tz_offset']}",
        city="New Delhi",
        country="India",
        lat=TEST_BIRTH["lat"],
        lng=TEST_BIRTH["lng"],
    )
    lines = enriched.split("\n")
    print(f"✓ Enrichment complete!")
    print(f"  Output: {len(lines)} lines, ~{len(enriched)} chars")
    print(f"  Estimated tokens: ~{len(enriched) // 4}")
    print(f"\n  First 10 lines:")
    for line in lines[:10]:
        print(f"    {line}")
    if len(lines) > 10:
        print(f"    ... ({len(lines) - 10} more lines)")
    return enriched


async def test_3_build_breakdown_prompt(enriched: str):
    """Step 3: Build the system prompt + messages for breakdown generation."""
    print("\n" + "=" * 60)
    print("TEST 3: Building breakdown generation prompt...")
    print("=" * 60)

    if enriched is None:
        print("✗ Skipped — no enriched data")
        return None

    messages = build_breakdown_messages(enriched)
    system_len = len(messages[0]["content"])
    prompt_len = sum(len(m["content"]) for m in messages)
    print(f"✓ Prompt built!")
    print(f"  System prompt: {system_len} chars (~{system_len // 4} tokens)")
    print(f"  Total messages: {len(messages)}")
    print(f"  Total prompt: {prompt_len} chars (~{prompt_len // 4} tokens)")
    return messages


async def test_4_streaming_chat(enriched: str):
    """Step 4: Test streaming LLM with a sample chat question."""
    print("\n" + "=" * 60)
    print("TEST 4: Testing OpenRouter streaming chat...")
    print("=" * 60)

    if enriched is None:
        print("✗ Skipped — no enriched data")
        return

    # Build chat messages
    chat_history = [
        {"role": "assistant", "content": "I have your chart ready. What would you like to know?"}
    ]
    user_question = "What does it mean that my Moon is in Scorpio in the 4th house?"

    messages = build_chat_messages(enriched, TEST_BIRTH["system"], chat_history, user_question)

    print(f"  Question: \"{user_question}\"")
    print(f"  Messages in context: {len(messages)}")
    print(f"\n  Streaming response:")
    print("  " + "-" * 50)

    try:
        full = []
        token_count = 0
        async for token in stream_chat_completion(
            messages=messages,
            model="deepseek/deepseek-chat",
            temperature=0.8,
            max_tokens=512,
        ):
            print(token, end="", flush=True)
            full.append(token)
            token_count += 1

        print(f"\n  " + "-" * 50)
        print(f"  ✓ Streaming complete! {token_count} tokens received")
        print(f"  Full response: {len(''.join(full))} chars")
    except Exception as e:
        print(f"\n  ✗ Stream FAILED: {e}")


async def test_5_mini_breakdown(enriched: str):
    """Step 5: Generate a short breakdown (non-streaming) to verify end-to-end."""
    print("\n" + "=" * 60)
    print("TEST 5: Generating mini breakdown (non-streaming, 500 tokens)...")
    print("=" * 60)

    if enriched is None:
        print("✗ Skipped — no enriched data")
        return

    messages = build_breakdown_messages(enriched)
    print(f"  Sending request to OpenRouter...")

    try:
        result = await chat_completion(
            messages=messages,
            model="deepseek/deepseek-chat",
            temperature=0.7,
            max_tokens=500,
        )
        lines = result.split("\n")
        print(f"  ✓ Breakdown generated!")
        print(f"  Length: {len(result)} chars, {len(lines)} lines")
        print(f"\n  Preview (first 15 lines):")
        for line in lines[:15]:
            print(f"    {line}")
        if len(lines) > 15:
            print(f"    ... ({len(lines) - 15} more lines)")
    except Exception as e:
        print(f"  ✗ Breakdown FAILED: {e}")


async def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║          JYOTIR — Pipeline Integration Test          ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"  Birth data: {TEST_BIRTH['name']}, {TEST_BIRTH['birth_date']} at {TEST_BIRTH['birth_time']}")
    print(f"  Location: lat={TEST_BIRTH['lat']}, lng={TEST_BIRTH['lng']}")
    print(f"  System: {TEST_BIRTH['system'].upper()}")

    # Check API keys
    astro_key = os.getenv("ASTROLOGY_API_KEY", "")
    or_key = os.getenv("OPENROUTER_API_KEY", "")
    if not astro_key or astro_key == "your_a...here":
        print("\n✗ ASTROLOGY_API_KEY is not set in .env file!")
        print("  Edit backend/.env and add your key from https://www.astrologyapi.com")
        return
    if not or_key or or_key == "your_openrouter_key_here":
        print("\n✗ OPENROUTER_API_KEY is not set in .env file!")
        print("  Edit backend/.env and add your key from https://openrouter.ai/keys")
        return

    print(f"  AstrologyAPI key: {astro_key[:8]}...")
    print(f"  OpenRouter key:  {or_key[:8]}...")

    # ── Run tests ─────────────────────────────────────
    raw = await test_1_fetch_chart()
    enriched = await test_2_enrich_chart(raw)
    messages = await test_3_build_breakdown_prompt(enriched)
    await test_4_streaming_chat(enriched)
    await test_5_mini_breakdown(enriched)

    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
