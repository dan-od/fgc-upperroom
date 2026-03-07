# Production Deployment Runbook

> Complete guide for deploying the Church WhatsApp Bot to production

---

## Pre-Deployment Checklist

### 1. Infrastructure Requirements

- [ ] PostgreSQL database (v12+)
- [ ] Redis instance (v6+)
- [ ] Node.js runtime (v18+)
- [ ] SSL certificate for HTTPS
- [ ] Domain/subdomain for bot API

### 2. Third-Party Services

- [ ] Meta Developer App
  - WhatsApp Business Account linked
  - System User token generated
  - Phone Number ID and WABA ID noted
  - Webhook URL registered
- [ ] LLM provider (at least one):
  - Vertex AI service account (preferred)
  - OpenAI API key
  - Google Gemini API key
- [ ] (Optional) Alert webhook URL (Slack, Discord, etc.)

### 3. Security

- [ ] Secrets manager configured (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Database credentials rotated
- [ ] API authentication/authorization plan
- [ ] Rate limiting configured
- [ ] CORS properly configured

---

## Deployment Steps

### Step 1: Database Setup

```bash
# Connect to production database
psql $DATABASE_URL

# Run schema
\i bot/db/schema.sql

# Verify tables
\dt

# Create indexes
# (already in schema.sql, verify they exist)
\di

# Exit
\q
```

**Verify**:
```bash
npm run bot:validate
```

### Step 2: Environment Configuration

Create `.env` file (or configure in hosting platform):

```bash
# Server
NODE_ENV=production
BOT_PORT=4100
BOT_HOST=0.0.0.0
BOT_TIMEZONE=Africa/Lagos

# Database
DATABASE_URL=postgresql://user:password@host:5432/church_bot

# Redis
REDIS_URL=redis://user:password@host:6379

# Scheduler
ENABLE_SCHEDULER=true

# WhatsApp (Meta Cloud API)
WHATSAPP_PROVIDER=meta
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=123456789012345
META_WABA_ID=987654321098765
META_WEBHOOK_VERIFY_TOKEN=fgc-upperroom-webhook-2026
META_APP_SECRET=abcdef1234567890abcdef1234567890
META_API_VERSION=v21.0

# LLM — set LLM_PROVIDER=auto to try all in order: vertex → openai → gemini → static
LLM_PROVIDER=auto

# Option A: Vertex AI Gemini (preferred — service account, no per-call cost)
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
VERTEX_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Option B: OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Option C: Google Gemini direct API
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.5-flash

# Monitoring (optional)
ALERT_WEBHOOK_URL=https://your-webhook-url
```

**Security best practices**:
- Never commit `.env` to version control
- Use secrets manager in production
- Rotate credentials quarterly
- Use read-only database user for reporting queries

### Step 3: Install Dependencies

```bash
npm ci --production
```

### Step 4: Run Pre-Flight Validation

```bash
npm run bot:validate
```

Expected output:
```
✅ All checks passed! Ready to deploy.
```

If warnings appear, review and determine if blocking.

### Step 5: Start Services

#### Option A: Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start API server
pm2 start bot/src/index.js --name church-bot-api

# Start worker
pm2 start bot/src/worker.js --name church-bot-worker

# Save configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

#### Option B: Docker

```bash
# Build image
docker build -t church-bot:latest -f bot/Dockerfile .

# Run API
docker run -d \
  --name church-bot-api \
  --env-file .env \
  -p 4100:4100 \
  church-bot:latest \
  node bot/src/index.js

# Run worker
docker run -d \
  --name church-bot-worker \
  --env-file .env \
  church-bot:latest \
  node bot/src/worker.js
```

#### Option C: Systemd Service

Create `/etc/systemd/system/church-bot-api.service`:

```ini
[Unit]
Description=Church WhatsApp Bot API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=botuser
WorkingDirectory=/opt/church-bot
EnvironmentFile=/opt/church-bot/.env
ExecStart=/usr/bin/node bot/src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/church-bot-worker.service`:

```ini
[Unit]
Description=Church WhatsApp Bot Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=botuser
WorkingDirectory=/opt/church-bot
EnvironmentFile=/opt/church-bot/.env
ExecStart=/usr/bin/node bot/src/worker.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable church-bot-api church-bot-worker
sudo systemctl start church-bot-api church-bot-worker
sudo systemctl status church-bot-api church-bot-worker
```

### Step 6: Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name bot.yourchurch.org;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /bot/ {
        proxy_pass http://localhost:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Reload Nginx:
```bash
sudo nginx -t && sudo nginx -s reload
```

### Step 7: Configure Meta Webhooks

In Meta Developer App → **WhatsApp → Configuration**:

1. **Callback URL**: `https://bot.yourchurch.org/bot/webhooks/whatsapp`
2. **Verify Token**: the value of your `META_WEBHOOK_VERIFY_TOKEN`
3. **Webhook Fields**: subscribe to `messages`
4. Click **Verify and Save** — your server responds to the GET challenge automatically.

> The single `/bot/webhooks/whatsapp` route handles inbound messages, delivery statuses, and verification.
> The old separate `/bot/webhooks/status` route is retired (Meta sends statuses in the same payload as messages).

### Step 8: Verify Deployment

```bash
# Health check
curl https://bot.yourchurch.org/bot/health

# Expected response:
# {"status":"ok","service":"church-whatsapp-bot","timezone":"Africa/Lagos","now":"..."}

# Monitoring health
curl https://bot.yourchurch.org/bot/monitoring/health

# Check system stats
curl https://bot.yourchurch.org/bot/api/admin/stats
```

### Step 9: Import Initial Data

```bash
# Import visitor list
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@visitors.csv" \
  https://bot.yourchurch.org/bot/api/import-csv

# Create first event
curl -X POST https://bot.yourchurch.org/bot/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Easter Service",
    "description": "Celebrate the resurrection",
    "eventDate": "2026-04-12",
    "eventTime": "09:00",
    "location": "Church Main Hall"
  }'
```

### Step 10: Test Message Preview

```bash
# Preview service reminder
curl -X POST https://bot.yourchurch.org/bot/api/preview/service \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "serviceTime": "08:00",
    "isFirstSunday": false
  }'
```

---

## Post-Deployment Monitoring

### Health Checks

Set up automated monitoring (every 5 minutes):

```bash
#!/bin/bash
HEALTH_URL="https://bot.yourchurch.org/bot/monitoring/health"
ALERT_URL="your-slack-webhook-or-pagerduty"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$RESPONSE" != "200" ]; then
  curl -X POST $ALERT_URL -d '{"text":"🚨 Church Bot health check failed"}'
fi
```

### Recommended Metrics

- Message delivery rate (target: >95%)
- Message failure rate (alert if >5%)
- Queue depth (alert if >100 pending)

### Database Backup

```bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
```

---

## Rollback Procedure

If deployment fails or critical bug discovered:

### Quick Rollback

```bash
# PM2
pm2 stop church-bot-api church-bot-worker
git checkout <previous-stable-tag>
npm ci --production
pm2 restart church-bot-api church-bot-worker

# Docker
docker stop church-bot-api church-bot-worker
docker run ... church-bot:<previous-tag>

# Systemd
sudo systemctl stop church-bot-api church-bot-worker
git checkout <previous-stable-tag>
npm ci --production
sudo systemctl start church-bot-api church-bot-worker
```

### Database Rollback

```bash
# Restore from backup
gunzip < backup-YYYYMMDD.sql.gz | psql $DATABASE_URL
```

---

## Troubleshooting

### Messages Not Sending

1. Check Meta credentials:
   ```bash
   curl -s "https://graph.facebook.com/$META_API_VERSION/me?access_token=$META_ACCESS_TOKEN" | jq .
   ```

2. Check worker logs:
   ```bash
   pm2 logs church-bot-worker --lines 100
   ```

3. Check message status in database:
   ```sql
   SELECT status, error, COUNT(*) 
   FROM messages 
   WHERE sent_time >= NOW() - INTERVAL '1 hour'
   GROUP BY status, error;
   ```

### Scheduler Not Running

1. Verify `ENABLE_SCHEDULER=true` in env
2. Check cron syntax and timezone:
   ```bash
   pm2 logs church-bot-api | grep "Scheduler jobs registered"
   ```

3. Manually trigger job:
   ```bash
   # Add test endpoint or use queue directly
   curl -X POST https://bot.yourchurch.org/bot/api/admin/trigger-service-reminder
   ```

### High Failure Rate

1. Check error summary:
   ```bash
   curl https://bot.yourchurch.org/bot/monitoring/errors
   ```

2. Review message logs:
   ```bash
   curl "https://bot.yourchurch.org/bot/api/messages?status=failed&limit=50"
   ```

3. Check LLM provider status (Vertex / OpenAI / Gemini)
4. Check Meta rate limit tier (Tier 1 = 1,000 conversations/24h)

### Database Connection Issues

1. Check connection pool:
   ```sql
   SELECT * FROM pg_stat_activity WHERE datname = 'church_bot';
   ```

2. Verify connection string
3. Check firewall rules
4. Review max connections: `SHOW max_connections;`

---

**End of Runbook** — See [README.md](README.md) and [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for more context.
