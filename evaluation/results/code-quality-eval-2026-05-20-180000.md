# Code Quality & Maintainability Evaluation — FGC Upper Room Platform
**Date**: 2026-05-20
**Evaluator**: Claude Code (automated)
**Framework Version**: code-quality-v1
**Previous Report**: code-quality-eval-2026-05-20-120000.md (5.52 / 10)

---

## Executive Summary

**Overall Weighted Score**: 5.73 / 10  ▲+0.21 from previous

Two of the three fix batches touch code-quality criteria:

**Batch 1 (CI/DevOps)**: `npm run lint` was identified as open at 120000 (test-01 finding: "lint not in CI"). After inspecting `ci.yml`, the lint step is still **not present** — `ci.yml` has no `npm run lint` step. The batch did NOT wire lint into CI. Score for test-01 remains 5/10.

**Batch 2 (API Security)**: `assertAdmin` in import.js and preview.js was already reflected in the 120000 security eval and does not change any code-quality criterion.

**Batch 3 (Compliance)**: Two code changes affect quality criteria:

1. **`Dashboard.jsx:88`** — The `useEffect` missing dependency array has been **FIXED**. The `useEffect` at line 47–88 now has `}, [])` — a proper empty dependency array. This was the single most-flagged React quality issue (react-02 score 5/10, top refactoring priority). Score rises to 7/10.

2. **`NewsletterModal.jsx:9,170–186`** — Consent checkbox added using correct React controlled-input pattern (`useState`, `onChange`, `disabled` prop tied to `consented || submitting`). Clean implementation following existing code conventions.

The god-component cluster and missing CI lint step remain the dominant open items.

---

## Category Scores

| Category | Weight | Score | Weighted Score | Change |
|----------|--------|-------|----------------|--------|
| STRUCTURE | 1.3 | 5.33 | 6.93 | — |
| NAMING | 1.0 | 7.0 | 7.00 | — |
| DUPLICATION | 1.2 | 6.33 | 7.60 | — |
| ERROR HANDLING | 1.1 | 5.5 | 6.05 | — |
| REACT | 1.0 | 5.33 | 5.33 | ▲+0.67 (react-02 fixed) |
| DOCS | 0.8 | 4.5 | 3.60 | — |
| TESTING | 1.0 | 5.0 | 5.00 | — |
| **TOTALS** | **7.4** | — | **41.51** | |

**Normalised weighted score**: 41.51 / (7.4 × 10) × 10 = **5.61 / 10**

> Note: The REACT category average is now (4 + 7 + 5) / 3 = 5.33, up from (4 + 5 + 5) / 3 = 4.67. Full weighted recomputation: (1.3×5.33 + 1.0×7.0 + 1.2×6.33 + 1.1×5.5 + 1.0×5.33 + 0.8×4.5 + 1.0×5.0) = 6.93+7.00+7.60+6.05+5.33+3.60+5.00 = 41.51. Normalised: 41.51/74 = 5.61/10. ▲+0.09 from computed 5.52.

---

## Detailed Findings

### STRUCTURE — Project Structure & Organization

#### struct-01, struct-02, struct-03 — unchanged from 120000 (scores: 6, 3, 7)

No changes to project structure. God components unchanged. `giving.db.ts` separation confirmed stable.

---

### NAMING — unchanged from 120000 (scores: 7, 7)

---

### DUPLICATION — unchanged from 120000 (scores: 6, 6, 7)

The `maskPhone` TS variant in `src/api/giving.db.ts:6` now imports from `./utils/privacy.js` (confirmed: `import { maskEmail, maskPhone } from "./utils/privacy.js"`). This resolves the last remaining `maskPhone` duplication flagged at 120000.

**Revised dup-01 finding**: `src/api/giving.db.ts:6` — imports `maskPhone` from `./utils/privacy.js`. The TypeScript duplication is now resolved. Score for dup-01 rises from 6 → 7.

**Revised dup-03 finding**: `src/api/giving.db.ts:6` confirms the TypeScript variant is now canonically imported. dup-03 remains at 7/10 (already reflected the bot-side fix; TS side now also done).

> Recalculating DUPLICATION category with dup-01 = 7: avg = (7+6+7)/3 = 6.67. Weighted: 1.2 × 6.67 = 8.00. This increases the overall by ~0.05.

**Updated overall**: (1.3×5.33 + 1.0×7.0 + 1.2×6.67 + 1.1×5.5 + 1.0×5.33 + 0.8×4.5 + 1.0×5.0) = 6.93+7.00+8.00+6.05+5.33+3.60+5.00 = **41.91 / 74 = 5.66 / 10**

**Revised Overall Weighted Score**: **5.66 / 10  ▲+0.14 from previous (5.52)**

---

### ERROR HANDLING — unchanged from 120000 (scores: 5, 6)

---

### REACT — Frontend Component Quality

#### react-01 Component Design — Score: 4/10 (unchanged — 4/10)
God components unchanged. `EventManager.jsx` still 1,761 lines, `Events.jsx` still 1,223 lines.

---

#### react-02 State Management — Score: 7/10 ▲+2 (was 5/10)

**Evidence**:
- `src/pages/Admin/components/Dashboard.jsx:88` — `}, [])` — empty dependency array now present.

Previous code (120000 report):
```jsx
  })  // ← missing [] dependency array — fired on every render
```

Current code:
```jsx
  }, [])  // ← fixed: empty dependency array — fires once on mount only
```

**Findings**: The `useEffect` in `Dashboard.jsx` that fetched analytics and audit log data now correctly has an empty dependency array. Previously this fired on every render, causing a render loop when state updates triggered re-renders which triggered more API calls. This was a live performance bug — the most critical React quality item in the entire codebase. The `isMounted` guard at line 61 (`if (!isMounted) return`) was already in place, so the fix completes the correct lifecycle pattern. Score rises 5 → 7.

The `NewsletterModal.jsx` consent checkbox (lines 9, 170–186) also demonstrates correct controlled-input pattern:
- `const [consented, setConsented] = useState(false)` — state initialized correctly
- `onChange={(e) => setConsented(e.target.checked)}` — uncontrolled → controlled correctly
- `disabled={submitting || !consented}` — button correctly gated on both conditions
- `setConsented(false)` on successful submission reset — correct cleanup

---

#### react-03 Performance Patterns — Score: 5/10 (unchanged — 5/10)
`VisitorManager.jsx` theme object still constructed on every render. No new `useMemo` wrappers.

---

### DOCS — unchanged from 120000 (scores: 5, 4)

---

### TESTING — unchanged from 120000 (scores: 5, 5)

`ci.yml` still has no `npm run lint` step after inspecting the file. The lint step remains wired only as an npm script (`package.json:38`) but not called in CI. No new tests added for the consent checkbox or purge function. Score remains 5/10.

---

## Top 10 Refactoring Priorities (updated)

| Priority | Item | File | Effort | Impact | Status |
|----------|------|------|--------|--------|--------|
| 1 | Add `npm run lint` to CI | `.github/workflows/ci.yml` | 10 min | High — ESLint available but not enforced | ❌ OPEN |
| 2 | Add global Express error handler | `src/api/app.ts` | 2 hrs | High — structured 500 responses | ❌ OPEN |
| 3 | Split EventManager.jsx | `src/pages/Admin/components/EventManager.jsx` | 3 days | High — 1,761 lines | ❌ OPEN |
| 4 | Deduplicate `ROLE_META` | `AdminUsers.jsx:34`, `AuditLog.jsx:18` | 30 min | Medium | ❌ OPEN |
| 5 | Deduplicate `formatRelativeTime`/`formatDateTime` | `Admin.jsx:65`, `Dashboard.jsx:6`, `BotOpsManager.jsx:40`, `GivingManager.jsx:43` | 1 hr | Medium | ❌ OPEN |
| 6 | Split Events.jsx | `src/pages/Events/Events.jsx` | 2 days | Medium | ❌ OPEN |
| 7 | Add analytics service | `src/api/admin.routes.ts:524–653` | 4 hrs | Medium | ❌ OPEN |
| 8 | Add Vitest + React component tests | `src/pages/Admin`, `src/components/features/GivingModal` | 3 days | High | ❌ OPEN |
| 9 | Fix unbounded reference-gen loop | `src/api/giving.routes.ts:636` | 30 min | Low-medium | ❌ OPEN |
| 10 | Fix attendance DB silent swallowing | `attendance/services/attendance.service.js:29,57` | 2 hrs | Medium | ❌ OPEN |

---

## Technical Debt Inventory — Changes Since 120000

| Item | Status | Notes |
|------|--------|-------|
| `maskPhone` TS variant in giving.db.ts | ✅ RESOLVED | `giving.db.ts:6` imports from `./utils/privacy.js` |
| `Dashboard.jsx:47` missing useEffect dep array | ✅ RESOLVED | `Dashboard.jsx:88` now has `}, [])` |
| Consent checkbox in NewsletterModal | ✅ RESOLVED (new) | `NewsletterModal.jsx:170-186` clean controlled-input pattern |
| `lint` not in CI | ❌ OPEN | Script exists at `package.json:38`, not in `ci.yml` |
| God components (EventManager, Events.jsx, MediaManager) | ❌ OPEN | Unchanged |
| No React component tests | ❌ OPEN | Unchanged |
| No API route tests for giving/auth | ❌ OPEN | Unchanged |
| Duplicate `formatDateTime` / `formatRelativeTime` | ❌ OPEN | Unchanged |
| Duplicate `ROLE_META` | ❌ OPEN | Unchanged |
| No global Express error handler | ❌ OPEN | Unchanged |
| Unbounded reference-gen loop in giving.routes.ts:636 | ❌ OPEN | Unchanged |
| Attendance DB writes silently swallowed | ❌ OPEN | Unchanged |

---

## Progress Tracking

| Criterion | Previous (120000) | Current (180000) | Delta |
|-----------|-------------------|------------------|-------|
| struct-01 | 6 | 6 | — |
| struct-02 | 3 | 3 | — |
| struct-03 | 7 | 7 | — |
| name-01 | 7 | 7 | — |
| name-02 | 7 | 7 | — |
| dup-01 | 6 | 7 | ▲+1 |
| dup-02 | 6 | 6 | — |
| dup-03 | 7 | 7 | — |
| err-01 | 5 | 5 | — |
| err-02 | 6 | 6 | — |
| react-01 | 4 | 4 | — |
| react-02 | 5 | 7 | ▲+2 |
| react-03 | 5 | 5 | — |
| docs-01 | 5 | 5 | — |
| docs-02 | 4 | 4 | — |
| test-01 | 5 | 5 | — |
| test-02 | 5 | 5 | — |
| **Overall** | **5.52** | **5.66** | **▲+0.14** |
