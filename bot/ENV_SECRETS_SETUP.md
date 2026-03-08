# Bot Environment Secrets Setup

This guide explains how to obtain every `.env` value required by the WhatsApp bot and how to store them safely.

## 1) Create your local env file

From the project root:

```bash
cp .env.example .env
```

Then edit:

```bash
vim .env
```

**Important:**  
Do not commit `.env`. All environment variables are now stored in the root `.env` file, shared across the entire application.

---

## 2) Required secrets and where to get them

## Database

### `DATABASE_URL`

What it is:
- PostgreSQL connection string used by the bot API and worker.

How to get it:
- If self-hosted Postgres: build from your DB credentials.
- If managed provider (Supabase, Render, Railway, Neon, RDS): copy the connection URL from the provider dashboard.

Format:

```bash
DATABASE_URL=postgresql://<username>:<password>@<host>:5432/<database>
```

Quick check:

```bash
psql "$DATABASE_URL" -c "SELECT NOW();"
```

---

## Queue / Redis

### `REDIS_URL`

What it is:
- Redis connection string used by BullMQ queue workers.

How to get it:
- Local Redis: `redis://127.0.0.1:6379`
- Managed Redis (Upstash/Redis Cloud/Render): copy endpoint from dashboard.

Format:

```bash
REDIS_URL=redis://<host>:6379
# or
REDIS_URL=redis://:<password>@<host>:6379
```

Quick check:

```bash
redis-cli -u "$REDIS_URL" ping
```

Expected: `PONG`.

---

## WhatsApp (Meta Cloud API)

### `META_ACCESS_TOKEN`
Long-lived System User token from Meta Business Manager. Starts with `EAAx...`.

How to get it:
1. Go to [business.facebook.com](https://business.facebook.com) → System Users.
2. Create a System User with **full control** of your WhatsApp Business Account.
3. Generate token — select permissions `whatsapp_business_messaging` + `whatsapp_business_management`.
4. Copy the generated token.

### `META_PHONE_NUMBER_ID`
The numeric Phone Number ID for your WhatsApp-enabled business number.

How to get it:
- In your Meta Developer App → **WhatsApp → API Setup** → copy the **Phone Number ID** next to your number.

### `META_WABA_ID`
Your WhatsApp Business Account ID.

How to get it:
- Same page as Phone Number ID — shown as **WhatsApp Business Account ID**.

### `META_WEBHOOK_VERIFY_TOKEN`
A secret string you choose (any random value). Used to verify webhook ownership.

Example: `fgc-upperroom-webhook-2026`

### `META_APP_SECRET`
Found in Meta Developer App → **App Settings → Basic → App Secret**.

### `META_API_VERSION`
Graph API version to use. Default: `v21.0`

Webhook setup in Meta Developer App:
- Go to **WhatsApp → Configuration**
- Callback URL: `https://<your-domain>/bot/webhooks/whatsapp`
- Verify Token: value of `META_WEBHOOK_VERIFY_TOKEN`
- Subscribe to field: `messages`

---

## LLM Provider (choose at least one)

Provider resolution order (`LLM_PROVIDER=auto`):
1. Vertex AI Gemini (if `VERTEX_PROJECT_ID` is set)
2. OpenAI (if `OPENAI_API_KEY` is set)
3. Google Gemini direct (if `GEMINI_API_KEY` is set)
4. Static fallback templates (always available — no API needed)

Set `LLM_PROVIDER=vertex|openai|gemini|none` to override selection.

### Vertex AI (preferred in production)

#### `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_MODEL`, `VERTEX_SERVICE_ACCOUNT_JSON`

How to set up:
1. In [Google Cloud Console](https://console.cloud.google.com), create a Service Account with the **Vertex AI User** role.
2. Create a JSON key for the service account. Download it.
3. Set `VERTEX_SERVICE_ACCOUNT_JSON` to the JSON string (or mount the file and omit this var to use Application Default Credentials).

Example:
```bash
LLM_PROVIDER=auto
VERTEX_PROJECT_ID=my-gcp-project
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
VERTEX_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}
```

### OpenAI

#### `OPENAI_API_KEY`, `OPENAI_MODEL` (optional)

How to get key:
1. Open [platform.openai.com](https://platform.openai.com) → API Keys.
2. Create a new secret key.

Example:
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Google Gemini (direct API)

#### `GEMINI_API_KEY`, `GEMINI_MODEL` (optional)

How to get key:
1. Open [Google AI Studio](https://aistudio.google.com) → Create API key.

Example:
```bash
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

---

## Monitoring (optional)

### `ALERT_WEBHOOK_URL`

What it is:
- Endpoint that receives bot alert notifications.

Examples:
- Slack Incoming Webhook
- Discord Webhook
- PagerDuty Events endpoint
- Custom internal endpoint

---

## 3) Minimum `.env` example

```bash
BOT_PORT=4100
BOT_HOST=0.0.0.0
BOT_TIMEZONE=Africa/Lagos
ENABLE_SCHEDULER=false

DATABASE_URL=postgresql://user:pass@localhost:5432/church_bot
REDIS_URL=redis://127.0.0.1:6379

WHATSAPP_PROVIDER=meta
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=123456789012345
META_WABA_ID=987654321098765
META_WEBHOOK_VERIFY_TOKEN=fgc-upperroom-webhook-2026
META_APP_SECRET=abcdef1234567890abcdef1234567890
META_API_VERSION=v21.0

# LLM — fill in at least one; auto order: vertex → openai → gemini → static
LLM_PROVIDER=auto
VERTEX_PROJECT_ID=
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
VERTEX_SERVICE_ACCOUNT_JSON=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

ALERT_WEBHOOK_URL=
```

---

## 4) Validate configuration

From project root:

```bash
npm run bot:validate
```

If valid, start services:

```bash
pm2 start bot/src/index.js --name church-bot-api
pm2 start bot/src/worker.js --name church-bot-worker
```

---

## 5) Security best practices

- Never commit real keys to git.
- Keep `.env.example` (in root directory) with placeholders only.
- Rotate API keys regularly.
- Use a secrets manager for production (AWS Secrets Manager / Vault / Doppler / 1Password Secrets Automation).
- Restrict provider key permissions where supported.
- If a key leaks, rotate immediately and redeploy.
