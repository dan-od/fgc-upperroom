# Bot Environment Secrets Setup

This guide covers the variables the bot, the attendance sync, and the shared admin UI read from the root `.env` file.

## 1) Create the local env file

From the project root:

```bash
cp .env.example .env
```

Then edit it:

```bash
vim .env
```

Do not commit `.env`. The same file is shared by the website, attendance service, and bot runtime.

---

## 2) Shared runtime and path settings

### `DATABASE_URL`

PostgreSQL connection string used by the bot API and worker.

Example:

```bash
DATABASE_URL=postgresql://<username>:<password>@<host>:5432/<database>
```

### `REDIS_URL`

Redis connection string used by BullMQ.

Example:

```bash
REDIS_URL=redis://<host>:6379
```

### `BOT_PORT`, `BOT_HOST`, `BOT_TIMEZONE`

The bot listens on `BOT_PORT` and `BOT_HOST`. Keep `BOT_TIMEZONE=Africa/Lagos` unless you are running a deliberate test setup.

### `APP_DATA_DIR`, `APP_PUBLIC_DIR`, `APP_DIST_DIR`

Storage path overrides for data, public assets, and the build output.

### `DB_PASSWORD`

Used by Docker Compose and the preflight fallback when a database URL is not provided.

### `ENABLE_SCHEDULER`

Set `true` in production. Leave it `false` when you do not want reminders to send.

### `PUBLIC_SITE_BASE_URL`, `BOT_PUBLIC_BASE_URL`

Used when the bot builds public links, QR codes, and HTTPS verification targets.

### `APP_BASE_PATH`, `PUBLIC_APP_BASE_PATH`, `VITE_APP_BASE_PATH`

Use these when the website is served under a subpath such as `/fgc-testing/`.

### `VITE_API_BASE_URL`, `VITE_BOT_API_URL`, `VITE_ATTENDANCE_API_URL`, `VITE_LIVE_STREAM_URL`

Frontend overrides for API and media URLs. Leave them blank when the app can use same-origin or dev-server proxies.

---

## 3) Admin and attendance secrets

### `BOT_ADMIN_API_KEY`

Primary secret for bot admin endpoints. The bot rejects weak placeholders like `admin123` and `replace_me`.

### `VITE_ENABLE_ADMIN_FALLBACK_LOGIN`

Set `true` only for local development if you want the browser fallback login.

### `VITE_ADMIN_EMAIL`, `VITE_ADMIN_PASSWORD`

Local browser fallback login values. The browser can store its own override in `localStorage`, but these give you a starting point.

### `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`

Seed values for the web admin account when no users exist yet.

### `ADMIN_EMAIL`, `ADMIN_PASSWORD`

Legacy aliases the web admin seed still reads. Keep them empty unless you need the override.

### `ATTENDANCE_PORT`, `ATTENDANCE_PUBLIC_BASE_URL`, `ATTENDANCE_TEST_OPEN`

Attendance service runtime and testing flags.

### `ATTENDANCE_HISTORY_API_URL`

Where the attendance service posts session and check-in history back to the bot.

### `ATTENDANCE_HISTORY_SYNC_KEY`

Shared secret sent as `x-attendance-sync-key` when the attendance service mirrors history back to the bot.

### `ATTENDANCE_ADMIN_KEY`, `ATTENDANCE_ADMIN_PASSWORD`, `VITE_ATTENDANCE_ADMIN_KEY`

Fallback admin credentials for the attendance UI and route guards.

---

## 4) WhatsApp and Meta Cloud API

### `WHATSAPP_PROVIDER`

Use `meta` in production. Use `stub` when you want the bot to log messages without sending them.

### `WHATSAPP_FALLBACK_PROVIDER`

Fallback provider when the primary WhatsApp provider is not available. `stub` is the safe default.

### `META_ACCESS_TOKEN`

Long-lived System User token from Meta Business Manager.

### `META_PHONE_NUMBER_ID`

Phone Number ID for your WhatsApp-enabled business number.

### `META_WABA_ID`

WhatsApp Business Account ID.

### `META_WEBHOOK_VERIFY_TOKEN`

Secret string you choose for webhook verification.

### `META_APP_SECRET`

App Secret from Meta Developer App settings.

### `META_API_VERSION`

Graph API version to use. The current default is `v21.0`.

Webhook callback URL:

```text
https://<your-domain>/bot/webhooks/whatsapp
```

Subscribe the app to the `messages` field.

---

## 5) LLM providers

Provider resolution order when `LLM_PROVIDER=auto`:
1. Vertex AI Gemini, if `VERTEX_PROJECT_ID` is set.
2. OpenAI, if `OPENAI_API_KEY` is set.
3. Google Gemini direct API, if `GEMINI_API_KEY` is set.
4. Static templates, if no provider is available.

Set `LLM_PROVIDER=none` to skip provider calls and use static templates only.

### `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_MODEL`, `VERTEX_SERVICE_ACCOUNT_JSON`

Vertex AI is the preferred production path. Create a service account with Vertex AI access, then paste the JSON key into `VERTEX_SERVICE_ACCOUNT_JSON` or mount it as a file and leave the variable empty.

### `OPENAI_API_KEY`, `OPENAI_MODEL`

Set these if you want the bot to use OpenAI as a provider fallback.

### `GEMINI_API_KEY`, `GEMINI_MODEL`

Set these if you want the bot to use the Gemini direct API fallback.

---

## 6) Giving, monitoring, and optional integrations

### Giving

- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `GIVING_CURRENCY`
- `GIVING_CALLBACK_URL`
- `GIVING_BANK_ACCOUNTS_JSON`
- `GIVING_BANK_TRANSFER_ACCOUNTS_JSON`
- `GIVING_BANKS_JSON`
- `GIVING_BANK_OPTIONS_JSON`
- `GIVING_BANK_NAME`
- `GIVING_BANK_ACCOUNT_NAME`
- `GIVING_BANK_ACCOUNT_NUMBER`
- `GIVING_BANK_TRANSFER_INSTRUCTIONS`
- `GIVING_BANK_DETAILS_JSON`
- `GIVING_CRYPTO_WALLET_ADDRESS`
- `GIVING_CRYPTO_RPC_URL`
- `ETHERSCAN_API_KEY`
- `ETHEREUM_WALLET_ADDRESS`
- `BITCOIN_WALLET_ADDRESS`
- `SEPOLIA_RPC_URL`
- `CRYPTO_WALLET_ADDRESS`

### Monitoring and sidecar

- `ALERT_WEBHOOK_URL`
- `MONITORING_SLOW_QUERY_MS`
- `MONITORING_SLOW_REQUEST_MS`
- `OPENCLAW_HOOK_URL`
- `OPENCLAW_HOOK_TOKEN`
- `OPENCLAW_HOOK_MODE`
- `OPENCLAW_HOOK_TIMEOUT_MS`
- `VITE_RUM_ENABLED`
- `VITE_RUM_ENDPOINT`

### Tooling helpers

- `TARGET_URL`
- `TEMP_DB_NAME`
- `PERF_REQUESTS`
- `PERF_P95_MS`

### Public content and contact helpers

- `YOUTUBE_API_KEY`
- `YOUTUBE_CHANNEL_ID`
- `CONTACT_AUTORESPONSE_WEBHOOK_URL`
- `CONTACT_ADMIN_NOTIFICATION_WEBHOOK_URL`
- `SOCIAL_LINK_FACEBOOK`
- `SOCIAL_LINK_INSTAGRAM`
- `SOCIAL_LINK_YOUTUBE`
- `SOCIAL_LINK_X`
- `SOCIAL_LINK_TIKTOK`

---

## 7) Minimal example

```bash
BOT_PORT=4100
BOT_HOST=0.0.0.0
BOT_TIMEZONE=Africa/Lagos
DATABASE_URL=postgresql://user:password@localhost:5432/church_bot
REDIS_URL=redis://127.0.0.1:6379
BOT_ADMIN_API_KEY=replace_me_with_a_long_secret
ENABLE_SCHEDULER=false
WHATSAPP_PROVIDER=stub
LLM_PROVIDER=auto
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
META_ACCESS_TOKEN=EAA...
META_PHONE_NUMBER_ID=123456789012345
META_WEBHOOK_VERIFY_TOKEN=fgc-upperroom-webhook-2026
```

The full template lives in [`.env.example`](../.env.example).

---

## 8) Validate configuration

From the project root:

```bash
npm run bot:validate
```

If it passes, start the services:

```bash
pm2 start bot/src/index.js --name church-bot-api
pm2 start bot/src/worker.js --name church-bot-worker
```

---

## 9) Security basics

- Never commit real keys to git.
- Keep `.env.example` and the three files under `env/` aligned.
- Rotate provider keys regularly.
- Use a secrets manager in production.
- If a key leaks, rotate it and redeploy.
