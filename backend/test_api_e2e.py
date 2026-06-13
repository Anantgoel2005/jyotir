"""Full API server test — FastAPI TestClient + mock data + OpenRouter."""
import sys, os, asyncio, uuid, datetime

sys.path.insert(0, os.path.dirname(__file__))
os.environ["ASTROLOGY_API_KEY"] = "skip"
os.environ["APP_ENV"] = "development"

from fastapi.testclient import TestClient
from app.main import app
from app.database import async_session, init_db
from app.models.user import User
from app.models.chart import Chart
from app.models.chat import ChartConversation, ChatMessage
from app.models.credit import CreditLedger
from app.services.chart_enrichment import enrich_chart
from app.services.llm_client import chat_completion
from app.services.prompt_builder import build_breakdown_messages

client = TestClient(app)
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

MOCK = {
    "name": "Test User", "birth_date": "1990-03-15", "birth_time": "14:30",
    "timezone": "Asia/Kolkata", "city": "New Delhi", "country": "India",
    "latitude": 28.6139, "longitude": 77.2090,
    "planets": [
        {"name": "Sun","sign": "Aquarius","fullDegree": 320.23,"house": 7,"nakshatra": "Shatabhisha","nakshatra_pad": 2,"planet_awastha": "Yuva","isRetro": "false"},
        {"name": "Moon","sign": "Scorpio","fullDegree": 222.63,"house": 4,"nakshatra": "Anuradha","nakshatra_pad": 3,"planet_awastha": "Kumara","isRetro": "false"},
        {"name": "Mars","sign": "Sagittarius","fullDegree": 254.83,"house": 5,"nakshatra": "Purva Ashadha","nakshatra_pad": 1,"planet_awastha": "Yuva","isRetro": "false"},
        {"name": "Jupiter","sign": "Cancer","fullDegree": 92.25,"house": 12,"nakshatra": "Punarvasu","nakshatra_pad": 4,"planet_awastha": "Kumara","isRetro": "false"},
        {"name": "Saturn","sign": "Sagittarius","fullDegree": 262.67,"house": 5,"nakshatra": "Purva Ashadha","nakshatra_pad": 3,"planet_awastha": "Vridha","isRetro": "false"},
        {"name": "Rahu","sign": "Capricorn","fullDegree": 288.55,"house": 6,"nakshatra": "Shravana","nakshatra_pad": 3,"planet_awastha": "Mrit","isRetro": "true"},
        {"name": "Ketu","sign": "Cancer","fullDegree": 108.55,"house": 12,"nakshatra": "Pushya","nakshatra_pad": 1,"planet_awastha": "Mrit","isRetro": "true"},
        {"name": "Ascendant","sign": "Leo","fullDegree": 148.7,"house": 1,"nakshatra": "Magha","nakshatra_pad": 4,"isRetro": "false"}
    ],
    "houses": [],
    "aspects": [
        {"planet1": "Sun","planet2": "Venus","aspect_type": "conjunction","orb": 3},
        {"planet1": "Moon","planet2": "Jupiter","aspect_type": "trine","orb": 4},
    ],
    "dasha": {"current_mahadasha": "Saturn","start_date": "2023","end_date": "2042","current_antardasha": "Jupiter"},
}
# Add houses — using API field names
for i, s, d in [
    (1,"Leo",148.7),(2,"Virgo",175.17),(3,"Libra",204.5),(4,"Scorpio",236.25),
    (5,"Sagittarius",268.83),(6,"Capricorn",300.33),(7,"Aquarius",328.7),(8,"Pisces",355.17),
    (9,"Aries",24.5),(10,"Taurus",56.25),(11,"Gemini",88.83),(12,"Cancer",120.33),
]:
    MOCK["houses"].append({"number": i, "sign": s, "fullDegree": d})


async def seed():
    async with async_session() as db:
        user = await db.get(User, DEV_USER_ID)
        if not user:
            user = User(id=DEV_USER_ID, email="dev@jyotir.app", name="Dev User", credits=10)
            db.add(user)
            await db.commit()

        enriched_text = enrich_chart(
            MOCK,
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
        print(f"  Enriched: {len(enriched_text)} chars")

        chart = Chart(
            user_id=DEV_USER_ID, system="vedic", person_name="Test User",
            birth_date=datetime.date(1990, 3, 15), birth_time=datetime.time(14, 30),
            birth_timezone="Asia/Kolkata", birth_city="New Delhi", birth_country="India",
            birth_latitude=28.6139, birth_longitude=77.2090,
            raw_chart=MOCK, enriched_chart={"text": enriched_text}, status="calculating",
        )
        db.add(chart)
        await db.commit()
        await db.refresh(chart)
        print(f"  Chart saved: {chart.id}")

        print("\n  Generating breakdown via OpenRouter...")
        messages = build_breakdown_messages(enriched_text)
        try:
            breakdown = await chat_completion(messages, model="deepseek/deepseek-chat", temperature=0.7, max_tokens=300)
            chart.breakdown = breakdown
            chart.breakdown_model = "deepseek/deepseek-chat"
            chart.status = "ready"
            await db.commit()
            print(f"  Generated: {len(breakdown)} chars  Preview: {breakdown[:200]}...")
        except Exception as e:
            print(f"  FAILED: {e}")
            chart.status = "failed"
            chart.error_message = str(e)
            await db.commit()
        return chart.id


# ── Run ──
print("Setup: Creating DB tables...")
asyncio.run(init_db())
print("  Done\n")

print("Test 1: Health")
r = client.get("/api/health")
print(f"  {r.status_code} {r.json()}")

print("\nTest 2: List Charts (empty)")
r = client.get("/api/charts")
print(f"  {r.status_code} {len(r.json())} charts")

print("\nTest 3: Seed chart + AI breakdown")
chart_id = asyncio.run(seed())

print(f"\nTest 4: GET /api/chart/{chart_id}")
r = client.get(f"/api/chart/{chart_id}")
if r.status_code == 200:
    d = r.json()
    print(f"  Status: {d['status']}")
    print(f"  System: {d['system']}")
    print(f"  Person: {d['person_name']}")
    if d.get('breakdown'):
        print(f"  Breakdown: {len(d['breakdown'])} chars")
    print("  PASS")
else:
    print(f"  FAIL: {r.status_code} {r.text}")

print("\nALL TESTS COMPLETE")
