# Deployment Guide

This project has three deployable services:

- `frontend` (Next.js)
- `backend` (Node.js/Express)
- `python-service` (FastAPI)

Use separate hosting services/containers or a single VM with process manager support.

## 1) Required Environment Variables

### Backend (`backend/.env`)

At minimum set:

- `PORT`
- `OPENAI_API_KEY`
- `TENANT_ID`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `NGROK_URL` (or your production webhook base URL)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_DB_URL` (or `DATABASE_URL`)

Optional but usually needed for integrations:

- `SLACK_BOT_TOKEN`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `CORS_ORIGINS` (comma-separated)

See `backend/.env.example` for the full key list.

### Frontend (`frontend/.env`)

- `NEXT_PUBLIC_API_URL` -> backend public URL
- `NEXT_PUBLIC_PYTHON_API_URL` -> python-service public URL

See `frontend/.env.example`.

### Python Service (`python-service/.env`)

If not sharing backend env, set:

- `OPENAI_API_KEY`
- `SUPABASE_DB_URL` (or `DATABASE_URL`)
- `CORS_ORIGINS`

See `python-service/.env.example`.

## 2) Build / Start Commands

### Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

### Backend

```bash
cd backend
npm install
npm start
```

### Python service

```bash
cd python-service
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## 3) Pre-Deployment Verification

Run these checks before going live:

- Frontend build passes: `npm run build` in `frontend`
- Backend boots without startup exceptions
- Python boots and serves health check
- Health endpoints:
  - `GET /api/messages/health` on backend
  - `GET /` on python-service
- CORS is configured to production frontend domain in `CORS_ORIGINS`
- `NGROK_URL`/webhook base URL points to the currently active public endpoint

## 4) Production Notes

- Keep only one process per service port (`3000`, `5000`, `8000`) to avoid bind errors.
- Do not commit real secrets in `.env`; use platform secret managers where possible.
- WhatsApp web bot requires QR auth flow and may need session reset on first deploy.
