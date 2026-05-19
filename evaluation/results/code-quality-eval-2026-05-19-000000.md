# Code Quality Evaluation Report — FGC Upper Room Platform
**Date**: 2026-05-19  
**Evaluator**: Claude Code (automated)  
**Framework Version**: code-quality-v1  
**Codebase Root**: `fgc-youth-website/`  
**Files Analyzed**: 160 TS/JS/JSX/TSX source files (excluding node_modules, dist)

---

## Executive Summary

**Overall Weighted Score**: 5.9 / 10

The platform has a coherent monorepo structure, sound TypeScript typing in the API layer, and several well-designed service modules. However, it carries significant technical debt in three areas: a cluster of React "god components" that far exceed maintainable size (up to 1,761 lines), confirmed duplication of the `maskPhone()` helper across four separate files (including a TypeScript file), and near-total absence of linting tooling. Error handling in the Express API layer relies on unguarded async route handlers rather than a wrapper, leaving uncaught-promise rejections as potential crash vectors. Testing exists but is shallow — only the bot layer has meaningful coverage; the API routes and all React components have zero tests.

---

## Category Scores

| Category | Weight | Score | Weighted Score | Status |
|----------|--------|-------|----------------|--------|
| STRUCTURE | 1.3 | 5.5 | 7.15 | Warning |
| NAMING | 1.0 | 7.0 | 7.00 | Acceptable |
| DUPLICATION | 1.2 | 4.5 | 5.40 | Poor |
| ERROR HANDLING | 1.1 | 5.5 | 6.05 | Warning |
| REACT | 1.0 | 4.5 | 4.50 | Poor |
| DOCS | 0.8 | 5.0 | 4.00 | Warning |
| TESTING | 1.0 | 4.0 | 4.00 | Poor |
| **TOTALS** | **7.4** | — | **38.10** | — |

**Normalised weighted score**: 38.10 / (7.4 × 10) × 10 = **5.15 / 10**

> Note: Scores per criterion are shown in their sections. The table above uses per-category averages.

---

## Detailed Findings

---

### STRUCTURE — Project Structure & Organization

#### struct-01 Directory Organization — Score: 6/10

**Evidence**:
- Root contains `src/` (website + API), `bot/` (WhatsApp), `attendance/` (check-in service), `lib/` (shared utils), `data/` (flat-file stores), `tests/`, `scripts/`
- `bot/src/` uses consistent `routes/`, `services/`, `lib/`, `queue/`, `workers/`, `config/`, `db/`, `utils/` layout
- `attendance/` sub-tree lacks a README; no `attendance/README.md` found
- Root `README.md` and `bot/README.md` both exist and are substantive
- A stray `{components` directory appears in `src/` (observed in directory listing — likely a naming accident)
- `lib/giving-utils.js` and `src/shared/admin-permissions.js` provide cross-cutting shared code, but are not co-located in a single `shared/` root

**Findings**: The three-service monorepo split is logical and navigation is predictable for a developer familiar with Node/Express conventions. The inconsistency is the absence of an `attendance/README.md` and the apparent orphaned `{components` entry. The `lib/` vs `src/shared/` vs `bot/src/lib/` trichotomy for shared utilities is slightly fragmented.

**Remediation**:
1. Add `attendance/README.md` documenting the QR check-in service and its env vars.
2. Investigate and remove the `{components` directory artifact in `src/`.
3. Consolidate shared cross-service utilities (`maskPhone`, date formatters) into a single `shared/utils/` folder at repo root.

---

#### struct-02 File Size & Complexity — Score: 3/10

**Evidence** (top offenders by line count):

| File | Lines | Threshold |
|------|-------|-----------|
| `src/pages/Admin/components/EventManager.jsx` | 1,761 | >300 critical |
| `src/pages/Events/Events.jsx` | 1,223 | >300 critical |
| `src/pages/Admin/components/MediaManager.jsx` | 1,215 | >300 critical |
| `src/pages/Admin/components/BlogManager.jsx` | 1,001 | >300 critical |
| `src/pages/Media/Media.jsx` | 974 | >300 critical |
| `src/api/giving.routes.ts` | 918 | >300 critical |
| `src/components/features/GivingModal/GivingModal.jsx` | 870 | >300 critical |
| `src/pages/Admin/components/AdminUsers.jsx` | 842 | >300 critical |
| `src/pages/Admin/components/Settings.jsx` | 729 | >300 critical |
| `src/pages/Admin/components/BotOpsManager.jsx` | 676 | >300 critical |
| `src/api/admin.routes.ts` | 672 | >300 critical |
| `src/pages/Home/Home.jsx` | 636 | >300 critical |
| `attendance/services/attendance.service.js` | 619 | >300 critical |
| `src/pages/Admin/Admin.jsx` | 608 | >300 critical |

**Findings**: 14 files exceed the 300-line critical threshold. `EventManager.jsx` at 1,761 lines is the worst offender — it contains event state management, form logic, date filters, category management, registration-method configuration, newsletter sync, and full CRUD UI in a single component. `giving.routes.ts` at 918 lines mixes config parsing, DB pool management, rate limiting, CORS, payment gateway integration, webhook handling, and crypto verification — all in one file. `admin.routes.ts` (672 lines) was reportedly 735 lines previously and has been reduced, but remains too large.

**Remediation**:
1. Split `giving.routes.ts` into: `giving.config.ts`, `giving.db.ts`, `giving.handlers.ts`, `giving.webhook.ts`.
2. Split `EventManager.jsx` into `EventList.jsx`, `EventForm.jsx`, `EventFilters.jsx`, and a `useEventManager` hook.
3. Extract `giving.routes.ts` rate-limiter and CORS helper into `src/api/middleware/`.

---

#### struct-03 Separation of Concerns — Score: 6/10

**Evidence**:
- `src/api/storage.ts` correctly abstracts all flat-file I/O behind `readJsonArray` / `writeJsonArray`
- `src/api/auth.middleware.ts` is a clean, single-purpose module (61 lines)
- `src/shared/admin-permissions.js` cleanly separates RBAC logic
- `lib/giving-utils.js` centralises giving domain helpers
- `bot/src/services/` follows a repository pattern with `visitor.repository.js`, `prayer.repository.js`, etc.
- **Issue**: `src/api/giving.routes.ts` contains DB pool management (`getGivingPool()`), business logic (`normalizeGivingTransaction`, `markGivingTransactionAbandoned`), and route handlers all in one file
- **Issue**: `src/api/admin.routes.ts` lines 524–653 embed a 130-line analytics aggregation function inline inside a route file rather than an analytics service
- **Issue**: `giving.routes.ts` calls `getGivingRuntimeConfig()` on every request (line 607, 786, 893, 959) — a design smell suggesting config should be injected or memoised by a service layer
- React components generally separate data-fetching into utility modules (`utils/adminApi.js`, `utils/givingApi.js`), which is good

**Remediation**:
1. Extract `buildSegmentItems`, `incrementCount`, and the analytics aggregation in `admin.routes.ts:524–653` into `src/api/analytics.service.ts`.
2. Move the `getGivingPool` + `rowToTransaction` + DB helper functions in `giving.routes.ts` to `src/api/giving.db.ts`.
3. Cache `getGivingRuntimeConfig()` result instead of re-parsing env on every request.

---

### NAMING — Naming Conventions

#### name-01 Consistent Naming — Score: 7/10

**Evidence**:
- API layer (TypeScript): camelCase variables, PascalCase types (`AdminUserRecord`, `GivingTransaction`), `UPPER_SNAKE_CASE` constants (`SESSION_DURATION_MS`, `AUTH_RL_WINDOW_MS`, `MIN_GIVING_AMOUNT_KOBO`) — consistently applied
- Bot layer (JavaScript ESM): camelCase functions, `UPPER_SNAKE_CASE` constants (`OPT_OUT_KEYWORDS`, `META_PERMANENT_ERRORS`), service files use `.service.js` / `.repository.js` suffixes — consistent
- React components: PascalCase (`EventManager`, `GivingModal`, `AdminUsers`) — correct
- Boolean variables: `isActive`, `isMounted`, `isLoading`, `isSaving`, `isAssistedMode` — `is/has` prefix used well
- DB columns: snake_case (`donor_phone`, `amount_kobo`, `paid_at`) — correct
- Minor inconsistency: `bot/src/lib/admin-auth.js` exports `assertAdmin` (imperative) while most auth helpers are named `requireAdminAuth` / `requireAdminPermission` (consistent `require` prefix in the TS layer). Not critical but slightly inconsistent across the boundary.
- `_authRlStore` / `_rlStore` use leading underscore to signal module-private — acceptable but undocumented convention

**Remediation**: Standardise bot admin auth function name to align with TS layer (`requireBotAdmin` or document the `assertAdmin` pattern in a contributing guide).

---

#### name-02 Meaningful Names — Score: 7/10

**Evidence**:
- Functions are generally descriptive: `buildGivingReference`, `normalizeGivingTransaction`, `markGivingTransactionAbandoned`, `appendAuditLog`, `rehydrateAttendanceStore`
- REST paths follow conventions: `/api/admin/auth/login`, `/api/admin/users`, `/api/giving/initialize`, `/api/giving/webhook`
- `toIsoOrFallback` (admin.routes.ts:43) — clear intent
- `withCryptoVerificationLock` (giving.routes.ts:271) — describes the serialisation pattern
- Some abbreviations are non-obvious: `_rlStore` (rate-limit store), `ql` (query lowercase) at `admin.routes.ts:676`, `o` for the overview DB row at `giving-admin.routes.ts:72`
- `timelineHash` at `giving.routes.ts:642` — clear
- `adaptiveRateLimiter` object in `reminder.worker.js` has methods named `canSend`, `consume`, `onSuccess`, `onRateLimited` — well-named API

**Remediation**: Replace single-letter variables (`o`, `ql`, `r`, `l`) in query result mappings with descriptive names.

---

### DUPLICATION — Code Duplication

#### dup-01 Duplicate Code Detection — Score: 5/10

**Evidence**:

**`maskPhone()` — confirmed 4 occurrences, identical body:**

| File | Line | Defined |
|------|------|---------|
| `bot/src/app.js` | 21 | `const maskPhone = (phone) => { if (!phone) return '[redacted]'; const s = String(phone); return s.slice(0, 3) + '***' + s.slice(-2) }` |
| `bot/src/routes/giving.js` | 12 | identical body |
| `bot/src/services/opt-out.service.js` | 4 | identical body |
| `src/api/giving-admin.routes.ts` | 30 | TypeScript variant — same logic, different signature type |

**`formatRelativeTime()` — 2 occurrences with identical bodies:**

| File | Line |
|------|------|
| `src/pages/Admin/Admin.jsx` | 65 |
| `src/pages/Admin/components/Dashboard.jsx` | 6 |

**`formatDateTime()` — 2 occurrences with identical bodies:**

| File | Line |
|------|------|
| `src/pages/Admin/components/BotOpsManager.jsx` | 40 |
| `src/pages/Admin/components/GivingManager.jsx` | 43 |

**`ROLE_META` constant — 2 occurrences with identical values:**

| File | Line |
|------|------|
| `src/pages/Admin/components/AdminUsers.jsx` | 34 |
| `src/pages/Admin/components/AuditLog.jsx` | 18 |

**Rate-limiter boilerplate** (`_rlStore` Map + prune loop + count/reset logic) duplicated between:
- `src/api/admin.routes.ts:17–40` (authRateLimit)
- `src/api/giving.routes.ts:556–582` (initializeRateLimit)

**`normalizeBankDetails` / `normalizeBankAccount`** partially duplicated between:
- `src/api/giving.routes.ts:48–90`
- `src/components/features/GivingModal/GivingModal.jsx:30–67`

**Remediation**:
1. Create `bot/src/utils/phone.js` exporting `maskPhone` and import it in `app.js`, `routes/giving.js`, `services/opt-out.service.js`.
2. Create `src/api/utils/phone.ts` exporting the TS-typed `maskPhone` for the admin giving route.
3. Create `src/utils/adminFormatters.js` exporting `formatRelativeTime`, `formatDateTime`, `ROLE_META`.
4. Extract rate-limiter into `src/api/middleware/rate-limit.ts`.
5. Move bank normalisation to a shared `lib/bank-utils.js` used by both the giving route and the client modal.

---

#### dup-02 Dead Code Elimination — Score: 6/10

**Evidence**:
- Only one TODO comment found in the entire codebase: `admin.routes.ts:258` — `// TODO: email rawToken to user.email via a transactional email service.` This is a genuine incomplete feature, not dead code.
- Commented-out code block in `src/components/features/Countdown/Countdown.jsx:10–14` — the `SPECIAL_EVENTS` array has a real commented-out entry with a date from 2025; this is benign but should be removed.
- No unused React components found (all admin sub-components are imported in `Admin.jsx:26–50`)
- Lazy-load factory functions in `Admin.jsx` (lines 26–50) define both a `load*` function and a `lazy(load*)` — the `load*` names are never used directly, adding minor noise
- `lib/giving-utils.js:55–64` — `toWeiString` function has an inline comment saying "Just a placeholder conversion" and its formula is explicitly noted as approximate; this is semi-dead placeholder logic
- `bot/src/config/` and `bot/src/db/` are referenced but not visible in the listed routes — no orphaned files detected otherwise

**Remediation**:
1. Remove the commented-out `SPECIAL_EVENTS` entry at `Countdown.jsx:10–14`.
2. Remove the `toWeiString` placeholder function or replace with a real price-feed implementation.
3. Collapse the `loadX` + `lazy(loadX)` pattern in `Admin.jsx` to `const X = lazy(() => import('./components/X'))` directly.

---

#### dup-03 maskPhone() and Utility Helpers — Score: 3/10

**Evidence** (grepped all `.ts`/`.js` files):

```
bot/src/app.js:21                   const maskPhone = (phone) => { ... }
bot/src/routes/giving.js:12         const maskPhone = (phone) => { ... }
bot/src/services/opt-out.service.js:4  const maskPhone = (phone) => { ... }
src/api/giving-admin.routes.ts:30   const maskPhone = (phone: string): string => { ... }
```

All four implementations are functionally identical: return `'[redacted]'` for falsy input, otherwise `s.slice(0,3) + '***' + s.slice(-2)`.

**No shared utils module for `maskPhone` exists.** `bot/src/utils/` contains only `time.js` (3 exported functions). The `src/shared/` folder contains only `admin-permissions.js` and `pathing.js`.

Other duplicated helpers noted:
- Phone normalisation (`normalizePhoneNumber`) is correctly centralised in `bot/src/services/identity.service.js` and imported by 10 files — this is a positive pattern not replicated for masking.
- Date formatting helpers (`formatDateTime`, `formatRelativeTime`) are duplicated across 2 files each in the React admin layer.

**Remediation**:
1. Create `bot/src/utils/privacy.js` with `export const maskPhone = ...` and update all three bot-side callers.
2. Create `src/api/utils/privacy.ts` with the typed variant for `giving-admin.routes.ts`.
3. Create `src/utils/adminFormatters.js` for the React date-format helpers.

---

### ERROR HANDLING

#### err-01 Consistent Error Handling — Score: 5/10

**Evidence**:

**Unguarded async route handlers in the main Express API layer:**

In `src/api/admin.routes.ts`, nearly all route handlers are async closures directly registered with Express (e.g., `router.post("/auth/login", authRateLimit, async (req, res) => { ... })`). None use `express-async-errors` or an `asyncHandler` wrapper. If an `await` inside a handler throws (e.g., a `readJsonArray` failure or a network call), the rejected promise will be an unhandled rejection unless Express 5 auto-catches it.

The project does use **Express 5** (`"express": "^5.1.0"` in `package.json`), which does automatically pass async errors to the error handler. This mitigates the crash risk. Score adjusted upward accordingly. However, there is no registered Express error handler middleware in `app.ts`, so unhandled errors will result in Express 5's default 500 response with no structured JSON body — breaking the `{ error: string }` contract the frontend expects.

**Bot layer (`bot/src/routes/admin.js`)**: uses `try/catch` in every route handler, which is correct.

**`attendance/services/attendance.service.js`**: DB writes use bare `try/catch` with `console.error` only — errors are swallowed at lines 29 and 57. The attendance session/checkin writes silently fail with no retry or alert.

**`bot/src/routes/giving.js:92`**: `logMessageSent().catch(() => {})` — error silently suppressed; acceptable here (non-critical logging path).

**Remediation**:
1. Add a global Express error handler in `src/api/app.ts`:
   ```typescript
   app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
     console.error('[API] Unhandled error', err);
     res.status(500).json({ error: 'An unexpected error occurred.' });
   });
   ```
2. Add observability for silently-failing DB writes in `attendance.service.js` (at minimum, log a structured warning to a monitoring service).

---

#### err-02 Error Propagation — Score: 6/10

**Evidence**:

**HTTP status codes**: Consistent and correct throughout:
- 400 for validation errors, 401 for auth failures, 403 for permission errors, 404 for not-found, 409 for conflict, 429 for rate-limit, 503 for unconfigured providers.

**Error response format**: `{ error: string }` is used consistently across all API routes. Some responses include an additional `code` field (e.g., `admin.routes.ts:118`: `{ error: "...", code: "OTP_REQUIRED" }`). This pattern is consistent within the auth flow.

**`giving.routes.ts` confirm endpoint (lines 892–933)**: `getTransactionByReference` can throw (DB error) but is not wrapped in try/catch — the rejected promise will bubble to Express 5's error handler, returning an unformatted error instead of the contract JSON.

**`giving.routes.ts:636–640`**: The reference-uniqueness loop (`while (await referenceExists(reference))`) has no iteration limit — theoretically an infinite loop under DB failure.

**Bot layer**: All route handlers in `bot/src/routes/admin.js` wrap with `try/catch` and return consistent `{ error: string }` objects.

**Remediation**:
1. Wrap `getTransactionByReference` calls in the confirm/abandon handlers with explicit try/catch.
2. Add a max-iteration guard (e.g., 5 retries) to the reference-generation loop in `giving.routes.ts:636`.

---

### REACT — Frontend Component Quality

#### react-01 Component Design — Score: 4/10

**Evidence**:

**God components** (confirmed by line counts):

| Component | Lines | Responsibilities |
|-----------|-------|------------------|
| `EventManager.jsx` | 1,761 | CRUD, form validation, category management, date filtering, newsletter sync, registration methods, delete confirm modal, audit logging |
| `Events.jsx` | 1,223 | Public event display, countdown timer, subscribe form, event modal, grid carousel, mobile detection, share dropdown |
| `MediaManager.jsx` | 1,215 | Media CRUD, YouTube parsing, file upload, approval, filtering, lightbox |
| `BlogManager.jsx` | 1,001 | Blog CRUD, versioning, workflow states, excerpt generation, scheduling |
| `GivingModal.jsx` | 870 | Paystack integration, crypto payment, bank transfer, fund selection, form validation, state management |

**Positive patterns**:
- `Admin.jsx` uses React `lazy` + `Suspense` for all sub-panels — correct code splitting (lines 26–50)
- Small, single-purpose components exist: `AdminModal`, `Dashboard`, `AuditLog`, `AttendanceManager`
- Props are typed in a few components (TypeScript props in the API layer)

**Negative patterns**:
- No TypeScript for React components — all `.jsx` (no `.tsx`), so no compile-time prop validation
- `VisitorManager.jsx:16–26` builds a `ui` object with theme styles inline in the component body on every render — this is a derived state object that should be memoised or moved to a CSS-variables approach
- Multiple components duplicate the theme object pattern: `VisitorManager.jsx:16`, `MediaManager.jsx:47`, `EventManager.jsx` — at minimum a `useThemeColors()` hook should centralise this

**Remediation**:
1. Split `EventManager.jsx` into at minimum: `EventList`, `EventForm`, `EventFilters`, and a `useEventCrud` hook.
2. Extract a `useAdminColors()` hook that returns the theme colour map, used in all admin panel components.
3. Migrate React components to `.tsx` to gain prop-type safety.

---

#### react-02 State Management — Score: 5/10

**Evidence**:
- State is kept at appropriate component level — no global state library, which is acceptable given the app's scale
- `Home.jsx` correctly uses `sessionStorage` as a cache for Sunday-mode detection with TTL validation (lines 29–51) — this is appropriate use of browser storage
- `Events.jsx` has 14 `useState` calls at lines 22–47 — high but each is named and specific
- No `useReducer` used for complex state — `Events.jsx` would benefit from a reducer for its form/modal/countdown state
- `useEffect` dependency arrays: inspected `Dashboard.jsx:47` — the effect has no deps array at all (`useEffect(() => { ... })`) — this means it fires on every render, a bug for a data-fetch effect

**Evidence of `useEffect` issue**:
```jsx
// Dashboard.jsx:47
useEffect(() => {
  let isMounted = true
  const loadDashboard = async () => { ... }
  loadDashboard()
  return () => { isMounted = false }
})  // ← no dependency array — runs on every render
```

**Remediation**:
1. Fix `Dashboard.jsx:47` — add `[]` as dependency array so the load runs once on mount.
2. Replace the 14-`useState` pattern in `Events.jsx` with `useReducer`.
3. Extract the `SessionStorage` Sunday-mode logic from `Home.jsx` into a `useSundayMode()` custom hook.

---

#### react-03 Performance Patterns — Score: 5/10

**Evidence**:
- `Admin.jsx` uses `React.lazy` for all 12 admin sub-panels — excellent code splitting
- `Admin.jsx` and several components use `useMemo` for filtered/sorted lists
- `useCallback` is used in `BotOpsManager.jsx:1` (imported) and `AuditLog.jsx:1`
- **Issue**: `VisitorManager.jsx:16–26` constructs the `ui` object on every render without `useMemo`:
  ```jsx
  const VisitorManager = () => {
    const { darkMode } = useAdminTheme()
    const ui = { panel: darkMode ? '#1a2235' : 'white', ... }  // new object every render
  ```
  This pattern appears in at least 4 admin components (`VisitorManager`, `MediaManager`, `EventManager`, and likely others given the identical pattern).
- `MediaManager.jsx:1` imports `useMemo` — it is used there. `VisitorManager.jsx:1` does not import `useMemo` — the `ui` object is unoptimised.
- No `React.memo` wrapping on any pure presentational sub-components found.
- `GivingModal.jsx` is a large, always-mounted component — no lazy loading for a component that is only shown when the giving button is clicked.

**Remediation**:
1. Wrap the `ui` theme-colour object in `useMemo(() => ({ ... }), [darkMode])` in all admin components, or replace with a centralised hook.
2. Lazy-load `GivingModal` — it is 870 lines and imports Paystack SDK code not needed on initial page load.
3. Apply `React.memo` to the `RoleBadge` sub-component in `AuditLog.jsx` and `AdminUsers.jsx` (it renders in list rows).

---

### DOCS — Documentation Quality

#### docs-01 Inline Documentation — Score: 5/10

**Evidence**:

**Positive**:
- `giving.routes.ts` has section-separator comments throughout: `// ── PostgreSQL pool (lazy-init)`, `// ── CORS origin whitelist`, `// ── Paystack Webhook`
- `bot/src/services/whatsapp.service.js` documents non-retryable Meta error codes with a comment: `// Non-retryable Meta error codes — permanent failures, do not retry`
- `lib/giving-utils.js:56–63` has a comment explaining the `toWeiString` placeholder limitation
- `attendance/services/attendance.service.js:10–60` is readable without comments due to good naming
- Magic numbers are named: `SESSION_DURATION_MS`, `AUTH_RL_WINDOW_MS`, `MAX_RATE_LIMIT_PER_MINUTE`, `LIVE_SERVICE_DURATION_MINUTES`

**Negative**:
- `bot/src/services/message-generator.service.js` starts with a `genderNameMap` of ~60 name→gender entries with no comment explaining the fallback logic, training data source, or known limitations
- `withCryptoVerificationLock` in `giving.routes.ts:271` — the serialisation approach (promise chaining) is non-obvious and deserves a why-comment
- WhatsApp inbound message routing in `bot/src/app.js` (lines 140–200, not fully read) handles delivery statuses and inbound messages without documenting the expected Meta webhook format
- The `WEEKLY_SERVICES` array in `Countdown.jsx:19` has a comment explaining the format but the `LIVE_SERVICE_DURATION_MINUTES` constant at line 23 has no context for why 180 minutes was chosen

**Remediation**:
1. Add a comment above `withCryptoVerificationLock` explaining why sequential promises are used instead of a mutex library.
2. Add a comment above `genderNameMap` citing that it is a heuristic for personalising WhatsApp greetings and listing accuracy caveats.
3. Document the Meta Webhook payload shape expected at `bot/src/app.js` with a link to the Meta API docs.

---

#### docs-02 API Documentation — Score: 4/10

**Evidence**:
- No OpenAPI / Swagger specification found anywhere in the repository
- No API markdown documentation file (checked `README.md`, `OPERATIONS.md`, `CONTRIBUTING.md` — none document API endpoints beyond high-level descriptions)
- `README.md` documents the project structure, quick start, and scripts, but not individual endpoint contracts
- `OPERATIONS.md` exists (seen in root listing) — not read in detail but likely covers operational concerns
- Auth requirements are enforced via `requireAdminAuth` / `requireAdminPermission` middleware but not documented externally
- Error codes (`OTP_REQUIRED`) are used in responses but not listed anywhere
- The bot's admin API (`BOT_ADMIN_API_KEY` header) is only documented via the `assertAdmin` implementation in `admin-auth.js`

**Remediation**:
1. Add an `API.md` or `docs/api.md` documenting at minimum: auth flow, giving endpoints, bot admin endpoints, and webhook formats.
2. Consider adopting `tspec` or a lightweight JSDoc-to-OpenAPI tool given the TypeScript API layer already has typed interfaces.

---

### TESTING — Test Coverage and Quality

#### test-01 Test Existence & Coverage — Score: 4/10

**Evidence**:

**Test files found** (9 total):

| File | Type | What it covers |
|------|------|----------------|
| `bot/tests/unit/identity.service.test.mjs` | Unit | Phone normalisation, email, hash, duplicate scoring |
| `bot/tests/unit/reminder.service.test.mjs` | Unit | Saturday dispatch window logic |
| `bot/tests/unit/template.repository.test.mjs` | Unit | Template rendering |
| `bot/tests/integration/visitor.repository.test.mjs` | Integration | DB visitor CRUD |
| `bot/tests/integration/attendance-history.repository.test.mjs` | Integration | Attendance history DB |
| `bot/tests/e2e/bot.api.test.mjs` | E2E | Bot HTTP routes (infra-skippable) |
| `tests/api-routing.test.mjs` | E2E | Website API routes (uses temp dir) |
| `attendance/tests/time-window.test.js` | Unit | Attendance window timing |
| `lib/giving-utils.test.mjs` | Unit | Giving reference, status, Paystack sig |

**Coverage gaps**:
- Zero tests for React components (no Jest/Vitest configuration found)
- Zero tests for `src/api/admin.routes.ts` (auth flow, TOTP, audit log)
- Zero tests for `src/api/giving.routes.ts` (the most security-critical route, handling real payments)
- No ESLint config — `npm run test` only runs `node --test bot/tests/unit/*.test.mjs`
- `npm run qa:ci` includes integration, e2e, accessibility, performance, and security smoke scripts — good CI gate structure

**Remediation**:
1. Add Vitest to `devDependencies` and configure a `vitest.config.js`
2. Write at minimum: `tests/giving.routes.test.ts` covering initialise, verify, webhook; `tests/admin.auth.test.ts` covering login, 2FA, rate-limit.
3. Consider a React Testing Library setup for `GivingModal` and `Admin` auth flow.

---

#### test-02 Test Quality — Score: 5/10

**Evidence**:

**Positive patterns**:
- `identity.service.test.mjs` tests edge cases: local format conversion, E.164 validation, email normalisation, deterministic hash
- `reminder.service.test.mjs` tests boundary conditions at window open/close/exact-second
- `bot/tests/e2e/bot.api.test.mjs` uses `test.before` / `test.after` lifecycle correctly; gracefully skips when infrastructure is unavailable (`canRunDbTests` / `canRunHttpTests` flags) — mature pattern
- `tests/api-routing.test.mjs` creates a real temp directory, seeds data files, and boots the full Express app — integration-style test, not just snapshot

**Negative patterns**:
- `reminder.service.test.mjs` only covers the dispatch window function — the more complex `buildServiceReminderBatch` and `buildEventReminderBatch` functions are untested
- The `bot/tests/e2e` test silently skips all DB-dependent assertions on infra failure — useful for local dev, but if CI is not properly configured with a test DB, coverage will be silently 0%
- No test for the `maskPhone` function — trivial to add, would have caught the duplication issue as a design smell earlier

**Remediation**:
1. Add tests for `buildServiceReminderBatch` and `buildEventReminderBatch` with mocked DB calls.
2. Add a CI check that fails if `canRunDbTests` is false in the CI environment (via `process.env.CI === 'true'` guard, which already exists — ensure the CI pipeline always provides a test DB).

---

## Top 10 Refactoring Priorities

Ordered by impact × effort:

1. **`bot/src/app.js:21`, `bot/src/routes/giving.js:12`, `bot/src/services/opt-out.service.js:4`, `src/api/giving-admin.routes.ts:30`** — Extract `maskPhone` into a shared utility (`bot/src/utils/privacy.js` and `src/api/utils/privacy.ts`). Zero functional risk, eliminates confirmed 4-way duplication, 30-minute fix.

2. **`src/api/app.ts`** — Add a global Express error handler as the last middleware before returning the app. One-day fix that closes the unhandled-rejection gap and establishes a structured error contract for the frontend.

3. **`src/pages/Admin/components/EventManager.jsx:1–1761`** — Split into `EventList.jsx`, `EventForm.jsx`, `EventFilters.jsx`, and a `useEventCrud` hook. Largest file in the project; current size makes PR review and debugging nearly impossible.

4. **`src/api/giving.routes.ts:1–918`** — Split into `giving.config.ts`, `giving.db.ts`, `giving.handlers.ts`, `giving.webhook.ts`. The payment route is the most security-sensitive code in the project; isolating the webhook handler enables independent security review.

5. **`src/pages/Admin/components/Dashboard.jsx:47`** — Add `[]` dependency array to the data-fetch `useEffect`. A missing dependency array causes re-fetching on every render; this is a live performance bug.

6. **`src/api/admin.routes.ts:524–653`** — Extract inline analytics aggregation into `src/api/analytics.service.ts`. Separates business logic from routing, enables unit testing the aggregation logic.

7. **`src/pages/Admin/components/AdminUsers.jsx:34` + `src/pages/Admin/components/AuditLog.jsx:18`** — Deduplicate `ROLE_META` into a shared `src/utils/adminConstants.js`. Currently the only source of role display metadata is duplicated — any role addition must be made in two places.

8. **`src/api/admin.routes.ts:17–40` + `src/api/giving.routes.ts:556–582`** — Extract rate-limiter factory into `src/api/middleware/rateLimit.ts`. The copy-paste includes subtle differences (window size, max requests) that will diverge further over time.

9. **`src/api/giving.routes.ts:636–640`** — Add a maximum retry cap to the reference-generation loop. An unbounded `while` loop over a DB call is a latency/hang risk under degraded DB conditions.

10. **Add ESLint + `eslint-plugin-react-hooks`** — There is no ESLint configuration in the repository. The missing `useEffect` dependency array (item 5) and several other issues would be caught automatically. A 2-hour setup pays dividends on every future commit.

---

## Technical Debt Inventory

| Item | File | Lines | Severity | Effort |
|------|------|-------|----------|--------|
| `maskPhone` duplicated in 4 files | `bot/src/app.js:21`, `bot/src/routes/giving.js:12`, `bot/src/services/opt-out.service.js:4`, `src/api/giving-admin.routes.ts:30` | 5 ea | High | Low (1 day) |
| God component — EventManager | `src/pages/Admin/components/EventManager.jsx` | 1,761 | High | High (3 days) |
| God component — Events (public) | `src/pages/Events/Events.jsx` | 1,223 | High | High (2 days) |
| God component — MediaManager | `src/pages/Admin/components/MediaManager.jsx` | 1,215 | High | High (2 days) |
| God component — BlogManager | `src/pages/Admin/components/BlogManager.jsx` | 1,001 | Medium | High (2 days) |
| God component — GivingModal | `src/components/features/GivingModal/GivingModal.jsx` | 870 | High | High (2 days) |
| Oversized route file — giving | `src/api/giving.routes.ts` | 918 | High | Medium (1.5 days) |
| No global Express error handler | `src/api/app.ts` | — | High | Low (2 hrs) |
| Unguarded `useEffect` (no dep array) | `src/pages/Admin/components/Dashboard.jsx:47` | 1 | High | Low (5 min) |
| Duplicate rate-limiter boilerplate | `src/api/admin.routes.ts:17–40`, `src/api/giving.routes.ts:556–582` | ~25 ea | Medium | Low (4 hrs) |
| Duplicate `ROLE_META` constant | `src/pages/Admin/components/AdminUsers.jsx:34`, `src/pages/Admin/components/AuditLog.jsx:18` | 10 ea | Medium | Low (30 min) |
| Duplicate `formatRelativeTime` | `src/pages/Admin/Admin.jsx:65`, `src/pages/Admin/components/Dashboard.jsx:6` | 10 ea | Low | Low (30 min) |
| Duplicate `formatDateTime` | `src/pages/Admin/components/BotOpsManager.jsx:40`, `src/pages/Admin/components/GivingManager.jsx:43` | 5 ea | Low | Low (30 min) |
| No ESLint configuration | repo root | — | High | Low (2 hrs) |
| No React tests | `src/pages/`, `src/components/` | — | High | High (ongoing) |
| No API route tests for giving/auth | `src/api/giving.routes.ts`, `src/api/admin.routes.ts` | — | High | High (3 days) |
| TODO: email password reset token | `src/api/admin.routes.ts:258` | 1 | Medium | Medium (1 day) |
| Unbounded reference-gen loop | `src/api/giving.routes.ts:636` | 3 | Medium | Low (30 min) |
| Attendance DB writes silently swallowed | `attendance/services/attendance.service.js:29,57` | 2 | Medium | Low (1 hr) |
| `toWeiString` placeholder logic | `lib/giving-utils.js:55–64` | 10 | Low | Medium |
| No attendance README | `attendance/` | — | Low | Low (1 hr) |
| Unthemed `ui` object computed each render | `src/pages/Admin/components/VisitorManager.jsx:16` (and ~3 others) | ~15 ea | Low | Low (2 hrs) |
| `normalizeBankDetails` duplicated | `src/api/giving.routes.ts:48–68`, `src/components/features/GivingModal/GivingModal.jsx:30–50` | ~20 ea | Medium | Low (2 hrs) |

---

## Notes on Evidence Gaps

1. **`bot/src/config/`** and **`bot/src/db/`** directories were listed but not read in detail. The DB connection setup and env config schema are assumed to follow the patterns seen in called modules. No issues were inferred but cannot be confirmed.

2. **`src/api/newsletter.routes.ts`** and **`src/api/media.routes.ts`** were not read. They appear in `app.ts` imports but were not in the top-30 large-files list, suggesting they are reasonably sized. No score penalty applied.

3. **`bot/src/services/analytics.service.js`** and **`bot/src/services/inbound-conversation.service.js`** were not read. The inbound conversation handler is likely the most complex bot-side logic; complexity score for `bot/src/` is conservatively estimated.

4. **`src/pages/Blog/Blog.jsx`** (516 lines) and **`src/pages/Team/Team.jsx`** (514 lines) were not read in detail but are noted above the 300-line threshold; they are counted against the struct-02 score.

5. **No Vitest or Jest config was found** — it is possible a test configuration exists under a non-standard path. The absence is confirmed for the project root and `bot/` root.

6. **React component TypeScript migration**: All React files are `.jsx`. It is possible the project intentionally chose not to type the React layer — this is noted but not assumed to be an oversight.
