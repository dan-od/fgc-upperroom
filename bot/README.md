# Church WhatsApp Bot

An independent backend runtime that sends automated WhatsApp reminders for church services and events. It runs as a separate Node.js process from the Vite website and shares the repo-level `.env` file.

---

## Quick Start

```bash
# Copy and fill the shared environment file
cp .env.example .env
vim .env

npm install
npm run env:parity
npm run bot:validate
npm run bot:dev
npm run bot:worker
```

Health check: `GET http://localhost:4100/bot/health`

---

## Architecture

| Concern | Detail |
|---|---|
| API server | Express on port `4100`, path prefix `/bot/` |
| Queue | BullMQ + Redis with retries and backoff |
| Database | PostgreSQL for visitors, events, messages, opt-outs |
| Scheduler | node-cron for Saturday service reminders and daily event planning |
| WhatsApp | Meta Cloud API (Graph API v21.0) |
| LLM | Vertex AI, OpenAI, Gemini, or static templates |
| Rate limit | 60 messages per minute |

**Scheduler behaviour**
- Service reminders run on Saturday at 12:00 WAT.
- First-Sunday services start at 07:30 WAT.
- Other Sundays start at 08:00 WAT.
- Event reminders are planned daily and start one month before the event date.

**LLM provider order**
1. Vertex AI Gemini, if `VERTEX_PROJECT_ID` is set.
2. OpenAI, if `OPENAI_API_KEY` is set.
3. Google Gemini direct API, if `GEMINI_API_KEY` is set.
4. Static templates, if no provider is available.

Set `LLM_PROVIDER=none` to skip provider calls and use static templates only.

---

## API Endpoints

### Visitors

| Method | Path | Description |
|---|---|---|
| `POST` | `/bot/api/visitors` | Create subscriber |
| `GET` | `/bot/api/visitors` | List subscribers |
| `GET` | `/bot/api/visitors/:phone` | Fetch one visitor |
| `PATCH` | `/bot/api/visitors/:phone/subscription` | Toggle subscription |
| `POST` | `/bot/api/visitors/:phone/do-not-contact` | Mark as permanently suppressed |

### Events

| Method | Path | Description |
|---|---|---|
| `POST` | `/bot/api/events` | Create event and calculate reminder start |
| `GET` | `/bot/api/events` | List upcoming events |
| `PATCH` | `/bot/api/events/:id` | Update event |
| `DELETE` | `/bot/api/events/:id` | Delete event |

### Utilities

| Method | Path | Description |
|---|---|---|
| `GET` | `/bot/api/messages` | Query message logs |
| `POST` | `/bot/api/import-csv` | Bulk import visitors |
| `POST` | `/bot/api/preview/service` | Preview a service reminder |
| `POST` | `/bot/api/preview/event` | Preview an event reminder |
| `GET` | `/bot/api/admin/stats` | System statistics |
| `GET` | `/bot/api/admin/activity` | Recent activity |
| `GET` | `/bot/api/admin/engagement` | Engagement metrics |
| `GET` | `/bot/monitoring/health` | DB and Redis health check |
| `GET` | `/bot/monitoring/alerts` | Active alerts |
| `GET` | `/bot/monitoring/errors` | 24-hour error summary |

### WhatsApp Webhooks

| Method | Path | Description |
|---|---|---|
| `GET` | `/bot/webhooks/whatsapp` | Meta webhook verification |
| `POST` | `/bot/webhooks/whatsapp` | Inbound messages and delivery updates |

Inbound `STOP` replies are detected automatically and the visitor is marked do-not-contact.

---

## Environment Variables

The bot reads the shared root `.env` file. Keep the example files in sync when you change it.

| Group | Key names |
|---|---|
| Runtime | `DATABASE_URL`, `REDIS_URL`, `BOT_PORT`, `BOT_HOST`, `BOT_TIMEZONE`, `ENABLE_SCHEDULER`, `PUBLIC_SITE_BASE_URL`, `BOT_PUBLIC_BASE_URL` |
| Storage and tooling | `APP_DATA_DIR`, `APP_PUBLIC_DIR`, `APP_DIST_DIR`, `DB_PASSWORD`, `TARGET_URL`, `TEMP_DB_NAME`, `PERF_REQUESTS`, `PERF_P95_MS` |
| Base paths | `APP_BASE_PATH`, `PUBLIC_APP_BASE_PATH`, `VITE_APP_BASE_PATH`, `VITE_API_BASE_URL`, `VITE_BOT_API_URL`, `VITE_ATTENDANCE_API_URL`, `VITE_LIVE_STREAM_URL` |
| Admin | `BOT_ADMIN_API_KEY`, `VITE_ENABLE_ADMIN_FALLBACK_LOGIN`, `VITE_ADMIN_EMAIL`, `VITE_ADMIN_PASSWORD`, `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Attendance sync | `ATTENDANCE_PORT`, `ATTENDANCE_PUBLIC_BASE_URL`, `ATTENDANCE_TEST_OPEN`, `ATTENDANCE_HISTORY_API_URL`, `ATTENDANCE_HISTORY_SYNC_KEY`, `ATTENDANCE_ADMIN_KEY`, `ATTENDANCE_ADMIN_PASSWORD`, `VITE_ATTENDANCE_ADMIN_KEY` |
| WhatsApp | `WHATSAPP_PROVIDER`, `WHATSAPP_FALLBACK_PROVIDER`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_WABA_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, `META_API_VERSION` |
| LLM | `LLM_PROVIDER`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_MODEL`, `VERTEX_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL` |

Useful notes:
- `ATTENDANCE_HISTORY_SYNC_KEY` is sent as `x-attendance-sync-key` when the attendance service mirrors sessions and check-ins back to the bot.
- `VITE_ENABLE_ADMIN_FALLBACK_LOGIN=true` turns on the browser-only fallback login in local development.
- `WHATSAPP_FALLBACK_PROVIDER=stub` is the safe development fallback when Meta is not available.
- `BOT_PUBLIC_BASE_URL` and `PUBLIC_SITE_BASE_URL` keep links, QR codes, and HTTPS checks pointed at the right host.
- `APP_DATA_DIR`, `APP_PUBLIC_DIR`, and `APP_DIST_DIR` control storage paths when you want to move away from the defaults.
- `TARGET_URL`, `TEMP_DB_NAME`, `PERF_REQUESTS`, and `PERF_P95_MS` are mostly for the HTTPS, backup, and perf smoke scripts.

See [ENV_SECRETS_SETUP.md](ENV_SECRETS_SETUP.md) for where to get each secret.

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
npm run bot:validate        # readiness check
npm run bot:test-messages   # sample message generation
npm run bot:load-test 100   # simulate a 100-visitor batch
```

---

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for PM2, Docker, systemd, Nginx, Meta webhook registration, and rollback.

Backup/recovery and TLS verification runbook: [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md).
