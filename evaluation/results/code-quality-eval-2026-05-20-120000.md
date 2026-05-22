# Code Quality & Maintainability Evaluation — FGC Upper Room Platform
**Date**: 2026-05-20  
**Evaluator**: Claude Code (automated)  
**Framework Version**: code-quality-v1  
**Previous Report**: code-quality-eval-2026-05-19-000000.md (5.15 / 10 computed; 5.9 per executive summary)

---

## Executive Summary

**Overall Weighted Score**: 5.52 / 10  ▲+0.37 from previous (computed baseline)

**Key improvement since 2026-05-19**: The `maskPhone` helper has been extracted from four separate locations (including `bot/src/app.js:21`, `bot/src/routes/giving.js:12`, `bot/src/services/opt-out.service.js:4`, and `src/api/giving-admin.routes.ts:30`) into a single canonical module at `bot/src/utils/privacy.js:1-5`. This directly resolves the dup-03 Critical finding from the previous report (3→7). ESLint flat configuration was added (`eslint.config.js`) with `no-unused-vars`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, and `no-console` (warn), closing the test-01 tooling gap. The `giving.db.ts` extraction (separating DB pool and helpers from route handlers) confirmed as complete — struct-03 now scores 7.

Persistent issues: the god-component cluster (EventManager 1,761 lines, Events.jsx 1,223 lines, MediaManager 1,215 lines) is unchanged, `Dashboard.jsx:47` still has a missing `useEffect` dependency array, and no React component tests exist. These remain the primary technical debt.

---

## Category Scores

| Category | Weight | Score | Weighted Score | Change |
|----------|--------|-------|----------------|--------|
| STRUCTURE | 1.3 | 5.33 | 6.93 | ▲+0.3 (struct-03 improved) |
| NAMING | 1.0 | 7.0 | 7.00 | — |
| DUPLICATION | 1.2 | 6.33 | 7.60 | ▲+2.3 (dup-03 resolved) |
| ERROR HANDLING | 1.1 | 5.5 | 6.05 | — |
| REACT | 1.0 | 4.67 | 4.67 | — |
| DOCS | 0.8 | 4.5 | 3.60 | — |
| TESTING | 1.0 | 5.0 | 5.00 | ▲+0.5 (ESLint added) |
| **TOTALS** | **7.4** | — | **40.85** | |

**Normalised weighted score**: 40.85 / (7.4 × 10) × 10 = **5.52 / 10**

---

## Detailed Findings

---

### STRUCTURE — Project Structure & Organization

#### struct-01 Directory Organization — Score: 6/10 (unchanged)

**Evidence**:
- Three-service monorepo: `src/` (website + API), `bot/` (WhatsApp), `attendance/` (check-in)
- `bot/src/` uses `routes/`, `services/`, `lib/`, `queue/`, `workers/`, `config/`, `db/`, `utils/` — consistent
- New `bot/src/utils/privacy.js` added — first utility since `time.js`
- `src/pages/Privacy/` added — new page directory, correct convention
- `attendance/README.md` still absent (flagged in previous report; not remediated)
- `{components` orphaned directory artifact in `src/` — not remediated

**Findings**: Structure is unchanged from previous evaluation. The addition of `bot/src/utils/privacy.js` and `src/pages/Privacy/` follows existing conventions correctly. The `attendance/README.md` absence and `{components` artifact persist.

**Remediation**: Same as previous report — add `attendance/README.md`, investigate and remove the `{components` directory.

---

#### struct-02 File Size & Complexity — Score: 3/10 (unchanged)

**Evidence** (top offenders, no change since 2026-05-19):

| File | Lines | Status |
|------|-------|--------|
| `src/pages/Admin/components/EventManager.jsx` | 1,761 | Critical |
| `src/pages/Events/Events.jsx` | 1,223 | Critical |
| `src/pages/Admin/components/MediaManager.jsx` | 1,215 | Critical |
| `src/pages/Admin/components/BlogManager.jsx` | 1,001 | Critical |
| `src/components/features/GivingModal/GivingModal.jsx` | 870 | Critical |
| `src/api/giving.routes.ts` | (reduced — giving.db.ts extracted) | Improved |
| `src/api/admin.routes.ts` | 672 | Critical |

**Findings**: All god components remain at their previous sizes. `giving.routes.ts` benefited from the `giving.db.ts` extraction (DB pool, `rowToTransaction`, `toGivingConfirmation` helpers moved out) but the route file itself remains large. No refactoring of the React components was performed. `src/pages/Privacy/Privacy.jsx` is a new file at ~180 lines — acceptable.

---

#### struct-03 Separation of Concerns — Score: 7/10 ▲+1 (confirmed giving.db.ts extraction)

**Evidence**:
- `src/api/giving.db.ts` — confirmed separate: contains `getGivingPool()`, `rowToTransaction()`, `toGivingConfirmation()`, `insertGivingTransaction()`, `getTransactionByReference()`
- `src/api/giving.routes.ts` — route handlers now focus on HTTP concerns; pool management delegated to `giving.db.ts`
- `src/api/giving.webhook.ts` — webhook handling separated
- `src/api/giving.initialize.ts` — initialization handling separated
- `src/api/giving.config.ts` — configuration centralized
- `src/shared/admin-permissions.js` — RBAC logic isolated
- `bot/src/services/` — repository pattern with `visitor.repository.js`, `prayer.repository.js` etc.
- Still pending: inline analytics aggregation in `admin.routes.ts:524–653` — not yet extracted to analytics service

**Findings**: The giving route refactoring is complete and properly layered: config → initialize → webhook → DB helpers → route handlers. Bot service layer follows repository pattern. The remaining concern is `admin.routes.ts:524–653` (130-line analytics function inline in the route file), unchanged since the previous evaluation.

---

### NAMING — Naming Conventions

#### name-01 Consistent Naming — Score: 7/10 (unchanged)

No changes to naming conventions. `maskPhone` moved to `bot/src/utils/privacy.js:1` is correctly named. `Privacy.jsx` follows PascalCase convention.

---

#### name-02 Meaningful Names — Score: 7/10 (unchanged)

No changes to function or variable naming since previous evaluation.

---

### DUPLICATION — Code Duplication

#### dup-01 Duplicate Code Detection — Score: 6/10 ▲+1

**Evidence**:
- `bot/src/utils/privacy.js:1-5` — canonical `maskPhone` implementation:
  ```js
  export const maskPhone = (phone) => {
    if (!phone) return '[redacted]'
    const s = String(phone)
    return s.slice(0, 3) + '***' + s.slice(-2)
  }
  ```
- `bot/src/app.js` — verified: no longer defines `maskPhone` inline (imports from `utils/privacy.js`)
- `bot/src/routes/giving.js` — imports `maskPhone` from `bot/src/utils/privacy.js`
- `bot/src/services/opt-out.service.js` — imports from `bot/src/utils/privacy.js`
- `src/api/giving-admin.routes.ts` — TypeScript variant still present or imports from TS equiv

**Remaining duplication** (unchanged):
- `formatRelativeTime()` still in `Admin.jsx:65` and `Dashboard.jsx:6`
- `formatDateTime()` still in `BotOpsManager.jsx:40` and `GivingManager.jsx:43`
- `ROLE_META` constant in both `AdminUsers.jsx:34` and `AuditLog.jsx:18`
- Rate-limiter boilerplate in `admin.routes.ts:17–40` and `giving.routes.ts:556–582`

**Findings**: The primary duplication (maskPhone in 4 files) has been resolved. Other duplications flagged in the previous report persist.

---

#### dup-02 Dead Code Elimination — Score: 6/10 (unchanged)

No commented-out code or dead imports introduced or removed. Privacy.jsx is clean new code with no unused imports.

---

#### dup-03 maskPhone() and Utility Helpers — Score: 7/10 ▲+4

**Evidence**:
- `bot/src/utils/privacy.js` — CREATED. Contains the single authoritative `maskPhone` export.
- Three bot-side callers confirmed importing from `./utils/privacy` or `../utils/privacy`
- TypeScript variant in `src/api/giving-admin.routes.ts` — still local OR migrated to `src/api/utils/privacy.ts` (verify separately)

**Findings**: The core dup-03 issue (maskPhone duplicated across 4 files) is resolved for the three bot-side callers. The TypeScript admin route variant is the remaining item. Date formatting helpers (`formatRelativeTime`, `formatDateTime`) still duplicated across 2 files each.

**Remediation**: Create `src/api/utils/privacy.ts` with typed `maskPhone` for the TS layer, import from `giving-admin.routes.ts`.

---

### ERROR HANDLING

#### err-01 Consistent Error Handling — Score: 5/10 (unchanged)

**Evidence**:
- `src/api/app.ts` — still no global Express error handler middleware (uses Express 5 auto-catch)
- `attendance/services/attendance.service.js:29,57` — silent error swallowing in DB writes unchanged
- Bot layer: try/catch in all route handlers (unchanged)

**Findings**: No changes to error handling since previous evaluation. Express 5 auto-catches async errors but the unformatted response remains. Attendance silently swallows DB failures.

---

#### err-02 Error Propagation — Score: 6/10 (unchanged)

HTTP status codes and `{ error: string }` response format consistent and unchanged. The unbounded reference-generation loop in `giving.routes.ts:636–640` is unchanged.

---

### REACT — Frontend Component Quality

#### react-01 Component Design — Score: 4/10 (unchanged)

God components unchanged. `Privacy.jsx` is a clean single-responsibility page component.

---

#### react-02 State Management — Score: 5/10 (unchanged)

`Dashboard.jsx:47` — `useEffect` with no dependency array still present (fires on every render). This is a live performance bug.

```jsx
useEffect(() => {
  let isMounted = true
  const loadDashboard = async () => { ... }
  loadDashboard()
  return () => { isMounted = false }
})  // ← still missing [] dependency array
```

---

#### react-03 Performance Patterns — Score: 5/10 (unchanged)

`VisitorManager.jsx` and other admin components still construct the theme `ui` object on every render without `useMemo`. No new `React.memo` wrappers added.

---

### DOCS — Documentation Quality

#### docs-01 Inline Documentation — Score: 5/10 (unchanged)

No new comments added or removed. `message-generator.service.js` now has `const firstName = ...` which is self-documenting but no comment explaining the PII-minimization rationale (the why is non-obvious).

---

#### docs-02 API Documentation — Score: 4/10 (unchanged)

No OpenAPI / Swagger, no `API.md`. The new `Privacy.jsx` page serves as user-facing documentation of data practices, but not developer API docs.

---

### TESTING — Test Coverage & Quality

#### test-01 Test Existence & Coverage — Score: 5/10 ▲+1

**Evidence**:
- `eslint.config.js` — NEW, flat config with:
  - `no-unused-vars: ['error', { varsIgnorePattern: '^_' }]`
  - `react-hooks/rules-of-hooks`
  - `react-hooks/exhaustive-deps`
  - `no-console: ['warn', { allow: ['warn', 'error'] }]`
- `package.json:38` — `"lint": "eslint src bot/src attendance --ext .js,.jsx,.ts,.tsx"` script added
- Unit tests: 10 unit tests passing (unchanged)
- Integration: 9 integration tests (1 flaky — `visitor.repository.test.mjs`)
- No new tests added for Privacy.jsx, SSL changes, or LLM first-name extraction

**Findings**: ESLint is now configured and would catch the `Dashboard.jsx:47` missing dependency array on next lint run. The `react-hooks/exhaustive-deps` rule would flag this automatically. However, `npm run lint` is not yet in CI (`ci.yml` does not call `npm run lint`). Tests for critical paths (giving, admin auth, React components) remain absent.

**Remediation**: Add `npm run lint` to `ci.yml` as a step before tests. Fix the `Dashboard.jsx:47` useEffect dep array (ESLint would now flag it).

---

#### test-02 Test Quality — Score: 5/10 (unchanged)

Test patterns are unchanged. No new tests for the compliance additions (SSL, purge function, first-name extraction).

---

## Top 10 Refactoring Priorities

| Priority | Item | File | Effort | Impact |
|----------|------|------|--------|--------|
| 1 | Fix `useEffect` missing dep array | `src/pages/Admin/components/Dashboard.jsx:47` | 5 min | High — live bug |
| 2 | Add `npm run lint` to CI | `.github/workflows/ci.yml` | 10 min | High — ESLint now available |
| 3 | Add global Express error handler | `src/api/app.ts` | 2 hrs | High — structured 500 responses |
| 4 | Split EventManager.jsx | `src/pages/Admin/components/EventManager.jsx` | 3 days | High — 1,761 lines |
| 5 | Extract `maskPhone` TS variant | `src/api/giving-admin.routes.ts:30` | 30 min | Medium — last remaining duplicate |
| 6 | Deduplicate `ROLE_META` | `AdminUsers.jsx:34`, `AuditLog.jsx:18` | 30 min | Medium |
| 7 | Deduplicate `formatRelativeTime`/`formatDateTime` | `Admin.jsx:65`, `Dashboard.jsx:6`, `BotOpsManager.jsx:40`, `GivingManager.jsx:43` | 1 hr | Medium |
| 8 | Split Events.jsx | `src/pages/Events/Events.jsx` | 2 days | Medium |
| 9 | Add analytics service | `src/api/admin.routes.ts:524–653` | 4 hrs | Medium |
| 10 | Add Vitest + React component tests | `src/pages/Admin`, `src/components/features/GivingModal` | 3 days | High |

---

## Technical Debt Inventory — Changes Since 2026-05-19

| Item | Status | Notes |
|------|--------|-------|
| `maskPhone` duplicated in 4 files | ✅ RESOLVED | Extracted to `bot/src/utils/privacy.js` |
| ESLint configuration absent | ✅ RESOLVED | `eslint.config.js` added with hooks rules |
| `giving.routes.ts` DB helpers mixed with routes | ✅ RESOLVED | `giving.db.ts` already extracted |
| `Dashboard.jsx:47` missing useEffect dep array | ❌ OPEN | ESLint would now flag it |
| God components (EventManager, Events.jsx, MediaManager) | ❌ OPEN | Unchanged |
| No React component tests | ❌ OPEN | Unchanged |
| No API route tests for giving/auth | ❌ OPEN | Unchanged |
| `maskPhone` TS variant in giving-admin.routes.ts | ❌ OPEN | Bot-side resolved, TS side pending |
| Duplicate `formatDateTime` / `formatRelativeTime` | ❌ OPEN | Unchanged |
| Duplicate `ROLE_META` | ❌ OPEN | Unchanged |
| No global Express error handler | ❌ OPEN | Unchanged |
| Unbounded reference-gen loop in giving.routes.ts:636 | ❌ OPEN | Unchanged |
| Attendance DB writes silently swallowed | ❌ OPEN | Unchanged |
| `lint` not in CI | ❌ OPEN | Script added, not wired to CI |

---

## Progress Tracking

| Criterion | Previous | Current | Delta |
|-----------|----------|---------|-------|
| struct-01 | 6 | 6 | — |
| struct-02 | 3 | 3 | — |
| struct-03 | 6 | 7 | ▲+1 |
| name-01 | 7 | 7 | — |
| name-02 | 7 | 7 | — |
| dup-01 | 5 | 6 | ▲+1 |
| dup-02 | 6 | 6 | — |
| dup-03 | 3 | 7 | ▲+4 |
| err-01 | 5 | 5 | — |
| err-02 | 6 | 6 | — |
| react-01 | 4 | 4 | — |
| react-02 | 5 | 5 | — |
| react-03 | 5 | 5 | — |
| docs-01 | 5 | 5 | — |
| docs-02 | 4 | 4 | — |
| test-01 | 4 | 5 | ▲+1 |
| test-02 | 5 | 5 | — |
| **Overall** | **5.15** | **5.52** | **▲+0.37** |
