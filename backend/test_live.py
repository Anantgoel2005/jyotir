"""Live test: Real AstrologyAPI + OpenRouter"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app.services.astro_api import calculate_chart
from app.services.chart_enrichment import enrich_chart
from app.services.prompt_builder import build_breakdown_messages
from app.services.llm_client import chat_completion

async def test():
    print("=== JYOTIR LIVE TEST ===")

    print("\n1. Fetching real chart from AstrologyAPI...")
    raw = await calculate_chart("vedic", "Test User", "1990-03-15", "14:30", 28.6139, 77.2090, 5.5)
    planets = [p for p in raw if p.get("name") != "Ascendant"]
    asc = [p for p in raw if p.get("name") == "Ascendant"]
    print(f"   {len(planets)} planets + ascendant")
    if asc:
        a = asc[0]
        print(f"   Ascendant: {a['sign']} ({a['nakshatra']} pada {a['nakshatra_pad']})")
    for p in planets[:3]:
        print(f"   {p['name']}: {p['sign']} house {p['house']}")

    print("\n2. Enriching...")
    enriched = enrich_chart(
        raw,
        "vedic",
        person_name="Test User",
        birth_date="1990-03-15",
        birth_time="14:30",
        timezone="Asia/Kolkata",
        city="New Delhi",
        country="India",
        lat=28.6139,
        lng=77.2090,
    )
    print(f"   {len(enriched)} chars, ~{len(enriched)//4} tokens")
    print("   " + enriched[:200].replace("\n", "\n   ") + "...")

    print("\n3. AI Breakdown (OpenRouter)...")
    messages = build_breakdown_messages(enriched)
    breakdown = await chat_completion(messages, model="deepseek/deepseek-chat", temperature=0.7, max_tokens=400)
    print(f"   {len(breakdown)} chars")
    for line in breakdown.split("\n")[:6]:
        print(f"   {line}")
    print(f"   ... ({len(breakdown.split(chr(10)))} lines)")

    print("\nALL TESTS PASSED!")

asyncio.run(test())
