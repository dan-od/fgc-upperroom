#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_ROOT="${SSL_REPORT_DIR:-$ROOT_DIR/bot/drills/ssl}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

TARGET_URL="${1:-${BOT_PUBLIC_BASE_URL:-${VITE_BOT_API_URL:-}}}"
TARGET_URL="${TARGET_URL%/}"

if [[ -z "$TARGET_URL" ]]; then
  echo "Usage: BOT_PUBLIC_BASE_URL=https://bot.example.org npm run ops:verify-https"
  echo "   or: npm run ops:verify-https -- https://bot.example.org"
  exit 1
fi

if [[ "$TARGET_URL" != https://* ]]; then
  echo "[verify-https] TARGET_URL must start with https://"
  exit 1
fi

mkdir -p "$REPORT_ROOT"

REPORT_FILE="$REPORT_ROOT/ssl-check-$STAMP.md"
CERT_FILE="$REPORT_ROOT/ssl-cert-$STAMP.txt"
HEALTH_URL="$TARGET_URL/bot/health"

export TARGET_URL
TARGET_HOST="$(node -e "const u=new URL(process.env.TARGET_URL);process.stdout.write(u.hostname)")"
TARGET_PORT="$(node -e "const u=new URL(process.env.TARGET_URL);process.stdout.write(String(u.port || 443))")"

HTTP_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -I "$HEALTH_URL")"
CURL_OK="false"
if [[ "$HTTP_CODE" == "200" ]]; then
  CURL_OK="true"
fi

openssl s_client \
  -connect "$TARGET_HOST:$TARGET_PORT" \
  -servername "$TARGET_HOST" \
  </dev/null 2>/dev/null \
  | openssl x509 -noout -dates -issuer -subject > "$CERT_FILE"

NOT_BEFORE="$(grep '^notBefore=' "$CERT_FILE" | sed 's/^notBefore=//')"
NOT_AFTER="$(grep '^notAfter=' "$CERT_FILE" | sed 's/^notAfter=//')"
ISSUER="$(grep '^issuer=' "$CERT_FILE" | sed 's/^issuer=//')"
SUBJECT="$(grep '^subject=' "$CERT_FILE" | sed 's/^subject=//')"

{
  echo "# HTTPS/SSL Verification Report"
  echo
  echo "- Timestamp (UTC): \`$STAMP\`"
  echo "- Target URL: \`$TARGET_URL\`"
  echo "- Health endpoint: \`$HEALTH_URL\`"
  echo "- HTTP status (\`HEAD\`): \`$HTTP_CODE\`"
  echo "- Host: \`$TARGET_HOST\`"
  echo "- Port: \`$TARGET_PORT\`"
  echo
  echo "## Certificate"
  echo
  echo "- notBefore: \`$NOT_BEFORE\`"
  echo "- notAfter: \`$NOT_AFTER\`"
  echo "- issuer: \`$ISSUER\`"
  echo "- subject: \`$SUBJECT\`"
  echo
  echo "## Result"
  echo
  if [[ "$CURL_OK" == "true" ]]; then
    echo "PASS (HTTPS endpoint reachable with status 200)"
  else
    echo "FAIL (Expected HTTP 200 for /bot/health, got $HTTP_CODE)"
  fi
  echo
  echo "Raw certificate output saved to \`$CERT_FILE\`."
} > "$REPORT_FILE"

echo "[verify-https] SSL verification report written to:"
echo "  - $REPORT_FILE"
echo "  - $CERT_FILE"

if [[ "$CURL_OK" != "true" ]]; then
  exit 1
fi
