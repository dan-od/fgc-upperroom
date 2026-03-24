# Operations (P3)

## QA Commands

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run qa:accessibility
npm run qa:security
npm run qa:performance
npm run qa:load -- 25
npm run openclaw:hook:test
```

CI/CD runs these in `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.
Browser/accessibility matrix is tracked in `ACCESSIBILITY_BROWSER_MATRIX.md`.

## Observability Endpoints

Bot:
- `GET /bot/health`
- `GET /bot/monitoring/health`
- `GET /bot/monitoring/alerts`
- `GET /bot/monitoring/errors?hours=24`
- `GET /bot/monitoring/metrics`

Web API:
- `POST /api/observability/rum`
- `GET /api/observability/rum`

OpenClaw hook target (optional):
- `POST ${OPENCLAW_HOOK_URL}` (default expected by template: `/hooks/wake`)

## API Examples

Create visitor:
```http
POST /bot/api/visitors
Content-Type: application/json

{"name":"Ada Obi","phoneNumber":"08012345678","email":"ada@example.com"}
```
```json
{
  "id": "uuid",
  "phone_number": "+2348012345678",
  "email": "ada@example.com",
  "duplicateRulesApplied": ["exact_phone","exact_email","name_plus_last7_phone"]
}
```

Update visitor reminder preferences:
```http
PATCH /bot/api/visitors/{phoneNumber}/reminder-preferences
Content-Type: application/json

{
  "reminderPreferences": {
    "eventReminderFrequency": "key-dates",
    "eventIds": ["event-id-1", "event-id-2"],
    "serviceReminders": true,
    "eventReminders": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "21:00",
    "quietHoursEnd": "07:00",
    "preferredDeliveryHour": 9
  }
}
```
```json
{
  "ok": true,
  "phoneNumber": "+2348012345678",
  "reminderPreferences": {
    "eventReminderFrequency": "key-dates",
    "eventIds": ["event-id-1", "event-id-2"],
    "serviceReminders": true,
    "eventReminders": true
  }
}
```

Upsert message template (admin):
```http
PUT /bot/api/admin/templates/event_reminder
x-bot-admin-key: <BOT_ADMIN_API_KEY>
Content-Type: application/json

{
  "content": "Hi {{name}}, {{eventTitle}} is on {{eventDate}}. {{registrationLine}} Reply STOP to opt out.",
  "channel": "whatsapp",
  "isActive": true
}
```

Upsert holiday exception (admin):
```http
PUT /bot/api/admin/holidays
x-bot-admin-key: <BOT_ADMIN_API_KEY>
Content-Type: application/json

{
  "holidayDate": "2026-12-25",
  "holidayName": "Christmas Day",
  "timezone": "*",
  "skipReminders": true
}
```

Create event RSVP:
```http
POST /bot/api/events/{eventId}/rsvp
Content-Type: application/json

{"fullName":"Ada Obi","phoneNumber":"08012345678","status":"going"}
```
```json
{"ok":true,"message":"RSVP saved successfully.","rsvp":{"status":"going"}}
```

RUM metric intake:
```http
POST /api/observability/rum
Content-Type: application/json

{"metric":"LCP","value":2345.4,"rating":"good","page":"https://.../events"}
```
```json
{"ok":true}
```

Admin login:
```http
POST /api/admin/auth/login
Content-Type: application/json

{"email":"admin@upperroom.local","password":"ChangeMe1234","otpCode":"123456"}
```
```json
{"ok":true,"token":"...","user":{"id":"...","role":"super_admin"}}
```

Admin audit read:
```http
GET /api/admin/audit-log
Authorization: Bearer <admin-session-token>
```

## DB Schema Notes

Main entities:
- `visitors` -> parent for messaging and identity.
- `events` -> parent for `event_rsvps`.
- `messages` -> send logs (status, provider id, errors).
- `message_templates` -> dynamic outbound/inbound message templates.
- `holiday_exceptions` -> holiday reminder suppression/deferral rules.
- `conversation_feedback` -> inbound feedback capture.
- `member_profiles` -> lifecycle state (`new|active|inactive|moved`).
- `prayer_requests`, `event_rsvps` -> soft delete + purge windows.
- `visitor_duplicates` -> duplicate review queue.
- `attendance_sessions`, `attendance_checkins` -> attendance history.

Lifecycle:
- Create: normal insert/upsert.
- Soft delete: `deleted_at`, `deleted_reason`, `purge_after`.
- Erase/redact: privacy endpoint masks visitor PII.
- Purge: retention job deletes rows past `purge_after`.

## Troubleshooting Runbook

- `npm run env:parity` to check env drift.
- `npm run bot:validate` for DB/Redis/env readiness.
- `GET /bot/monitoring/health` for DB/Redis/failure rate state.
- `GET /bot/monitoring/alerts` for spike/backlog/latency alerts.
- `GET /bot/monitoring/errors` for top failed message errors.
- `GET /api/observability/rum` for frontend perf summary.
- `npm run ops:backup-drill` for backup/restore check.
- `npm run ops:verify-https` for TLS/HTTPS check.

## Security Baseline

- Bot admin endpoints require `x-bot-admin-key` (`BOT_ADMIN_API_KEY`).
- Web admin authentication uses `/api/admin/auth/*` with role-based sessions.
- Seed web admin identity via:
  - `ADMIN_DEFAULT_EMAIL`
  - `ADMIN_DEFAULT_PASSWORD`
- Web admin supports TOTP 2FA and password reset flow endpoints.
- Bot + API emit structured logs (JSON).
- Bot security headers enabled (`nosniff`, frame deny, referrer policy, permissions policy, CSP).
- API security headers enabled (`nosniff`, frame, referrer, permissions).
- Slow request/query thresholds are configurable:
  - `MONITORING_SLOW_QUERY_MS`
  - `MONITORING_SLOW_REQUEST_MS`
- Frontend RUM is configurable:
  - `VITE_RUM_ENABLED`
  - `VITE_RUM_ENDPOINT`
- OpenClaw hook auth uses bearer token:
  - `OPENCLAW_HOOK_TOKEN`
- OpenClaw integration files:
  - `openclaw/gateway.example.jsonc`
  - `openclaw/bot-api-policy.json`
