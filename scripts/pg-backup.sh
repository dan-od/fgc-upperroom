#!/usr/bin/env bash
# =============================================================================
# scripts/pg-backup.sh — PostgreSQL daily backup with 7-day rotation
#
# USAGE
#   BACKUP_DIR=/opt/backups DATABASE_URL=postgresql://... bash scripts/pg-backup.sh
#
#   Environment variables:
#     DATABASE_URL  — required. PostgreSQL connection string.
#     BACKUP_DIR    — optional. Where to write backups (default: <repo-root>/backups).
#     KEEP_DAYS     — optional. Number of daily backups to retain (default: 7).
#     BACKUP_KEY_FILE — optional. Path to GPG passphrase file (enables AES-256 encryption).
#                       Default: /run/secrets/backup_key (Docker secrets mount point).
#                       If the file does not exist, backups are stored unencrypted.
#
# RESTORE (unencrypted)
#   gunzip -c /opt/backups/church_bot_20260119_020000.sql.gz | psql "$DATABASE_URL"
#
# RESTORE (encrypted)
#   gpg --decrypt --passphrase-file /run/secrets/backup_key --batch \
#       /opt/backups/church_bot_20260119_020000.sql.gz.gpg \
#     | gunzip | psql "$DATABASE_URL"
#
#   To list available backups:
#     ls -lh /opt/backups/church_bot_*.sql.gz*
#
# HOST CRON EXAMPLE (daily at 2 AM Lagos time, UTC+1)
#   0 1 * * * BACKUP_DIR=/opt/backups DATABASE_URL=postgresql://botuser:pass@localhost:5433/church_bot \
#     /opt/fgc-upper-room/scripts/pg-backup.sh >> /var/log/pg-backup.log 2>&1
#
# DOCKER
#   The pg-backup service in bot/docker-compose.yml runs this script automatically
#   on a 24-hour loop. Backups are written to bot/backups/ inside the repo.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/../backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
DB_URL="${DATABASE_URL:-}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/run/secrets/backup_key}"

if [ -z "$DB_URL" ]; then
  echo "[pg-backup] ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/church_bot_${TIMESTAMP}.sql.gz"

echo "[pg-backup] Starting backup — $(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -f "$BACKUP_KEY_FILE" ]; then
  ENCRYPTED_FILE="${BACKUP_FILE}.gpg"
  pg_dump "$DB_URL" \
    | gzip \
    | gpg --symmetric --cipher-algo AES256 \
          --passphrase-file "$BACKUP_KEY_FILE" \
          --batch --yes \
          --output "$ENCRYPTED_FILE"
  echo "[pg-backup] Saved (encrypted): $ENCRYPTED_FILE ($(du -sh "$ENCRYPTED_FILE" | cut -f1))"
  BACKUP_FILE="$ENCRYPTED_FILE"
else
  pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"
  echo "[pg-backup] Saved (unencrypted): $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
  echo "[pg-backup] WARN: No backup key at $BACKUP_KEY_FILE — backup is unencrypted." >&2
fi

# Rotate: delete oldest files beyond KEEP_DAYS (handles both .sql.gz and .sql.gz.gpg)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "church_bot_*.sql.gz*" -type f | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$KEEP_DAYS" ]; then
  DELETE_COUNT=$(( BACKUP_COUNT - KEEP_DAYS ))
  find "$BACKUP_DIR" -name "church_bot_*.sql.gz*" -type f \
    | sort \
    | head -n "$DELETE_COUNT" \
    | xargs rm --
  echo "[pg-backup] Removed $DELETE_COUNT old backup(s), keeping $KEEP_DAYS."
fi

echo "[pg-backup] Done — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
