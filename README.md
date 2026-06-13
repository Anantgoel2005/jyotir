# Jyotir
**AI-Powered Astrology Platform**

An end-to-end online astrology platform that computes precise natal charts
via the **AstrologyAPI.com** service and generates deeply personalized
astrological breakdowns using LLMs (via **OpenRouter**).

Supports three astrological traditions:
- **Tropical** — Western psychological astrology
- **Vedic** — Jyotish with nakshatras and dashas
- **Bazi** — Chinese Four Pillars of Destiny

## Architecture

```
┌──────────────┐      SSE Stream      ┌──────────────┐
│   Next.js 14 │◄────────────────────►│   FastAPI     │
│   (Vercel)   │   POST /api/chat/*   │   (Railway)   │
│              │                      │              │
│ Tailwind CSS │                      │ PostgreSQL 15│
│ shadcn/ui    │                      │ Redis         │
│ Vercel AI SDK│                      │ OpenRouter    │
└──────────────┘                      └──────────────┘
                                             │
                                      ┌──────┴──────┐
                                      │ AstrologyAPI │
                                      │ (Swiss       │
                                      │  Ephemeris)  │
                                      └─────────────┘
```

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- An AstrologyAPI.com API key
- An OpenRouter API key

### Setup

1. **Clone and configure**
   ```bash
   git clone <repo-url> jyotir
   cd jyotir

   # Backend env
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

2. **Start backend services**
   ```bash
   docker compose up -d db redis
   ```

3. **Install and run backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 9000
   ```

4. **Install and run frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Open** http://localhost:3000

## Project Structure

```
jyotir/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── chart.py
│   │   │   ├── chat.py
│   │   │   └── credit.py
│   │   ├── schemas/             # Pydantic request/response
│   │   │   ├── chart.py
│   │   │   └── chat.py
│   │   ├── services/            # Business logic
│   │   │   ├── astro_api.py     # AstrologyAPI.com client
│   │   │   ├── chart_enrichment.py
│   │   │   ├── llm_client.py    # OpenRouter streaming
│   │   │   └── prompt_builder.py
│   │   └── routers/             # API endpoints
│   │       ├── chart.py
│   │       └── chat.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── SystemSelector.tsx
│   │   ├── BirthDataForm.tsx
│   │   ├── BreakdownDisplay.tsx
│   │   └── ChatPanel.tsx
│   ├── lib/
│   │   ├── types.ts
│   │   └── api.ts
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chart` | Submit birth data, get chart + breakdown |
| `GET` | `/api/chart/{id}` | Get full chart with breakdown |
| `GET` | `/api/charts` | List user's charts |
| `DELETE` | `/api/chart/{id}` | Delete a chart |
| `POST` | `/api/chat/{chart_id}` | Chat with astrologer (SSE stream) |
| `GET` | `/api/conversations/{chart_id}` | List conversations for chart |
| `GET` | `/api/conversation/{id}` | Get conversation with messages |
| `GET` | `/api/health` | Health check |

## Key Design Decisions

- **Chart in system prompt** — every chat turn injects the full natal chart into the LLM system prompt. No RAG needed. Guarantees zero hallucination on planetary positions.
- **SSE streaming** — chat responses stream token-by-token using Server-Sent Events. Vercel AI SDK consumes this natively on the frontend.
- **Stateless backend** — no session state. Every request is self-contained. Scales horizontally.
- **Two-prompt architecture** — Breakdown uses Claude Sonnet 4 (high quality). Chat uses DeepSeek (fast + affordable).

## Roadmap — Phase 2+

- [ ] Transit predictions (live planetary movements)
- [ ] Synastry (compatibility between two charts)
- [ ] PDF report export
- [ ] User auth (Clerk / Supabase Auth)
- [ ] Stripe payments + credit system
- [ ] Multi-language support (Hindi, Tamil, Chinese)
- [ ] Celery async breaking generation
- [ ] Self-hosted Swiss Ephemeris fallback

## License

MIT
