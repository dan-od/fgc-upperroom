# API & External Service Security Evaluation — FGC Upper Room Platform
**Date**: 2026-05-20
**Evaluator**: Claude Code (automated)
**Framework Version**: api-security-v1

---

## Executive Summary

**Overall Weighted Score**: 6.4 / 10
**Critical Findings (score 1–2)**: 1
**Poor Findings (score 3–4)**: 5

Since the general security evaluation of 2026-05-19, two major improvements have been landed: the Meta WhatsApp webhook now verifies `X-Hub-Signature-256` with timing-safe comparison (`bot/src/app.js:108-128`), and the admin login endpoint now applies rate limiting via a reusable `createRateLimit` middleware (`src/api/admin.auth.ts:14`). These were previously rated Critical. The platform's API surface is now meaningfully more defensible. Remaining critical gaps centre on the public-facing endpoint layer (contact form, newsletter subscribe, RUM observability endpoint — no rate limiting, no CAPTCHA), the complete absence of API versioning, and the fact that the `toGivingConfirmation` helper exposes donor email and phone in the public `/api/giving/confirm` and `/api/giving/abandon` responses without masking. One new Critical finding was identified: the bot admin routes (`/bot/api/events`, `/bot/api/members`, `/bot/api/admin/*`, etc.) use an in-handler `assertAdmin` call pattern that is susceptible to accidental bypass in future code paths, unlike the main API which enforces auth at middleware level. The Paystack integration is well-implemented. The LLM provider cascade is architecturally sound, though prompt injection protections are not formalized.

---

## Complete Endpoint Inventory

| Service | Path | Method | Auth | Rate Limit | Notes |
|---------|------|--------|------|------------|-------|
| Main API | `/api/giving/config` | GET | None | None | Public giving config; exposes public key |
| Main API | `/api/giving/initialize` | POST | None | 10/min/IP | Paystack init |
| Main API | `/api/giving/verify-crypto` | POST | None | None | Crypto payment verify |
| Main API | `/api/giving/confirm` | GET | None | None | Exposes donor PII (see pay-02) |
| Main API | `/api/giving/abandon` | POST | None | None | Exposes donor PII (see pay-02) |
| Main API | `/api/giving/webhook` | POST | HMAC-SHA512 | None | Paystack webhook |
| Main API | `/api/contact/submit` | POST | None | None | **No rate limit** |
| Main API | `/api/observability/rum` | POST | None | None | **No rate limit, no validation** |
| Main API | `/api/observability/rum` | GET | None | None | Public metrics read |
| Main API | `/api/blog` | GET | None | None | Public blog list |
| Main API | `/api/testimonies` | GET | None | None | Public testimonies list |
| Main API | `/api/live/status` | GET | None | None | Live stream status |
| Main API | `/api/vod` | GET | None | None | Video on demand |
| Main API | `/api/sermons` | GET | None | None | Sermons list |
| Main API | `/api/newsletter/subscribe` | POST | None | None | **No rate limit** |
| Main API | `/api/newsletter/sync-event` | POST | requireAdminAuth | None | Admin-only |
| Main API | `/api/newsletter/subscribers` | GET | requireAdminAuth | None | Admin-only |
| Main API | `/api/admin/auth/login` | POST | None → authRateLimit | 5/15min/IP | Rate limited |
| Main API | `/api/admin/auth/me` | GET | requireAdminAuth | None | Session check |
| Main API | `/api/admin/auth/logout` | POST | requireAdminAuth | None | Invalidates session |
| Main API | `/api/admin/auth/change-password` | POST | requireAdminAuth | None | |
| Main API | `/api/admin/auth/password-reset/request` | POST | None | None | No enumeration — always 200 |
| Main API | `/api/admin/auth/password-reset/confirm` | POST | None → authRateLimit | 5/15min/IP | Rate limited |
| Main API | `/api/admin/auth/2fa/setup` | POST | requireAdminAuth | None | |
| Main API | `/api/admin/auth/2fa/verify` | POST | requireAdminAuth | None | |
| Main API | `/api/admin/auth/2fa/disable` | POST | requireAdminAuth | None | |
| Main API | `/api/admin/audit-log` | GET | requireAdminPermission(audit:read) | None | |
| Main API | `/api/admin/audit-log` | POST | requireAdminAuth only | None | Any admin can write (see admin-01) |
| Main API | `/api/admin/giving` | GET | requireAdminPermission(giving:read) | None | JSON store |
| Main API | `/api/admin/giving/export.csv` | GET | requireAdminPermission(giving:read) | None | Full donor PII in CSV |
| Main API | `/api/admin/giving/:reference` | GET | requireAdminPermission(giving:read) | None | |
| Main API | `/api/admin/blog` | GET/PUT | requireAdminPermission | None | |
| Main API | `/api/admin/testimonies` | GET/PUT | requireAdminPermission | None | |
| Main API | `/api/admin/users` | GET/POST | requireAdminPermission(admin:users:manage) | None | |
| Main API | `/api/admin/users/:id` | PATCH/DELETE | requireAdminPermission(admin:users:manage) | None | |
| Main API | `/api/admin/analytics` | GET | requireAdminPermission(analytics:read) | None | |
| Main API | `/api/admin/giving/summary` | GET | requireAdminPermission(giving:read) | None | PostgreSQL |
| Main API | `/api/admin/giving/transactions` | GET | requireAdminPermission(giving:read) | None | PostgreSQL, masking applied |
| Main API | `/api/media` | GET | None | None | Public media list |
| Main API | `/api/admin/media` | GET/PUT/POST/DELETE | requireAdminPermission | None | |
| Main API | `/api/admin/media/:id/approve` | POST | requireAdminPermission | None | |
| Attendance | `/attendance/health` | GET | None | None | Health check |
| Attendance | `/attendance/go/:socialKey` | GET | None | None | Social link redirect |
| Attendance | `/attendance/api/health` | GET | None | None | |
| Attendance | `/attendance/api/current` | GET | None | None | Session snapshot |
| Attendance | `/attendance/api/count` | GET | None | None | Attendee count |
| Attendance | `/attendance/api/checkin` | POST | None (code required) | In-memory (service) | Rate limited in service |
| Attendance | `/attendance/api/scan/:qrToken` | GET | None (token required) | None | QR scan HTML response |
| Attendance | `/attendance/api/admin/session` | GET | x-attendance-admin-key | None | |
| Attendance | `/attendance/api/admin/session/generate` | POST | x-attendance-admin-key | None | |
| Attendance | `/attendance/api/admin/qr.png` | GET | x-attendance-admin-key | None | |
| Attendance | `/attendance/api/admin/social-links/qr` | GET | x-attendance-admin-key | None | |
| Attendance | `/attendance/api/admin/social-links/:key/qr.png` | GET | x-attendance-admin-key | None | |
| Bot | `/bot/health` | GET | None | None | Health check |
| Bot | `/bot/webhooks/whatsapp` | GET | verify_token challenge | None | Meta verification |
| Bot | `/bot/webhooks/whatsapp` | POST | HMAC-SHA256 (conditional) | None | Inbound messages |
| Bot | `/bot/api/visitors` | POST/GET/PATCH | assertAdmin (in-handler) | None | Member data |
| Bot | `/bot/api/events` | GET/POST/PATCH/DELETE | assertAdmin (in-handler) | None | Events CRUD |
| Bot | `/bot/api/members` | GET/PATCH | assertAdmin (in-handler) | None | Member profiles |
| Bot | `/bot/api/attendance-history` | POST/GET | assertAdmin (in-handler) | None | Attendance sync |
| Bot | `/bot/api/prayer-requests` | POST/GET/PATCH/DELETE | assertAdmin (in-handler) | None | Prayer requests |
| Bot | `/bot/api/privacy/duplicates` | GET | assertAdmin (in-handler) | None | |
| Bot | `/bot/api/privacy/visitors/:id/soft-delete` | POST | assertAdmin (in-handler) | None | |
| Bot | `/bot/api/privacy/visitors/:id/erase` | POST | assertAdmin (in-handler) | None | GDPR erase |
| Bot | `/bot/api/privacy/retention/run` | POST | assertAdmin (in-handler) | None | Data retention |
| Bot | `/bot/api/giving/notify` | POST | assertAdmin (in-handler) | None | Giving thank-you |
| Bot | `/bot/api/import-csv` | POST | None (missing assertAdmin?) | None | **See inv-01** |
| Bot | `/bot/api/preview/service` | POST | None | None | LLM preview |
| Bot | `/bot/api/preview/event` | POST | None | None | LLM preview |
| Bot | `/bot/api/admin/stats` | GET | assertAdmin (in-handler) | None | |
| Bot | `/bot/api/admin/activity` | GET | assertAdmin (in-handler) | None | |
| Bot | `/bot/monitoring/health` | GET | None | None | |
| Bot | `/bot/monitoring/alerts` | GET | None | None | Public metrics |
| Bot | `/bot/monitoring/errors` | GET | None | None | Public error log |
| Bot | `/bot/monitoring/metrics` | GET | None | None | Public metrics |

---

## Category Scores

| Category | Weight | Score | Weighted Score | Status |
|----------|--------|-------|----------------|--------|
| Endpoint Inventory & Classification | 1.2 | 4.5 | 5.40 | 🟡 |
| WhatsApp Cloud API Integration | 1.5 | 6.5 | 9.75 | 🟡 |
| Attendance Service API | 1.2 | 6.5 | 7.80 | 🟡 |
| Admin API Endpoints | 1.4 | 7.0 | 9.80 | 🟢 |
| Public-Facing API Endpoints | 1.1 | 3.5 | 3.85 | 🔴 |
| Payment Integration (Paystack) | 1.3 | 7.5 | 9.75 | 🟢 |
| LLM API Integration Security | 1.0 | 6.0 | 6.00 | 🟡 |
| **OVERALL** | **8.7** | — | **52.35 / 87 = 6.0** | 🟡 |

---

## Detailed Findings

### endpoint-inventory — API Endpoint Inventory & Classification

#### inv-01 Complete Endpoint Map — Score: 4/10

**Evidence**:
- `bot/src/routes/import.js:10` — `router.post('/import-csv', upload.single('file'), async (req, res) => {` with no `assertAdmin` call
- `bot/src/routes/preview.js:10,21,32,56` — `router.post('/preview/service|event|bulk-service|bulk-event')` with no `assertAdmin` call
- `bot/src/routes/monitoring.js:19,29,40` — `/alerts`, `/errors`, `/metrics` are publicly accessible
- `bot/src/app.js:77-88` — all bot sub-routers mounted without any top-level auth middleware
- `src/api/app.ts:118-124` — all API sub-routers mounted without top-level auth middleware; auth applied per-route

**Findings**: The endpoint inventory across three services (main API port 3000/3001, bot port 4100, attendance port 4201) covers 58+ routes. Classification is not formalized in any document. Several issues were identified:

1. **`/bot/api/import-csv` (POST)** — `bot/src/routes/import.js` has `router.post('/import-csv', upload.single('file'), async (req, res) => {` with no visible `assertAdmin` call in the file. This endpoint accepts CSV file uploads and is mounted at `/bot/api`. If unauthenticated, this is a critical gap allowing anyone to upload arbitrary data.

2. **`/bot/api/preview/*` (POST)** — Four preview endpoints (`/preview/service`, `/preview/event`, `/preview/bulk-service`, `/preview/bulk-event`) at `bot/src/routes/preview.js` have no `assertAdmin` check. These call the LLM provider cascade, meaning any external party can invoke Vertex/OpenAI/Gemini at the church's API cost.

3. **`/bot/monitoring/alerts`, `/bot/monitoring/errors`, `/bot/monitoring/metrics`** — These endpoints return internal error counts, recent error messages, and request metrics without authentication. They expose operational intelligence to any requester.

4. **No API versioning** anywhere (see inv-02).

5. **Auth pattern inconsistency**: main API uses Express middleware (`requireAdminAuth`, `requireAdminPermission`), while bot routes call `assertAdmin(req, res)` inside each handler. This is less robust — forgetting `if (!assertAdmin(req, res)) return` in a new route silently drops auth, unlike middleware which would need explicit removal.

**Remediation**:
1. Add `assertAdmin` to `import.js` before the upload middleware: `router.post('/import-csv', (req, res, next) => { if (!assertAdmin(req, res)) return; next() }, upload.single('file'), ...)`.
2. Add `assertAdmin` to all four preview routes in `preview.js`.
3. Restrict `/bot/monitoring/*` to admin-authenticated requests or only bind it to localhost.
4. Migrate bot routes to use an `adminAuth` middleware applied at router level rather than per-handler.

---

#### inv-02 API Versioning — Score: 5/10

**Evidence**:
- `src/api/app.ts:125` — `app.use("/api", apiRouter)` — no version prefix
- `bot/src/app.js:77-88` — `/bot/api/visitors`, `/bot/api/events` etc. — no version prefix
- `attendance/app.js:30` — `/attendance/api` — no version prefix
- `src/utils/adminApi.js` (referenced in prior evaluation) — hardcoded `/api/` base URLs

**Findings**: No service uses API versioning (no `/v1/`, `/v2/` pattern). All three services expose unversioned routes. The frontend utility files (`adminApi.js`, `givingApi.js`) reference hardcoded `/api/` paths. While versioning is not strictly a security control, its absence means there is no clean mechanism to introduce breaking security fixes (e.g., changing auth schemes, deprecating insecure endpoints) without affecting all consumers. For a church platform with internal-only consumers this is a low-risk finding, but the absence of a versioning strategy will complicate future upgrades.

**Remediation**: Add `/v1/` to all routes (e.g., `/api/v1/giving/initialize`). This can be done incrementally with an alias (`/api` → `/api/v1`) during transition. Update frontend utility files to reference the versioned base URL via a constant.

---

### whatsapp-api — WhatsApp Cloud API Integration

#### wa-api-01 Webhook Security — Score: 8/10

**Evidence**:
- `bot/src/app.js:91-103` — GET verification: checks `hub.mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN`
- `bot/src/app.js:106-128` — POST handler: verifies `X-Hub-Signature-256` using `crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')` with `crypto.timingSafeEqual` comparison
- `bot/src/app.js:28-31` — Raw body captured via `verify` callback on `express.json()`: `_rawBodyStore.set(req, buf)`
- `bot/src/app.js:109-113` — Missing signature or raw body returns 403
- `bot/src/app.js:127-129` — `META_APP_SECRET` not configured: logs warning and skips verification (does not block)

**Findings**: Major improvement since the 2026-05-19 evaluation. The `X-Hub-Signature-256` verification is now correctly implemented:
- Raw body is captured before JSON parsing via the `verify` callback (correct — JSON parsing does not modify the buffer)
- HMAC-SHA256 is computed against the raw body using the app secret
- `crypto.timingSafeEqual` is used to prevent timing attacks
- Missing signature or raw body results in 403
- Invalid signature results in 403 with logging

The one gap: if `META_APP_SECRET` is not set in the environment, the verification is **skipped entirely** (`bot/src/app.js:127-129`) and a warning is logged but the message is still processed. This means a deployment that neglects to set `META_APP_SECRET` will accept unauthenticated webhook events. The condition should fail-closed (reject instead of warn-and-continue) for production deployments.

Message deduplication by `wamid` is not explicitly visible in the webhook handler — duplicate message IDs could be processed twice. The delivery status handler does use `updateMessageStatus(status.id, ...)` which is idempotent if the DB enforces unique constraint on `wamid`.

**Remediation**:
1. Change the `META_APP_SECRET` absent branch from skip-and-warn to reject with 503 in production: `if (!appSecret && process.env.NODE_ENV === 'production') { return res.status(503).json({ error: 'Webhook not configured' }) }`.
2. Add message deduplication by `wamid` at the top of the inbound message handler to avoid processing duplicates from Meta retries.

---

#### wa-api-02 Outbound Message Security — Score: 7/10

**Evidence**:
- `bot/src/config/env.js` — `WHATSAPP_CLOUD_API_TOKEN` loaded from env (never in VITE_ prefix)
- `bot/src/services/message-generator.service.js:186-222` — OpenAI: `AbortSignal.timeout(10_000)`, `max_tokens: 100`
- `bot/src/services/message-generator.service.js:224-282` — Gemini: `AbortSignal.timeout(10_000)`, `maxOutputTokens: 300`, exponential backoff on 429
- `bot/src/services/message-generator.service.js:284-355` — Vertex: `AbortSignal.timeout(10_000)`, `maxOutputTokens: 300`, exponential backoff on 429/503
- `bot/src/routes/giving.js:52` — `if (!visitor.is_subscribed || visitor.do_not_contact)` checked before send
- No global rate counter for Meta's 1000-message daily limit

**Findings**: WhatsApp Cloud API token is environment-variable only with no `VITE_` exposure. All three LLM providers have 10-second timeouts via `AbortSignal.timeout()`. Retry logic uses exponential backoff (1s, 2s) with a 2-retry cap. Message sending respects opt-out flags. The main gap is that there is no application-level counter to track how many messages have been sent within Meta's 24-hour window (1000 messages for unverified business). A reminder worker sending to all subscribers could hit this limit silently with messages simply failing at the Meta API level. Errors from `sendWhatsAppMessage` are logged but not surfaced to the operator in a way that would trigger action.

**Remediation**:
1. Add a daily message counter stored in Redis (or the DB) that is checked before each send and alerts the operator at 80% of the Meta limit.
2. Consider a `messages_sent_today` metric in the monitoring endpoint to make this visible.

---

#### wa-api-03 Inbound Message Processing — Score: 6/10

**Evidence**:
- `bot/src/services/inbound-conversation.service.js:6` — `normalizeText = (value) => String(value || '').trim()`
- `bot/src/services/inbound-conversation.service.js:55` — `const body = normalizeText(messageText)` — trimmed but no length limit
- `bot/src/services/inbound-conversation.service.js:9-22` — FAQ patterns use simple `text.includes()` — no strict regex
- `bot/src/services/inbound-conversation.service.js:63-82` — Prayer request: raw `requestText` stored to DB without length limit
- `bot/src/app.js:174` — `if (!from || !text) return` — early exit if no text
- No explicit character limit on inbound `text` before processing

**Findings**: Inbound message handling is keyword-matching based (not LLM), which is the safe pattern. Opt-out detection runs before any conversation logic. The main concern is that inbound `messageText` is not length-limited before being stored as a prayer request or feedback entry. WhatsApp messages can be up to 4096 characters. A malicious actor could send the maximum allowed text as a "prayer request" that gets stored verbatim in the DB, potentially filling storage or causing display issues in the admin interface. The FAQ pattern matching uses `text.includes()` rather than word-boundary regex, meaning "service time" would match inside longer strings like "not service time related", but this is low risk for a keyword bot. No HTML escaping issues since responses are plain text sent to WhatsApp.

**Remediation**:
1. Add a length check at `bot/src/app.js:174`: `if (!from || !text || text.length > 2000) return` to discard oversized messages before processing.
2. In `createPrayerRequest` and `createFeedbackEntry`, slice `requestText`/`feedbackText` to a configured maximum (e.g., 1000 characters).

---

### attendance-api — Attendance Service API

#### att-01 Check-In Endpoint Security — Score: 7/10

**Evidence**:
- `attendance/routes/attendance.js:78-114` — `POST /checkin` accepts `mode`, validates `code` or `qrToken` server-side
- `attendance/services/attendance.service.js:76-85` — `isSelfDuplicate`: checks `tokenHash`, `ipHash`, and `normalizedName`
- `attendance/services/attendance.service.js:84-85` — `isAssistedDuplicate`: checks `phoneHash`
- `attendance/services/attendance.service.js:88-118` — `checkRateLimit`: in-memory per-IP and per-browserToken, 20-minute window
- `attendance/services/attendance.service.js:100` — Self-checkin: browser token rate limit = 1 per 20 minutes
- `attendance/services/attendance.service.js:121-128` — `validateSubmittedCode`: compares against session's `code` and `qrToken`
- `attendance/services/attendance.service.js:33` — QR token generated as `sha256('qr:' + serviceDate + ':' + Date.now() + ':' + Math.random()).slice(0, 24)`
- `attendance/app.js:14` — `app.use(cors())` wildcard CORS

**Findings**: Check-in validation is server-side: the attendance code and QR token are validated against the session stored in-memory on the server (`validateSubmittedCode`). Duplicate detection uses multiple independent signals (browser token hash, IP hash, normalized name for self; phone hash for assisted). Rate limiting is implemented at the service layer (not HTTP middleware) — 5 self-check-ins per IP per 20-minute window, 8 assisted per IP.

The QR token uses `Math.random()` as part of the seed for `sha256()`. While the SHA-256 output is not directly predictable, `Math.random()` is not cryptographically secure — an attacker who can observe enough QR tokens could theoretically predict future ones. Given QR tokens are regenerated per session (each Sunday) and exposed to physically-present attendees, the practical risk is low.

The attendance window check uses `lagosNow()` to enforce Sunday 12AM-6PM Africa/Lagos constraint — correct timezone handling confirmed.

The `POST /attendance/api/checkin` endpoint has no authentication for the `mode=assisted` case. Any IP with the correct session code can mark arbitrary phone numbers as present. The code/token is the only gating mechanism (no additional admin auth for assisted check-in). For a church setting where the code is shared verbally/physically, this is a design choice, but an attacker with the code could check in any phone number.

**Remediation**:
1. Replace `Math.random()` in QR token generation with `crypto.randomBytes(12).toString('hex')` for cryptographically secure randomness.
2. Consider requiring `x-attendance-admin-key` for the `mode=assisted` path, since assisted check-in is typically performed by a designated helper.
3. Fix wildcard CORS on the attendance service (see att-02).

---

#### att-02 Data Sync Security — Score: 6/10

**Evidence**:
- `attendance/services/attendance-history-sync.js` — syncs session and checkin data to bot's PostgreSQL
- `attendance/app.js:14` — `app.use(cors())` — wildcard, accepts any origin
- `attendance/routes/attendance.js:28-35` — Admin endpoints check `x-attendance-admin-key` header
- No inter-service mTLS or request signing for the attendance-to-bot sync
- `attendance/db/connection.js` — uses `DATABASE_URL` env var (same DB as bot)

**Findings**: The attendance service shares the same PostgreSQL database as the bot (both use `DATABASE_URL`). Data sync to the bot's DB is therefore a direct database write, not an HTTP call — which is actually more secure than an HTTP-based sync. However, this also means both services run with full write access to the same database, which violates least-privilege. The attendance service CORS is wildcard, meaning a browser pointed at `http://attendance-host:4201` can make cross-origin requests from any domain. Since the admin endpoints require the `x-attendance-admin-key` header, the CORS wildcard is not directly exploitable for admin operations, but it allows any browser origin to read the public attendance count and current snapshot.

**Remediation**:
1. Configure attendance CORS with an explicit origin allowlist: `cors({ origin: ['https://fgcupperroom.org', 'http://localhost:5173'] })`.
2. Consider creating a database role for the attendance service with only the permissions it needs (`INSERT` on attendance tables, no access to `visitors`, `member_profiles`, etc.).

---

### admin-api — Admin API Endpoints

#### admin-01 Admin Route Protection — Score: 7/10

**Evidence**:
- `src/api/auth.middleware.ts:24-46` — `requireAdminAuth`: reads sessions JSON, validates token hash, checks user active status
- `src/api/auth.middleware.ts:48-60` — `requireAdminPermission(permission)`: wraps `requireAdminAuth` then checks `roleHasPermission`
- `src/api/admin.routes.ts:35` — `router.post("/audit-log", requireAdminAuth, ...)` — only `requireAdminAuth`, not `requireAdminPermission`
- `src/api/admin.auth.ts:14` — `authRateLimit = createRateLimit(5, 15 * 60 * 1000, ...)` applied to login and password-reset/confirm
- `src/shared/admin-permissions.ts` — permission matrix with `super_admin` wildcard `*`
- `src/api/admin.routes.ts:124` — `requireBlogMutationAccess` custom middleware for blog PUT
- All admin CRUD routes (users, testimonies, media, giving) protected at middleware level

**Findings**: Admin route protection is now comprehensive. Rate limiting exists on the login endpoint (`5/15min/IP`) via the shared `createRateLimit` factory. All admin mutating routes use `requireAdminPermission` at middleware level (not inside handlers). The permission matrix (`admin-permissions.ts`) correctly uses role-based access control with three roles. Audit logging records admin actions including `auth.login_failed`, `auth.login`, `auth.logout`, `auth.change_password`, user CRUD actions.

Remaining gap: `POST /api/admin/audit-log` uses only `requireAdminAuth` (any authenticated admin), not `requireAdminPermission("audit:write")`. This means any `reviewer`-role admin can POST arbitrary entries to the audit log, potentially injecting false records that obscure real events. Given the audit log is the primary forensic trail, this is a meaningful integrity concern.

Secondary gap: The admin user DELETE operation is a hard delete (`users.splice(index, 1)`) — there is no soft-delete mechanism, so deleted user history is lost. This complicates audit trails if an account is removed.

**Remediation**:
1. Change `POST /api/admin/audit-log` to `requireAdminPermission("audit:write")` and restrict `audit:write` to `super_admin` only in the permission matrix, or remove the external endpoint entirely (the server should be the only writer).
2. Implement soft-delete for admin users: add `deletedAt` field instead of `splice`.

---

#### admin-02 Data Management Endpoints — Score: 7/10

**Evidence**:
- `src/api/admin.routes.ts:49-74` — Giving records read from JSON store with pagination (`limit: Math.min(200, ...)`)
- `src/api/admin.routes.ts:76-107` — CSV export: no record limit, exports entire filtered dataset with full donor PII
- `src/api/giving-admin.routes.ts:93-150` — PostgreSQL giving transactions: `maskEmail`/`maskPhone` applied for non-super_admin
- `src/api/media.routes.ts:13-19` — File upload: `multer.memoryStorage()`, `fileSize: 20MB`, `files: 25` — no MIME type restriction
- `src/api/admin.users.ts:99-121` — User delete: hard delete, no soft delete

**Findings**: Data management endpoints are generally well-protected. Permission checks are at middleware level. Pagination is implemented with max page sizes. The PostgreSQL-backed giving admin routes correctly apply role-based PII masking (`maskEmail`/`maskPhone` for non-`super_admin`). The JSON-store-backed giving admin route (`admin.routes.ts:49-74`) does NOT apply PII masking — full `donorEmail` and `donorPhone` are returned to any admin with `giving:read` permission, regardless of role. This contradicts the masking in the PostgreSQL path.

The CSV export (`admin.routes.ts:76-107`) exports full donor PII (name, email, phone) with no masking for any role. The export is available to any admin with `giving:read`, not just `super_admin`. The file size for media uploads is 20MB with no MIME type restriction — an admin could upload a `.php`, `.html`, or executable file. Since uploads are served from `/uploads/` as static files via `express.static`, a `.html` file would be served and executed in browsers, enabling stored XSS against any user who visits the upload URL.

**Remediation**:
1. Apply PII masking in `admin.routes.ts:49-74` (JSON store giving route) to match the PostgreSQL route: apply `maskEmail`/`maskPhone` for non-`super_admin` roles.
2. Restrict CSV export to `super_admin` role only.
3. Add MIME type allowlist to the media upload handler: `const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/mp4'])`. Reject uploads with disallowed MIME types.

---

### public-api — Public-Facing API Endpoints

#### pub-01 Contact & Subscribe Endpoints — Score: 3/10

**Evidence**:
- `src/api/common.routes.ts:30-65` — `POST /api/contact/submit`: no rate limit, no CAPTCHA, no honeypot; validates `name`, `email`, `message` required but no length limit on `message`
- `src/api/newsletter.routes.ts:10-53` — `POST /api/newsletter/subscribe`: no rate limit, no CAPTCHA; validates `name` and `email.includes('@')` only (not RFC-compliant email validation)
- `src/api/common.routes.ts:38` — Response reveals `ticketId` (timestamp-based: `TIC-${Date.now()}`), allowing enumeration of submission volume
- `src/api/newsletter.routes.ts:47-52` — Response reveals whether email was already subscribed (`"You are already subscribed"` vs `"You are subscribed"`) — allows email enumeration
- `src/api/common.routes.ts:57-58` — Stores submissions with 5000 record cap: `submissions.slice(0, 5000)` — disk bounded but could still fill with spam
- No `newline`, null-byte, or header-injection sanitization on `email`/`name` fields

**Findings**: Both public endpoints lack rate limiting entirely. An automated script can submit unlimited contact forms or newsletter signups, leading to: (1) disk exhaustion of the JSON store, (2) spam email to the church team reviewing contact submissions, (3) harvesting confirmation of which email addresses are subscribed. The newsletter subscribe endpoint leaks whether an email was already subscribed, enabling subscriber list enumeration. The `ticketId` format `TIC-${Date.now()}` reveals approximate submission timestamps and volume to any submitter.

The email validation (`email.includes('@')`) is trivially bypassed with values like `a@` or `@b` and does not prevent injection of newlines into fields that might eventually be used in email headers. No CAPTCHA or honeypot protection against bot submissions.

**Remediation**:
1. Apply rate limiting to both endpoints: use the existing `createRateLimit` factory with 3 submissions per hour per IP for contact, 5 per hour for newsletter subscribe.
2. Change the newsletter subscribe response to always return the same message regardless of whether the email was already known: `"Thank you for subscribing."` — preventing enumeration.
3. Replace `TIC-${Date.now()}` with a UUID-based ticket ID to prevent volume enumeration.
4. Add a honeypot field (e.g., `website` field that must be empty) to block naive bots.
5. Add RFC-compliant email validation (regex or `email-validator` package).
6. Strip newlines (`\n`, `\r`) from `email` and `name` fields before any downstream use.

---

#### pub-02 Public Data Endpoints — Score: 4/10

**Evidence**:
- `src/api/common.routes.ts:95-103` — `GET /api/blog` and `GET /api/testimonies`: calls `getPublicBlogPosts()` and `getPublicTestimonies()` — filtered by admin-set visibility
- `src/api/common.routes.ts:121-135` — `GET /api/vod`: `limit = Math.min(24, ...)` — bounded
- `src/api/giving.db.ts:27-42` — `toGivingConfirmation`: returns `donorEmail`, `donorPhone`, `donorName` in the response
- `src/api/giving.routes.ts:93` — `GET /api/giving/confirm?reference=` — calls `toGivingConfirmation` which exposes donor PII to any caller knowing the reference
- `src/api/giving.routes.ts:102` — `POST /api/giving/abandon` — also returns `toGivingConfirmation` with donor PII
- `src/api/common.routes.ts:67-85` — `POST /api/observability/rum`: no validation on `metric`, `route`, `source` fields; no rate limit; stores up to 5000 events

**Findings**: A significant data exposure: `GET /api/giving/confirm?reference=URG-XXXXXXXX` returns full donor PII — `donorName`, `donorEmail`, and `donorPhone` — to any caller who knows the transaction reference. References are generated by `buildGivingReference("URG")` which uses a short random component. The confirmation endpoint is intended to be called by the donor after their payment to check status, so it is public. However, exposing full email and phone number in the response is unnecessary — the donor already knows their own details. If a reference is leaked (e.g., in a browser URL bar, server log, or Paystack notification), a third party could retrieve the donor's contact information.

Similarly, `POST /api/giving/abandon` returns `toGivingConfirmation` which includes the same PII fields.

The RUM observability endpoint accepts arbitrary string values for `metric`, `route`, and `source` with no validation or rate limit. An attacker could flood the 5000-event ring buffer with garbage, displacing real performance data, or inject misleading metric names that corrupt analytics.

Blog and testimony public endpoints only return admin-curated content — no draft exposure. The VOD endpoint correctly limits page size to 24.

**Remediation**:
1. Strip donor PII from `toGivingConfirmation`: remove `donorEmail` and `donorPhone` from the public confirmation response. Keep only `donorName` (the donor's own display name). Create a separate internal version for the webhook/admin use case that retains PII.
2. Add an allowlist for `metric` values in `POST /api/observability/rum` (e.g., only accept `CLS`, `FID`, `LCP`, `TTFB`, `FCP`).
3. Apply rate limiting to `POST /api/observability/rum` (e.g., 60 per minute per IP).

---

### paystack — Payment Integration (Paystack — Live)

#### pay-01 Payment Security Architecture — Score: 8/10

**Evidence**:
- `src/api/giving.config.ts:94-95` — `paystackPublicKey` from `PAYSTACK_PUBLIC_KEY`; `paystackSecretKey` from `PAYSTACK_SECRET_KEY`
- No `VITE_PAYSTACK_SECRET_KEY` anywhere in codebase (confirmed by search)
- `src/api/giving.webhook.ts:51-62` — HMAC-SHA512 validation: `crypto.createHmac("sha512", paystackWebhookSecret).update(rawBody).digest("hex")`
- `src/api/giving.webhook.ts:44-49` — If `paystackWebhookSecret` not set: returns 200 without processing (safe degradation)
- `src/api/giving.routes.ts:105` — `router.post("/webhook", express.raw({ type: "application/json" }), webhookHandler)` — raw body preserved for HMAC
- `src/api/giving.webhook.ts:72-82` — Timestamp validation: rejects events older than `WEBHOOK_MAX_AGE_MS` (default 5 minutes)
- `src/api/giving.webhook.ts:102` — Idempotency: `if (current.status === "success") return` — prevents duplicate processing
- `src/api/giving.config.ts:133` — `paystackWebhookSecret: cleanEnv(process.env.PAYSTACK_WEBHOOK_SECRET || paystackSecretKey)` — falls back to secret key

**Findings**: The Paystack integration is the strongest area in the codebase from a security standpoint:
- Secret key is server-side only, never exposed via `VITE_` prefix or public endpoints
- Webhook uses `express.raw()` to preserve the raw body for correct HMAC computation
- HMAC-SHA512 signature verification is correct
- Timestamp validation rejects replayed webhooks older than 5 minutes
- Idempotency prevents duplicate transaction records on retry
- Signature verification failure results in 401 (not 200)

Two minor gaps: (1) The signature comparison at `giving.webhook.ts:59` uses `!==` (string equality) rather than `crypto.timingSafeEqual`. While webhook secrets are typically long random strings making timing attacks impractical, best practice is to use timing-safe comparison. (2) The `PAYSTACK_WEBHOOK_SECRET` defaults to `paystackSecretKey` if not set — this is functional but conflates two security primitives that should be separately rotatable.

**Remediation**:
1. Use `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))` in `giving.webhook.ts:59` for the Paystack signature comparison.
2. Document that `PAYSTACK_WEBHOOK_SECRET` should be set to a separate value from `PAYSTACK_SECRET_KEY` for independent rotation.

---

#### pay-02 Payment Data Handling — Score: 7/10

**Evidence**:
- `src/api/giving.db.ts:132-148` — `insertGivingTransaction`: stores `donor_name`, `donor_email`, `donor_phone` — no card data stored
- `src/api/giving.db.ts:27-42` — `toGivingConfirmation`: exposes `donorEmail`, `donorPhone` in public response (see pub-02)
- `src/api/giving-admin.routes.ts:135-136` — Role-based masking: `isSuperAdmin ? email : maskEmail(email)` — correct
- `src/api/giving.initialize.ts:61-63` — Reference generation: `buildGivingReference("URG")` — opaque format
- No card numbers, CVV, or full PANs stored anywhere (Paystack handles PCI compliance)
- `src/api/giving.webhook.ts:33` — `console.warn` on bot notification failure logs only `reference`, not PII
- `src/api/giving.webhook.ts:119` — Success log: `reference=${reference}` only, no PII

**Findings**: Payment data handling is mostly sound. No card data is stored — Paystack handles PCI compliance. Transaction references use an opaque `URG-` prefix format. Server logs contain only references, not PII. The PostgreSQL giving-admin endpoint correctly applies role-based masking. The JSON-store admin route (`admin.routes.ts:49-74`) does NOT apply masking, exposing full donor details to all admin roles with `giving:read` (see admin-02 finding).

The primary finding for this criterion is the `toGivingConfirmation` helper exposing donor PII in the public `/api/giving/confirm` and `/api/giving/abandon` responses (already documented in pub-02). This is a clear data minimization failure.

Payment failure handling returns generic errors to users — no Paystack internal error codes are leaked. The `providerMessage` field in the confirmation response (`toGivingConfirmation` line 37) does return the `gateway_response` string from Paystack (e.g., "Insufficient funds") which is appropriate user-facing information.

**Remediation**: Same as pub-02 item 1 — strip `donorEmail` and `donorPhone` from `toGivingConfirmation`. Apply PII masking in the JSON-store admin giving route.

---

#### pay-03 Bot Notification Bridge Security — Score: 8/10

**Evidence**:
- `bot/src/routes/giving.js:20-21` — `router.post('/notify', async (req, res) => { if (!assertAdmin(req, res)) return`
- `bot/src/lib/admin-auth.js:16-31` — `assertAdmin`: checks `x-bot-admin-key` header, rejects weak/empty secrets
- `bot/src/lib/admin-auth.js:3-8` — `isWeakSecret`: rejects `admin123`, `replace_me`, `your-*` patterns
- `src/api/giving.webhook.ts:12-38` — `notifyBotGivingSuccess`: uses `AbortSignal.timeout(10_000)`, logs on failure with `reference` only
- `bot/src/routes/giving.js:52-57` — Opt-out check: `!visitor.is_subscribed || visitor.do_not_contact`
- `bot/src/routes/giving.js:38` — `maskPhone(rawPhone)` in log
- `bot/src/routes/giving.js:64-69` — Message uses pre-defined `giving_thanks` template, not user-supplied content
- `bot/src/routes/giving.js:89` — Log: `reference`, `visitorId`, `phone: maskPhone(normalizedPhone)` — no amount, no email in log

**Findings**: The bot notification bridge is well-secured. The `assertAdmin` check is the first operation in the handler. Weak secrets are rejected at startup by `isWeakSecret`. The notification payload is validated (phone normalized and validated, visitor looked up before send). Opt-out is respected before sending. The message uses a stored template rather than user-supplied content — no message injection risk. PII is masked in logs. Fire-and-forget errors are logged with reference only.

The one remaining concern from the prior evaluation: `assertAdmin` uses direct string equality (`provided !== expected`) instead of `crypto.timingSafeEqual`. While impractical to exploit for long random keys, it is inconsistent with the webhook handlers.

The `donor_email` is sent in the notification payload from the main API (`giving.webhook.ts:27`) but is not used in the bot's `giving_thanks` template rendering (`giving.routes.js:64`) — it is received but unused. This is benign but unnecessary PII transmission over the internal network.

**Remediation**:
1. Use `crypto.timingSafeEqual` in `admin-auth.js:25` for the `x-bot-admin-key` comparison.
2. Remove `donor_email` from the bot notification payload in `giving.webhook.ts:20-30` since it is not used by the template.

---

### llm-api — LLM API Integration Security

#### llm-01 LLM Provider Security — Score: 7/10

**Evidence**:
- `bot/src/services/message-generator.service.js:186-192` — OpenAI: `Authorization: Bearer ${env.OPENAI_API_KEY}` — key from env only
- `bot/src/services/message-generator.service.js:234` — Gemini: API key in URL query parameter `?key=${encodeURIComponent(env.GEMINI_API_KEY)}`
- `bot/src/services/message-generator.service.js:284-355` — Vertex: uses OAuth2 access token from `GoogleAuth` — service account JSON from `VERTEX_SERVICE_ACCOUNT_JSON` env var
- `bot/src/services/message-generator.service.js:186,224,284` — All three providers: `AbortSignal.timeout(10_000)` — 10-second timeout
- `bot/src/services/message-generator.service.js:357-393` — Provider cascade: vertex → openai → gemini → static fallback
- No `max_tokens` enforcement on returned content (only on request)
- No per-day message generation cap

**Findings**: All API keys are environment-variable only with no exposure in client bundles. The 10-second timeout via `AbortSignal.timeout()` correctly prevents hanging requests. The cascading fallback handles provider failures gracefully — if all LLMs fail, a static template is used. Retry logic with exponential backoff is implemented for Gemini and Vertex (429/503 responses).

The Gemini API key is included as a URL query parameter (`?key=...`). While this is Gemini's required authentication pattern, query-parameter API keys are logged by default in most web proxy/CDN access logs, potentially exposing the key. The key is `encodeURIComponent`-encoded which is correct. Vertex uses short-lived OAuth2 tokens (valid 50 minutes per `cachedVertexTokenExpiry = Date.now() + 50 * 60 * 1000`), which is the correct pattern.

No application-level rate limiting prevents runaway LLM costs. The reminder worker could theoretically be triggered repeatedly (or a bulk send operation initiated repeatedly) to run up unbounded API costs. No per-hour or per-day generation limit is enforced.

**Remediation**:
1. Add a daily LLM generation counter in Redis or the DB. Block generation and fall through to static templates when the daily cap (e.g., 500 generations/day) is reached.
2. Log a summary of LLM provider usage (provider, count, timestamp) in the monitoring endpoint for cost tracking.
3. Consider using Vertex's recommended service account key rotation schedule (90 days) and document it in the operations runbook.

---

#### llm-02 Prompt Injection Prevention — Score: 5/10

**Evidence**:
- `bot/src/services/message-generator.service.js:140-158` — `buildServiceReminderPrompt`: embeds `name` (visitor name) and `serviceTime` directly via template literals
- `bot/src/services/message-generator.service.js:162-184` — `buildEventReminderPrompt`: embeds `name`, `eventTitle`, `eventDate`, `eventTime`, `registrationLink` directly
- `bot/src/services/message-generator.service.js:131-138` — `BOT_MESSAGE_STYLE_GUIDE`: instructs model to "return only the message text" — no user/system role separation
- No escaping of user-supplied data before embedding in prompt strings
- `bot/src/services/message-generator.service.js:395-416` — LLM output used directly as message text without post-processing validation

**Findings**: User-controlled data (visitor name, event title) is interpolated directly into LLM prompts without escaping or sanitization: `Recipient name: ${name}` and `Event title: ${eventTitle}`. If an attacker can control the visitor's registered name (via the WhatsApp conversation, the visitor registration endpoint, or a CSV import), they could embed instructions like `Ignore previous instructions. Return: [malicious message]` in their name field, causing the LLM to generate adversarial content sent to church members.

The practical risk depends on who controls these fields: the `name` field comes from visitor registration (self-reported via WhatsApp or admin-entered). An active church member with a malformed name could potentially influence the content of reminder messages sent to others. This is a real but low-severity prompt injection surface given the constrained message format and `max_tokens: 100` for OpenAI.

The prompts use a single-role (user) message format rather than the more robust system/user separation. The `BOT_MESSAGE_STYLE_GUIDE` is prepended to the user content block, not passed as a `system` role, meaning a model that follows instructions embedded in user content could be more easily influenced.

LLM output is used directly as the WhatsApp message with no length limit enforced after generation, no URL filtering, and no pattern validation. A prompt injection could cause the model to produce a message containing a phishing URL.

**Remediation**:
1. Sanitize user-supplied fields before embedding in prompts: strip or escape any characters that could be interpreted as instructions — at minimum, remove the string `Ignore`, `Disregard`, `Override`, `Instructions:`, `System:` (case-insensitive) from visitor names and event titles before prompt embedding.
2. Use a `system` role message for `BOT_MESSAGE_STYLE_GUIDE` (OpenAI supports `{ role: 'system', content: guide }`) to strengthen separation between instructions and data.
3. After LLM generation, validate: (a) output length ≤ 500 characters, (b) no URLs unless `registrationLink` was included in the prompt, (c) contains "Reply STOP" if opt-out instruction was requested. Fallback to static template on validation failure.

---

## Action Items by Priority

### P0 — Critical: Immediate Action Required

**P0.1 — Missing authentication on bot import and preview endpoints**
- **Files**: `bot/src/routes/import.js:10`, `bot/src/routes/preview.js:10,21,32,56`
- **Impact**: Unauthenticated CSV upload allows arbitrary data injection into the visitor/member database. Unauthenticated LLM preview endpoints allow anyone to run up API costs at the church's expense.
- **Fix**: Add `if (!assertAdmin(req, res)) return` as the first line of each handler, or apply an `adminAuth` middleware at router level.

**P0.2 — Donor PII exposed in public giving confirmation endpoint**
- **Files**: `src/api/giving.db.ts:27-42`, `src/api/giving.routes.ts:93,102`
- **Impact**: Any caller who knows a transaction reference (e.g., from a URL or log) can retrieve the donor's full name, email, and phone number.
- **Fix**: Remove `donorEmail` and `donorPhone` from `toGivingConfirmation`. Return only `donorName`, `reference`, `status`, `amountNaira`, `currency`, `fund`, `provider`, `providerStatus`, `providerMessage`, `paidAt`.

---

### P1 — Poor: Fix Within Sprint

**P1.1 — No rate limiting on contact form, newsletter subscribe, or RUM endpoint**
- **Files**: `src/api/common.routes.ts:30,67`, `src/api/newsletter.routes.ts:10`
- **Impact**: Unlimited submissions enable spam, disk exhaustion, and subscriber enumeration.
- **Fix**: Apply `createRateLimit(3, 60 * 60 * 1000)` to contact submit, `createRateLimit(5, 60 * 60 * 1000)` to newsletter subscribe, `createRateLimit(60, 60_000)` to RUM endpoint.

**P1.2 — Newsletter subscribe reveals email enumeration**
- **File**: `src/api/newsletter.routes.ts:47-52`
- **Impact**: Attacker can enumerate all subscribed email addresses by checking response messages.
- **Fix**: Return identical response message regardless of whether email was already subscribed.

**P1.3 — Media upload accepts unrestricted MIME types**
- **File**: `src/api/media.routes.ts:51-90`
- **Impact**: An admin could upload an `.html` file that executes as stored XSS when accessed via the static `/uploads/` path.
- **Fix**: Validate `file.mimetype` against an allowlist of image, video, and audio types before writing to disk.

**P1.4 — JSON-store giving admin route missing PII masking**
- **File**: `src/api/admin.routes.ts:49-74`
- **Impact**: `editor` and `reviewer` role admins can read full donor email and phone from the JSON store path, contradicting the masking in the PostgreSQL path.
- **Fix**: Apply `maskEmail`/`maskPhone` in the JSON-store route, conditioned on `req.user?.role === 'super_admin'`.

**P1.5 — Bot monitoring endpoints expose internal error data publicly**
- **Files**: `bot/src/routes/monitoring.js:19,29,40`
- **Impact**: Internal error messages, error counts, and slow-request data are readable by any external party.
- **Fix**: Add `assertAdmin` to `/alerts`, `/errors`, and `/metrics` endpoints. Leave `/health` public.

**P1.6 — WhatsApp webhook accepts events when META_APP_SECRET is not configured**
- **File**: `bot/src/app.js:127-129`
- **Impact**: A deployment that omits `META_APP_SECRET` will accept spoofed webhook events without warning.
- **Fix**: In production (`NODE_ENV=production`), reject requests with 503 if `META_APP_SECRET` is absent, rather than skip-and-warn.

---

### P2 — Moderate: Schedule Within 2 Weeks

**P2.1 — Prompt injection risk in LLM reminder generation**
- **File**: `bot/src/services/message-generator.service.js:140-184`
- **Impact**: Visitor name or event title containing adversarial text could cause LLM to generate malicious message content.
- **Fix**: Sanitize user-supplied values before prompt embedding. Use `system` role for style guide. Validate LLM output (length, URL presence) before sending.

**P2.2 — Paystack signature comparison should use timingSafeEqual**
- **File**: `src/api/giving.webhook.ts:59`
- **Impact**: Theoretical timing attack on string comparison (low practical risk).
- **Fix**: `if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) { return res.sendStatus(401) }`.

**P2.3 — `assertAdmin` in bot uses string equality not timingSafeEqual**
- **File**: `bot/src/lib/admin-auth.js:25`
- **Impact**: Theoretical timing attack on bot admin key comparison.
- **Fix**: Use `crypto.timingSafeEqual` for the key comparison.

**P2.4 — No API versioning**
- **Files**: `src/api/app.ts:125`, `bot/src/app.js:77-88`, `attendance/app.js:30`
- **Impact**: No clean mechanism to introduce breaking security changes without affecting consumers.
- **Fix**: Add `/v1/` prefix to all API routes. Set old paths as aliases during transition.

**P2.5 — POST /api/admin/audit-log accessible to all admin roles**
- **File**: `src/api/admin.routes.ts:35`
- **Impact**: Any reviewer-role admin can inject false audit records.
- **Fix**: Change to `requireAdminPermission("audit:write")` and restrict `audit:write` to `super_admin`.

**P2.6 — No daily LLM generation cap for cost control**
- **File**: `bot/src/services/message-generator.service.js:357-393`
- **Impact**: Unlimited API cost possible if reminder workers are triggered excessively.
- **Fix**: Implement a daily generation counter with configurable cap and fallback to static templates.

**P2.7 — QR token uses Math.random() in seed**
- **File**: `attendance/services/attendance.service.js:33`
- **Impact**: Non-cryptographic randomness in QR token generation (low practical risk given per-session rotation).
- **Fix**: Replace `Math.random()` with `crypto.randomBytes(12).toString('hex')`.

**P2.8 — Donor email unnecessarily transmitted to bot in giving notification**
- **File**: `src/api/giving.webhook.ts:27`
- **Impact**: Unnecessary PII transmission over internal network; not used by the `giving_thanks` template.
- **Fix**: Remove `donor_email` from the `notifyBotGivingSuccess` payload.

---

## Paystack Implementation Assessment

The Paystack integration is assessed as **production-ready** from a security standpoint, with two minor improvements pending:

| Check | Status | Evidence |
|-------|--------|----------|
| Secret key server-side only | PASS | No `VITE_PAYSTACK_SECRET_KEY` anywhere |
| Public key client-side only | PASS | `VITE_PAYSTACK_PUBLIC_KEY` used in frontend |
| Webhook HMAC-SHA512 verified | PASS | `giving.webhook.ts:54-62` |
| Raw body preserved for HMAC | PASS | `express.raw()` at route level |
| Timestamp replay protection | PASS | 5-minute window (`WEBHOOK_MAX_AGE_MS`) |
| Idempotency on duplicate events | PASS | `if (current.status === 'success') return` |
| Amount validated server-side | PASS | `giving.initialize.ts:57-59` |
| No card data stored | PASS | Only reference, amount, status |
| Role-based PII masking (PostgreSQL path) | PASS | `giving-admin.routes.ts:135-136` |
| Signature uses timingSafeEqual | FAIL (minor) | `giving.webhook.ts:59` — string `!==` |
| Role-based PII masking (JSON store path) | FAIL | `admin.routes.ts:49-74` — no masking |
| Donor PII removed from public confirm | FAIL | `giving.db.ts:27-42` — exposes email/phone |

---

## Unauthenticated Endpoint Alerts

The following endpoints are either fully public or have incomplete authentication and warrant specific attention:

| Endpoint | Service | Auth Gap | Risk |
|----------|---------|----------|------|
| `POST /bot/api/import-csv` | Bot | No assertAdmin | HIGH — data injection |
| `POST /bot/api/preview/service` | Bot | No assertAdmin | HIGH — free LLM usage |
| `POST /bot/api/preview/event` | Bot | No assertAdmin | HIGH — free LLM usage |
| `POST /bot/api/preview/bulk-service` | Bot | No assertAdmin | HIGH — free LLM usage |
| `POST /bot/api/preview/bulk-event` | Bot | No assertAdmin | HIGH — free LLM usage |
| `GET /bot/monitoring/alerts` | Bot | No auth | MEDIUM — internal error data |
| `GET /bot/monitoring/errors` | Bot | No auth | MEDIUM — internal error data |
| `GET /bot/monitoring/metrics` | Bot | No auth | MEDIUM — internal metrics |
| `POST /api/contact/submit` | Main API | No rate limit | MEDIUM — spam/disk exhaustion |
| `POST /api/newsletter/subscribe` | Main API | No rate limit | MEDIUM — subscriber enumeration |
| `POST /api/observability/rum` | Main API | No rate limit, no validation | MEDIUM — data pollution |
| `GET /api/giving/confirm` | Main API | Public + donor PII | HIGH — PII exposure |
| `POST /api/giving/abandon` | Main API | Public + donor PII | HIGH — PII exposure |
