# Backup and Recovery Guide

This runbook defines the minimum backup policy for the bot's stateful services:

- PostgreSQL (`visitors`, `events`, `messages`, `opt_outs`, `scheduled_jobs`)
- Redis (BullMQ queue state and delayed jobs)

## 1) Backup Policy

### PostgreSQL

- Full backup: daily at 01:00 WAT
- Retention: 30 daily backups + 12 monthly backups
- Off-site copy: required (object storage in another region/account)
- Encryption: at rest and in transit

### Redis

- Persistence: enable both AOF (`appendonly yes`) and periodic RDB snapshots
- Snapshot copy: daily archive of Redis persistence files
- Retention: 7-14 days for queue recovery use-cases

## 2) PostgreSQL Backup Command

```bash
#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="/var/backups/fgc-upperroom/postgres"
mkdir -p "$OUT_DIR"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="$OUT_DIR/church_bot-$STAMP.dump"
```

Restore:

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --dbname "$DATABASE_URL" \
  /path/to/church_bot-YYYYMMDD-HHMMSS.dump
```

## 3) Redis Backup Command

If using containerized Redis with volumes:

```bash
#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="/var/backups/fgc-upperroom/redis"
mkdir -p "$OUT_DIR"

redis-cli -u "$REDIS_URL" BGSAVE
sleep 3

# Copy redis persistence files from your volume mount path
cp /var/lib/redis/dump.rdb "$OUT_DIR/dump-$STAMP.rdb"
cp /var/lib/redis/appendonly.aof "$OUT_DIR/appendonly-$STAMP.aof" 2>/dev/null || true
```

## 4) Recovery Drill (Monthly)

1. Restore latest PostgreSQL backup to a disposable environment.
2. Restore Redis snapshot/AOF to the same environment.
3. Run:

```bash
npm run bot:validate
curl http://localhost:4100/bot/health
curl http://localhost:4100/bot/monitoring/health
```

4. Verify that:
- expected tables and row counts are present
- queue workers start without fatal errors
- admin stats endpoint returns data

### Automated Local Drill

Run the scripted drill (backs up PostgreSQL + Redis, restores to disposable targets, compares counts, and writes a report):

```bash
npm run ops:backup-drill
```

Output reports are written to:

- `bot/drills/<timestamp>/drill-report.md`
- `bot/drills/<timestamp>/drill-report.json`

Record outcomes in `bot/DRILL_LOG.md` after each drill.

## 5) HTTPS/SSL Verification Checklist

For production bot domain (example: `https://bot.yourchurch.org`):

```bash
curl -I https://bot.yourchurch.org/bot/health
openssl s_client -connect bot.yourchurch.org:443 -servername bot.yourchurch.org </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer -subject
```

Confirm:
- certificate validity window is active
- issuer is trusted
- reverse proxy serves `200` for `/bot/health`

Keep certificate auto-renewal enabled (for example with `certbot renew` timer).

### Automated HTTPS/SSL Check

```bash
BOT_PUBLIC_BASE_URL=https://bot.yourchurch.org npm run ops:verify-https
```

Output reports are written to:

- `bot/drills/ssl/ssl-check-<timestamp>.md`
- `bot/drills/ssl/ssl-cert-<timestamp>.txt`

Record pass/fail and cert expiry in `bot/DRILL_LOG.md`.
