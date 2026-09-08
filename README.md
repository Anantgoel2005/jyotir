# Jyotir

Jyotir is a private AI astrology reading studio for Tropical, Vedic, and Bazi charts. The interface is built with Next.js 14; FastAPI calculates charts, persists private anonymous sessions in PostgreSQL, and streams DeepSeek interpretations.

## Architecture

```text
Browser
  │ same-origin /api + HTTP-only anonymous-session cookie
  ▼
Next.js route handler (BFF)
  │ Authorization: Bearer <opaque token>
  ▼
FastAPI /api/v1
  ├─ PostgreSQL: sessions, charts, generation leases, chat
  ├─ AstrologyAPI: Tropical and Vedic calculation
  ├─ lunar-python: Bazi Four Pillars
  ├─ Open-Meteo: demo geocoding
  └─ DeepSeek: streamed reading and consultation
```

Each browser receives a private anonymous session. Tokens are stored only in an HTTP-only cookie and only their SHA-256 hashes are persisted. Sessions and their charts expire after 30 days.

## Local setup

### Docker

1. Copy `backend/.env.example` to `backend/.env` and set `ASTROLOGY_API_KEY` and `DEEPSEEK_API_KEY`.
2. Export the same two variables for Docker Compose.
3. Run:

```bash
docker compose up --build
```

Open <http://localhost:3000>. The backend is available on <http://localhost:9000>.

### Native development

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 9000
```

Frontend:

```bash
cd frontend
npm ci
set BACKEND_API_URL=http://localhost:9000
npm run dev
```

On macOS/Linux, use `export BACKEND_API_URL=http://localhost:9000`.

## Checks

```bash
cd backend
pytest -q

cd ../frontend
npm test
npm run lint
npm run typecheck
npm run build
```

## API

The browser uses same-origin Next.js `/api/*` routes. FastAPI exposes the private versioned API under `/api/v1`:

- `POST /sessions`
- `GET /locations`
- `POST|GET /charts`
- `GET|DELETE /charts/{id}`
- `POST /charts/{id}/generation`
- `GET /charts/{id}/generation/stream`
- `POST /charts/{id}/chat`
- `GET /charts/{id}/conversations`
- `GET /conversations/{id}`

Generation and chat streams use newline-delimited JSON. All non-health routes except session creation require the anonymous bearer token.

## Deployment

`render.yaml` deploys the existing two web services and PostgreSQL database. Backend startup applies Alembic migrations before starting Uvicorn. The `0002_private_studio` migration intentionally purges legacy shared-demo data before creating private session-owned tables.

Do not push this overhaul until local tests and browser QA have been approved.
