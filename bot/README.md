# Church WhatsApp Bot

An independent backend runtime that sends automated WhatsApp reminders for church services and events. It runs as a separate Node.js process from the Vite website, sharing only the repo's `package.json`.

---

## Quick Start

```bash
# Copy and fill in environment variables
cp bot/.env.example bot/.env
vim bot/.env

npm install

# Validate environment + DB schema
npm run bot:validate

# Start API server (port 4100)
npm run bot:dev

# Start queue worker (separate terminal)
npm run bot:worker
```

Health check: `GET http://localhost:4100/bot/health`

---

## Architecture

| Concern | Detail |
|---|---|
| API server | Express on port `4100`, path prefix `/bot/` |
| Queue | BullMQ + Redis — retries, exponential backoff |
| Database | PostgreSQL — visitors, events, messages, opt-outs |
| Scheduler | node-cron — Saturday 12:00 WAT (service) + midnight daily (events) |
| WhatsApp | Meta Cloud API (Graph API v21.0) |
| LLM | Auto: Vertex AI → OpenAI → Gemini → static fallback |
| Rate limit | 60 messages/minute |

**Scheduler behaviour:**
- **Service reminders** — Saturday 12:00 WAT; first-Sunday services start 07:30, all others 08:00
- **Event reminders** — daily planner enqueues weekly reminders starting 1 month before the event date

**LLM provider resolution** (`LLM_PROVIDER=auto` default):
1. Vertex AI Gemini (if `VERTEX_PROJECT_ID` is configured)
2. OpenAI (if `OPENAI_API_KEY` is set)
3. Google Gemini direct API (if `GEMINI_API_KEY` is set)
4. Static fallback templates (always available, no API needed)

---

## API Endpoints

### Visitors
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/bot/api/visitors` | Create subscriber |
| `GET` | `/bot/api/visitors` | List subscribed visitors |
| `GET` | `/bot/api/visitors/:phone` | Get one visitor |
| `PATCH` | `/bot/api/visitors/:phone/subscription` | Toggle subscription |
| `POST` | `/bot/api/visitors/:phone/do-not-contact` | Permanent suppression |

### Events
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/bot/api/events` | Create event (auto-calculates reminder start) |
| `GET` | `/bot/api/events` | List upcoming events |
| `PATCH` | `/bot/api/events/:id` | Update event |
| `DELETE` | `/bot/api/events/:id` | Delete event |

### Utilities
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/bot/api/messages` | Query message logs |
| `POST` | `/bot/api/import-csv` | Bulk import visitors (multipart) |
| `POST` | `/bot/api/preview/service` | Preview a service reminder |
| `POST` | `/bot/api/preview/event` | Preview an event reminder |
| `GET` | `/bot/api/admin/stats` | System statistics |
| `GET` | `/bot/api/admin/activity` | Recent message activity |
| `GET` | `/bot/api/admin/engagement` | Engagement metrics |
| `GET` | `/bot/monitoring/health` | Health check with DB/Redis status |
| `GET` | `/bot/monitoring/alerts` | Active alerts |
| `GET` | `/bot/monitoring/errors` | 24-hour error summary |

### WhatsApp Webhooks
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/bot/webhooks/whatsapp` | Meta webhook verification |
| `POST` | `/bot/webhooks/whatsapp` | Inbound messages + delivery statuses |

Inbound `STOP` replies are detected automatically and the visitor is marked do-not-contact.

---

## Environment Variables

**Required:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/church_bot
REDIS_URL=redis://127.0.0.1:6379
BOT_PORT=4100
BOT_TIMEZONE=Africa/Lagos
ENABLE_SCHEDULER=false          # set true in production

# Meta Cloud API
WHATSAPP_PROVIDER=meta
META_ACCESS_TOKEN=EAAx...
META_PHONE_NUMBER_ID=123456789012345
META_WEBHOOK_VERIFY_TOKEN=your-secret-token
```

**LLM (choose one or more; first available wins):**
```bash
# Vertex AI (preferred — no per-call cost with service account)
LLM_PROVIDER=auto
VERTEX_PROJECT_ID=your-gcp-project
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
VERTEX_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Google Gemini direct API
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

See [ENV_SECRETS_SETUP.md](ENV_SECRETS_SETUP.md) for how to obtain each credential.

---

## CSV Import Format

```csv
name,phone_number,first_visit_date,tags,timezone,consented_at
John Doe,+2348012345678,2026-01-15,regular;tithes,Africa/Lagos,yes
```

```bash
curl -X POST -F "file=@visitors.csv" http://localhost:4100/bot/api/import-csv
```

---

## Testing

```bash
npm run bot:validate        # pre-deployment readiness check
npm run bot:test-messages   # validate LLM prompt generation
npm run bot:load-test 100   # simulate 100-visitor send batch
```

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) — covers PM2, Docker, systemd, Nginx, Meta webhook registration, and rollback.
