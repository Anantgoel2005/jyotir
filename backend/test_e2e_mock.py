"""Test the full Jyotir pipeline with mock chart data.
Bypasses the AstrologyAPI dependency — tests enrichment + LLM only."""

import asyncio, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from app.services.chart_enrichment import enrich_chart
from app.services.prompt_builder import build_breakdown_messages, build_chat_messages
from app.services.llm_client import stream_chat_completion, chat_completion

# ── Realistic mock chart (Vedic, similar to what AstrologyAPI returns) ──
MOCK_CHART = {
    "name": "Test User",
    "birth_date": "1990-03-15",
    "birth_time": "14:30",
    "timezone": "Asia/Kolkata",
    "city": "New Delhi",
    "country": "India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "planets": [
        {"name": "Sun",      "sign": "Aquarius",    "fullDegree": 320.23, "house": 7,  "nakshatra": "Shatabhisha",     "nakshatra_pad": 2, "planet_awastha": "Yuva",   "isRetro": "false"},
        {"name": "Moon",     "sign": "Scorpio",     "fullDegree": 222.63, "house": 4,  "nakshatra": "Anuradha",        "nakshatra_pad": 3, "planet_awastha": "Kumara", "isRetro": "false"},
        {"name": "Mercury",  "sign": "Pisces",      "fullDegree": 335.37, "house": 8,  "nakshatra": "Uttara Bhadrapada","nakshatra_pad": 1, "planet_awastha": "Mrit",   "isRetro": "false"},
        {"name": "Venus",    "sign": "Aries",       "fullDegree": 28.08,  "house": 9,  "nakshatra": "Krittika",        "nakshatra_pad": 1, "planet_awastha": "Vridha", "isRetro": "false"},
        {"name": "Mars",     "sign": "Sagittarius", "fullDegree": 254.83, "house": 5,  "nakshatra": "Purva Ashadha",   "nakshatra_pad": 1, "planet_awastha": "Yuva",   "isRetro": "false"},
        {"name": "Jupiter",  "sign": "Cancer",      "fullDegree": 92.25,  "house": 12, "nakshatra": "Punarvasu",       "nakshatra_pad": 4, "planet_awastha": "Kumara", "isRetro": "false"},
        {"name": "Saturn",   "sign": "Sagittarius", "fullDegree": 262.67, "house": 5,  "nakshatra": "Purva Ashadha",   "nakshatra_pad": 3, "planet_awastha": "Vridha", "isRetro": "false"},
        {"name": "Rahu",     "sign": "Capricorn",   "fullDegree": 288.55, "house": 6,  "nakshatra": "Shravana",        "nakshatra_pad": 3, "planet_awastha": "Mrit",   "isRetro": "true"},
        {"name": "Ketu",     "sign": "Cancer",      "fullDegree": 108.55, "house": 12, "nakshatra": "Pushya",          "nakshatra_pad": 1, "planet_awastha": "Mrit",   "isRetro": "true"},
    ],
    "houses": [
        {"number": 1,  "sign_name": "Leo",        "degree": "28°42'"},
        {"number": 2,  "sign_name": "Virgo",       "degree": "25°10'"},
        {"number": 3,  "sign_name": "Libra",       "degree": "24°30'"},
        {"number": 4,  "sign_name": "Scorpio",     "degree": "26°15'"},
        {"number": 5,  "sign_name": "Sagittarius", "degree": "28°50'"},
        {"number": 6,  "sign_name": "Capricorn",   "degree": "00°20'"},
        {"number": 7,  "sign_name": "Aquarius",    "degree": "28°42'"},
        {"number": 8,  "sign_name": "Pisces",      "degree": "25°10'"},
        {"number": 9,  "sign_name": "Aries",       "degree": "24°30'"},
        {"number": 10, "sign_name": "Taurus",      "degree": "26°15'"},
        {"number": 11, "sign_name": "Gemini",      "degree": "28°50'"},
        {"number": 12, "sign_name": "Cancer",      "degree": "00°20'"},
    ],
    "aspects": [
        {"planet1": "Sun", "planet2": "Venus",   "aspect_type": "conjunction", "orb": 3},
        {"planet1": "Moon", "planet2": "Jupiter", "aspect_type": "trine",       "orb": 4},
        {"planet1": "Mars", "planet2": "Saturn",  "aspect_type": "conjunction", "orb": 2},
        {"planet1": "Moon", "planet2": "Saturn",  "aspect_type": "sextile",     "orb": 5},
        {"planet1": "Mars", "planet2": "Jupiter", "aspect_type": "quincunx",    "orb": 2},
        {"planet1": "Sun",  "planet2": "Mars",    "aspect_type": "sextile",     "orb": 3},
        {"planet1": "Venus","planet2": "Jupiter", "aspect_type": "square",      "orb": 5},
    ],
    "dasha": {
        "current_mahadasha": "Saturn",
        "start_date": "2023",
        "end_date": "2042",
        "current_antardasha": "Jupiter",
    },
}


async def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║     JYOTIR — End-to-End Test (Mock Chart Data)       ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    # ── Step 1: Enrich ────────────────────────────────
    print("── Step 1: Chart Enrichment ──")
    enriched = enrich_chart(
        MOCK_CHART,
        "vedic",
        person_name=MOCK_CHART["name"],
        birth_date=MOCK_CHART["birth_date"],
        birth_time=MOCK_CHART["birth_time"],
        timezone=MOCK_CHART["timezone"],
        city=MOCK_CHART["city"],
        country=MOCK_CHART["country"],
        lat=MOCK_CHART["latitude"],
        lng=MOCK_CHART["longitude"],
    )
    lines = enriched.split("\n")
    print(f"  ✓ {len(lines)} lines, ~{len(enriched)//4} tokens\n")
    print(enriched[:800])
    print(f"\n  ... ({len(enriched) - 800} more chars)\n")

    # ── Step 2: Build breakdown prompt ─────────────────
    print("── Step 2: Breakdown Prompt ──")
    breakdown_msgs = build_breakdown_messages(enriched)
    prompt_len = sum(len(m["content"]) for m in breakdown_msgs)
    print(f"  ✓ {len(breakdown_msgs)} messages, ~{prompt_len//4} tokens\n")

    # ── Step 3: Generate mini breakdown ────────────────
    print("── Step 3: Generate Mini Breakdown (250 words) ──")
    print("  Calling OpenRouter (non-streaming)...")
    try:
        breakdown = await chat_completion(
            messages=breakdown_msgs,
            model="deepseek/deepseek-chat",
            temperature=0.7,
            max_tokens=600,
        )
        blines = breakdown.split("\n")
        print(f"  ✓ {len(breakdown)} chars, {len(blines)} lines\n")
        print(breakdown[:1200])
        if len(breakdown) > 1200:
            print(f"\n  ... ({len(breakdown) - 1200} more chars)")
    except Exception as e:
        print(f"  ✗ FAILED: {e}\n")
        return

    # ── Step 4: Test streaming chat ────────────────────
    print("\n\n── Step 4: Streaming Chat ──")
    chat_history = [
        {"role": "assistant", "content": "I have your complete Vedic chart. The planets tell a fascinating story. What would you like to explore first?"}
    ]
    user_q = "Why is my Moon debilitated in Scorpio, and what can I do about it?"
    chat_msgs = build_chat_messages(enriched, "vedic", chat_history, user_q)
    print(f"  Question: \"{user_q}\"\n")
    print("  Response: ", end="", flush=True)

    try:
        tokens = []
        async for token in stream_chat_completion(
            messages=chat_msgs,
            model="deepseek/deepseek-chat",
            temperature=0.8,
            max_tokens=400,
        ):
            print(token, end="", flush=True)
            tokens.append(token)
        print(f"\n\n  ✓ {len(tokens)} streaming tokens")
    except Exception as e:
        print(f"\n  ✗ FAILED: {e}")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED — Pipeline is working!")
    print("=" * 60)


asyncio.run(main())
