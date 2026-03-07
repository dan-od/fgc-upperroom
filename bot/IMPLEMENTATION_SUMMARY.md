# Church WhatsApp Bot ??? Implementation Summary

**Status:** Production-ready  
**Completed:** March 2026

---

## What's Built

### Runtime & Structure

- Separate Express API server (`bot/src/index.js`) on port `4100`; independent from the Vite website
- Shared repo `package.json` ??? `npm run bot:*` scripts cover dev, worker, validate, and testing
- Queue worker (`bot/src/worker.js`) runs as a separate process via BullMQ + Redis

```
bot/
????????? db/schema.sql               # PostgreSQL schema
????????? scripts/                    # validate, test-messages, load-test
????????? src/
    ????????? config/env.js            # all env var defaults
    ????????? db/connection.js         # pg connection pool
    ????????? lib/logger.js            # structured JSON logging
    ????????? utils/time.js            # WAT timezone + first-Sunday logic
    ????????? queue/                   # BullMQ connection + queue definitions
    ????????? scheduler/               # cron jobs (service + event reminders)
    ????????? workers/                 # reminder job processor
    ????????? services/                # repositories, LLM, WhatsApp, opt-out
    ????????? routes/                  # Express route handlers
    ????????? app.js                   # Express app factory + webhook routes
    ????????? index.js / worker.js     # process entrypoints
```

---

### Database (PostgreSQL)

Schema: `bot/db/schema.sql`

| Table | Purpose |
|---|---|
| `visitors` | Subscriber list ??? name, phone, consent, tags, timezone |
| `events` | Events with reminder start date (auto-calc: 1 month before) |
| `messages` | Full audit log ??? WAMID, status, errors |
| `opt_outs` | Permanent do-not-contact registry |
| `scheduled_jobs` | Cron job audit trail |

Indexes on: `phone_number`, `is_subscribed`, `event_date`, `status`, `sent_time`.

---

### API

**Visitors** ??? CRUD + subscription toggle + do-not-contact flag  
**Events** ??? CRUD; creating an event auto-computes `reminder_start_date`  
**Messages** ??? filterable log query  
**CSV import** ??? multipart upload; validates consent + phone format; returns stats  
**Previews** ??? `POST /bot/api/preview/service|event` ??? generate a sample message without sending  
**Admin** ??? stats, engagement metrics, recent activity  
**Monitoring** ??? health (DB + Redis ping), active alerts, 24-hour error summary  
**Webhooks** ??? `GET + POST /bot/webhooks/whatsapp` ??? Meta verification + inbound events

---

### Scheduler

| Job | Cron (UTC) | Action |
|---|---|---|
| Service reminder | `0 11 * * 6` (Sat 12:00 WAT) | Enqueue reminder for all subscribed visitors |
| Event reminder planner | `0 23 * * *` (midnight WAT) | Find qualifying events; enqueue visitor ?? event jobs |

First-Sunday service time: `07:30 WAT`. All other Sundays: `08:00 WAT`.

`ENABLE_SCHEDULER=false` by default ??? set `true` in production.

---

### LLM Message Generation

`LLM_PROVIDER=auto` resolves providers in this order:

1. **Vertex AI Gemini** ??? service account auth with 50-min token cache; preferred in production
2. **OpenAI** ??? `OPENAI_API_KEY`; falls through if unavailable
3. **Google Gemini direct** ??? `GEMINI_API_KEY`; REST API with rate-limit backoff
4. **Static fallback templates** ??? always available; gender-aware, culturally appropriate phrasing

Set `LLM_PROVIDER=none` to force static templates. Set `LLM_PROVIDER=vertex|openai|gemini` to pin a provider.

---

### WhatsApp Send Pipeline (Meta Cloud API)

- POSTs to `https://graph.facebook.com/v21.0/{META_PHONE_NUMBER_ID}/messages`
- Supports **template messages** (scheduled outbound) and **free-form text** (within 24-hr reply window)
- Returns WAMID for delivery tracking
- Permanent Meta error codes skip retry: `131026`, `131047`, `131051`, `131052`
- Rate-limit errors (`130429`, `131056`, HTTP `429`) retry with exponential backoff (max 3)
- `WHATSAPP_PROVIDER=stub` logs without sending ??? use in development

---

### Queue Worker (BullMQ)

- Processes `service-reminder` and `event-reminder` jobs
- Concurrency: 1 (serial, to control outbound rate)
- Rate limit: 60 messages/minute with 1s inter-message delay
- 3 retry attempts with exponential backoff on transient failures

---

### Opt-Out Handling

Inbound STOP keyword via Meta webhook ??? visitor flagged as do-not-contact ??? confirmation reply sent ??? excluded from future sends.

---

### Testing & Validation

| Script | Purpose |
|---|---|
| `npm run bot:validate` | Checks DB schema, required env vars, permissions |
| `npm run bot:test-messages` | Generates sample messages via LLM + templates |
| `npm run bot:load-test N` | Simulates N-visitor send batch |

---

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Separate bot server | Independent from Vite website; deployable separately |
| BullMQ + Redis | Resilient queue with retries and backoff |
| `LLM_PROVIDER=auto` | Tries Vertex ??? OpenAI ??? Gemini; always falls back to templates |
| Rate limiting (60/min) | Stays within Meta tier limits |
| WAT timezone | West Africa Time hardcoded (no DST); per-visitor timezone stored for future use |
| First-Sunday logic | Church-specific rule: first Sunday of month has earlier service time |
| `ENABLE_SCHEDULER=false` | Prevents accidental sends in development |

---

### Deployment Options

- **PM2** ??? `pm2 start bot/src/index.js` + `pm2 start bot/src/worker.js`
- **Docker** ??? `Dockerfile` + `docker-compose.yml` in `bot/`
- **Systemd** ??? unit files described in `DEPLOYMENT.md`

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full runbook.
