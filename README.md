# Talos

Talos is a multi-channel communication platform that connects:

- Microsoft Teams
- WhatsApp (Twilio + whatsapp-web.js bot)
- Slack
- AI-based task extraction and summarization

It routes messages between mapped channels/groups, extracts actionable tasks, and shows summaries on a Next.js dashboard.

## Project Structure

- `backend/` - Node.js + Express API, webhooks, routing logic, forwarding services
- `frontend/` - Next.js dashboard UI
- `python-service/` - FastAPI summarization service

## Core Features

- Teams webhook ingestion and message processing
- WhatsApp inbound/outbound flow with Twilio and WhatsApp bot support
- Slack integration and batch scanning
- Channel/group mapping with tenant-aware routing
- Task-only forwarding policy (blocks meetings/scheduling/invoices/general chat)
- Retry + monitoring + cleanup jobs
- AI summarization for the latest channel messages

## Requirements

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- ngrok (for local webhook callbacks)

## Environment Configuration

Create `backend/.env` with values similar to:

```env
PORT=5000
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o
OPENAI_SUMMARY_MODELS=gpt-4o

TENANT_ID=your_tenant_id
CLIENT_ID=your_azure_app_id
CLIENT_SECRET=your_azure_app_secret
MicrosoftAppId=your_azure_app_id
MicrosoftAppPassword=your_azure_app_secret
BOT_TYPE=SingleTenant

NGROK_URL=https://your-ngrok-url.ngrok-free.app
WEBHOOK_SECRET=your_webhook_secret

SLACK_BOT_TOKEN=your_slack_bot_token
TEAMS_FORWARD_TEAM_ID=your_teams_team_id
MONITORED_CHAT_IDS=comma_separated_teams_chat_ids

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
DEFAULT_WHATSAPP_NUMBER=+91xxxxxxxxxx
DEFAULT_COUNTRY_CODE=+91

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_BUCKET=talos

DATABASE_URL=postgresql://user:password@localhost:5432/talos
SLACK_BATCH_SCANNER_ENABLED=true
RETRY_FORWARDS_ENABLED=true
WHATSAPP_GROUP_JID_MAP={"whatsapp:123@g.us":"Group A","whatsapp:456@g.us":"Group B"}
TZ=Asia/Kolkata
```

Notes:

- Keep secrets only in `.env` files (never commit keys).
- `python-service` loads env from `python-service/.env` and also from `backend/.env`.

## Installation

### 1) Backend

```bash
cd backend
npm install
```

### 2) Frontend

```bash
cd frontend
npm install
```

### 3) Python service

```bash
cd python-service
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Running Locally

Use 3 terminals:

### Terminal A - Backend (port 5000)

```bash
cd backend
node server.js
```

### Terminal B - Frontend (port 3000)

```bash
cd frontend
npm run dev
```

### Terminal C - Python summarizer (port 8000)

```bash
cd python-service
.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

## Main API Routes (Backend)

- `GET /api/monitoring/health` - service health
- `POST /api/webhook/webhook` - Teams webhook callback
- `POST /api/whatsapp/webhook` - WhatsApp webhook callback
- `GET/POST/PUT /api/settings/mappings` - channel mappings
- `GET /api/messages/*` - dashboard/admin messages
- `POST /api/summaries/*` - summary related APIs

## Summarization APIs (Python Service)

- `GET /` - health check
- `POST /summarize/all` - summarize all channels
- `POST /summarize/{source}/{channel_id}` - summarize one channel
- `GET /summary/{source}/{channel_id}` - fetch stored summary

## Operational Notes

- Routing relies on `channel_mappings` and tenant-scoped lookups.
- If a mapping is missing/invalid, forwarding is skipped by design.
- WhatsApp/Slack batch scanners run periodically in backend.
- Forward policy allows only task/approval-style content to be forwarded.

## Troubleshooting

- Model/API mismatch error (`v1/responses vs v1/chat/completions`):
  - Use `OPENAI_MODEL=gpt-4o` with current `chat.completions` code path.
- WhatsApp bot browser lock:
  - Stop duplicate Node/Chrome processes, then restart backend.
- Next.js missing chunk/module errors:
  - Delete `frontend/.next` and rebuild.
- Media not forwarded:
  - Verify channel mapping and monitored chat IDs first.

## Security

- Rotate any leaked keys immediately.
- Do not commit `.env` with production secrets.
- Prefer separate keys per environment (dev/staging/prod).
