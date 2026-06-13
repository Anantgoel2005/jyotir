"""Background task diagnostic"""
import asyncio, sys, os, uuid
from datetime import date, time as dt_time

# Setup
os.chdir(r"C:\Users\anant\jyotir\backend")
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv()

from app.database import async_session, init_db
from app.models.chart import Chart
from app.services.chart_enrichment import enrich_chart
from app.services.llm_client import chat_completion
from app.services.prompt_builder import build_breakdown_messages
from app.services.astro_api import calculate_chart
from sqlalchemy import select

async def main():
    print("=== Background Task Diagnostic ===", flush=True)
    
    # Ensure DB
    await init_db()
    
    # Fetch chart
    print("1. Fetching chart from API...", flush=True)
    raw = await calculate_chart("vedic", "Diag", "1990-03-15", "14:30", 28.6139, 77.2090, 5.5, "male")
    print(f"   Got {len(raw)} planets", flush=True)
    
    # Enrich
    print("2. Enriching...", flush=True)
    enriched_text = enrich_chart(raw, "vedic", person_name="Diag", birth_date="1990-03-15",
                                birth_time="14:30", timezone="Asia/Kolkata", city="Delhi",
                                country="India", lat=28.6139, lng=77.2090)
    print(f"   {len(enriched_text)} chars", flush=True)
    
    # Save to DB
    chart_id = uuid.uuid4()
    print(f"3. Saving chart {chart_id}...", flush=True)
    async with async_session() as db:
        chart = Chart(
            id=chart_id,
            user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            system="vedic", person_name="Diag",
            birth_date=date(1990,3,15), birth_time=dt_time(14,30),
            birth_timezone="Asia/Kolkata", birth_city="Delhi", birth_country="India",
            birth_latitude=28.6139, birth_longitude=77.2090,
            raw_chart=raw, enriched_chart={"text": enriched_text}, status="calculating",
        )
        db.add(chart)
        await db.commit()
    print("   Saved.", flush=True)
    
    # Read back in NEW session (simulating background task)
    print("4. Reading back in new session...", flush=True)
    async with async_session() as db:
        result = await db.execute(select(Chart).where(Chart.id == chart_id))
        chart = result.scalar_one_or_none()
        print(f"   Found: {chart is not None}", flush=True)
        
        if chart:
            enriched = chart.enriched_chart.get("text", "") if chart.enriched_chart else ""
            print(f"   Enriched text: {len(enriched)} chars", flush=True)
            
            try:
                messages = build_breakdown_messages(enriched)
                print(f"5. Calling OpenRouter...", flush=True)
                breakdown = await chat_completion(
                    messages=messages, model="deepseek/deepseek-chat",
                    temperature=0.7, max_tokens=300,
                )
                chart.breakdown = breakdown
                chart.breakdown_model = "deepseek/deepseek-chat"
                chart.status = "ready"
                print(f"   ✅ Breakdown: {len(breakdown)} chars", flush=True)
            except Exception as e:
                chart.status = "failed"
                chart.error_message = str(e)
                print(f"   ❌ Failed: {e}", flush=True)
            
            await db.commit()
            print(f"6. Final status: {chart.status}", flush=True)
        else:
            print("   ❌ Chart NOT FOUND in new session!", flush=True)

asyncio.run(main())
