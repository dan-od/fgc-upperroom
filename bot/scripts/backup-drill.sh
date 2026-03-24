#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_ROOT="${DRILL_REPORT_DIR:-$ROOT_DIR/bot/drills}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="$REPORT_ROOT/$STAMP"

mkdir -p "$OUT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup-drill] DATABASE_URL is required."
  exit 1
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[backup-drill] REDIS_URL is required."
  exit 1
fi

for cmd in psql pg_dump redis-cli redis-server node sed; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[backup-drill] Missing required command: $cmd"
    exit 1
  fi
done

SOURCE_DB_NAME="$(psql "$DATABASE_URL" -Atqc "SELECT current_database();")"
TEMP_DB_NAME="${SOURCE_DB_NAME}_drill_${STAMP//-/}"
export DATABASE_URL
export TEMP_DB_NAME
TEMP_DB_URL="$(node -e "const u=new URL(process.env.DATABASE_URL);u.pathname='/' + process.env.TEMP_DB_NAME;process.stdout.write(u.toString())")"

POSTGRES_BACKUP_FILE="$OUT_DIR/postgres.sql"
POSTGRES_SANITIZED_FILE="$OUT_DIR/postgres.sanitized.sql"
REDIS_BACKUP_FILE="$OUT_DIR/redis.rdb"
REPORT_FILE="$OUT_DIR/drill-report.md"
JSON_FILE="$OUT_DIR/drill-report.json"

REDIS_DRILL_PORT=""

cleanup() {
  if [[ -n "$REDIS_DRILL_PORT" ]]; then
    redis-cli -p "$REDIS_DRILL_PORT" shutdown nosave >/dev/null 2>&1 || true
  fi

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TEMP_DB_NAME' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$TEMP_DB_NAME\";" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "[backup-drill] Starting PostgreSQL backup..."
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-privileges --file="$POSTGRES_BACKUP_FILE"

echo "[backup-drill] Creating temporary drill database: $TEMP_DB_NAME"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$TEMP_DB_NAME\";"

echo "[backup-drill] Restoring PostgreSQL backup into drill database..."
sed '/^SET transaction_timeout = 0;$/d' "$POSTGRES_BACKUP_FILE" > "$POSTGRES_SANITIZED_FILE"
psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -f "$POSTGRES_SANITIZED_FILE" >/dev/null

declare -a TABLES=("visitors" "events" "messages" "opt_outs" "scheduled_jobs")
declare -a TABLE_COUNTS=()
TABLE_MISMATCH="false"

for table in "${TABLES[@]}"; do
  SRC_COUNT="$(psql "$DATABASE_URL" -Atqc "SELECT COUNT(*) FROM $table;")"
  DRILL_COUNT="$(psql "$TEMP_DB_URL" -Atqc "SELECT COUNT(*) FROM $table;")"
  TABLE_COUNTS+=("{\"table\":\"$table\",\"source\":$SRC_COUNT,\"drill\":$DRILL_COUNT}")

  if [[ "$SRC_COUNT" != "$DRILL_COUNT" ]]; then
    TABLE_MISMATCH="true"
  fi
done

echo "[backup-drill] Creating Redis backup snapshot..."
redis-cli -u "$REDIS_URL" --rdb "$REDIS_BACKUP_FILE" >/dev/null

SOURCE_REDIS_DBSIZE="$(redis-cli -u "$REDIS_URL" DBSIZE | tr -d '\r')"

for port in {6381..6395}; do
  if ! redis-cli -p "$port" ping >/dev/null 2>&1; then
    REDIS_DRILL_PORT="$port"
    break
  fi
done

if [[ -z "$REDIS_DRILL_PORT" ]]; then
  echo "[backup-drill] Could not find a free local Redis port between 6381 and 6395."
  exit 1
fi

echo "[backup-drill] Starting temporary Redis restore instance on port $REDIS_DRILL_PORT..."
redis-server \
  --bind 127.0.0.1 \
  --port "$REDIS_DRILL_PORT" \
  --save "" \
  --appendonly no \
  --dir "$OUT_DIR" \
  --dbfilename "$(basename "$REDIS_BACKUP_FILE")" \
  --daemonize yes \
  --logfile "$OUT_DIR/redis-drill.log" >/dev/null

for _ in {1..20}; do
  if redis-cli -p "$REDIS_DRILL_PORT" ping >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! redis-cli -p "$REDIS_DRILL_PORT" ping >/dev/null 2>&1; then
  echo "[backup-drill] Temporary Redis restore instance did not become ready."
  exit 1
fi

DRILL_REDIS_DBSIZE="$(redis-cli -p "$REDIS_DRILL_PORT" DBSIZE | tr -d '\r')"

POSTGRES_BACKUP_SIZE="$(wc -c < "$POSTGRES_BACKUP_FILE")"
REDIS_BACKUP_SIZE="$(wc -c < "$REDIS_BACKUP_FILE")"

PASS="true"

if [[ "$TABLE_MISMATCH" == "true" ]]; then
  PASS="false"
fi

if [[ "$SOURCE_REDIS_DBSIZE" != "$DRILL_REDIS_DBSIZE" ]]; then
  PASS="false"
fi

TABLE_COUNTS_JSON="["
for i in "${!TABLE_COUNTS[@]}"; do
  TABLE_COUNTS_JSON+="${TABLE_COUNTS[$i]}"
  if [[ "$i" -lt $((${#TABLE_COUNTS[@]} - 1)) ]]; then
    TABLE_COUNTS_JSON+=","
  fi
done
TABLE_COUNTS_JSON+="]"

cat > "$JSON_FILE" <<EOF
{
  "timestampUtc": "$STAMP",
  "sourceDatabase": "$SOURCE_DB_NAME",
  "temporaryDatabase": "$TEMP_DB_NAME",
  "postgresBackupFile": "$POSTGRES_BACKUP_FILE",
  "postgresBackupBytes": $POSTGRES_BACKUP_SIZE,
  "redisBackupFile": "$REDIS_BACKUP_FILE",
  "redisBackupBytes": $REDIS_BACKUP_SIZE,
  "sourceRedisDbsize": $SOURCE_REDIS_DBSIZE,
  "drillRedisDbsize": $DRILL_REDIS_DBSIZE,
  "tableCounts": $TABLE_COUNTS_JSON,
  "pass": $PASS
}
EOF

{
  echo "# Backup + Restore Drill Report"
  echo
  echo "- Timestamp (UTC): \`$STAMP\`"
  echo "- Source DB: \`$SOURCE_DB_NAME\`"
  echo "- Temporary DB: \`$TEMP_DB_NAME\`"
  echo "- PostgreSQL backup: \`$POSTGRES_BACKUP_FILE\` (\`$POSTGRES_BACKUP_SIZE\` bytes)"
  echo "- Redis backup: \`$REDIS_BACKUP_FILE\` (\`$REDIS_BACKUP_SIZE\` bytes)"
  echo "- Redis DB size: source=\`$SOURCE_REDIS_DBSIZE\`, drill=\`$DRILL_REDIS_DBSIZE\`"
  echo
  echo "## PostgreSQL Table Counts"
  echo
  echo "| Table | Source | Drill |"
  echo "| --- | ---: | ---: |"
  for table in "${TABLES[@]}"; do
    src="$(psql "$DATABASE_URL" -Atqc "SELECT COUNT(*) FROM $table;")"
    drill="$(psql "$TEMP_DB_URL" -Atqc "SELECT COUNT(*) FROM $table;")"
    echo "| $table | $src | $drill |"
  done
  echo
  if [[ "$PASS" == "true" ]]; then
    echo "## Result"
    echo
    echo "PASS"
  else
    echo "## Result"
    echo
    echo "FAIL"
  fi
} > "$REPORT_FILE"

echo "[backup-drill] Drill complete. Report written to:"
echo "  - $REPORT_FILE"
echo "  - $JSON_FILE"

if [[ "$PASS" != "true" ]]; then
  echo "[backup-drill] Validation failed."
  exit 1
fi
