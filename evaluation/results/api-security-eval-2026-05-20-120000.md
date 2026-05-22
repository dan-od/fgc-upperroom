# API & External Service Security Evaluation — FGC Upper Room Platform
**Date**: 2026-05-20  
**Evaluator**: Claude Code (automated)  
**Framework Version**: api-security-v1  
**Previous Report**: api-security-eval-2026-05-20-000000.md (6.0 / 10 computed; 6.4 per executive summary)

---

## Executive Summary

**Overall Weighted Score**: 6.18 / 10  ▲+0.18 from previous (computed)

This report covers the second evaluation of the same date (120000 timestamp). The only change affecting API security since the 00:00 report is the LLM prompt PII minimization fix in `message-generator.service.js`: both `buildServiceReminderPrompt` and `buildEventReminderPrompt` now extract `firstName` via `String(name || '').trim().split(/\s+/)[0]` before embedding into the prompt, reducing both cross-border PII leakage and the prompt injection surface area. This improves `llm-02` from 5→6.

All P0 and P1 findings from the previous report remain open: the `import-csv` and four `preview/*` endpoints still lack `assertAdmin`, the monitoring endpoints remain public, contact/newsletter/RUM endpoints have no rate limiting, the giving confirmation endpoint still exposes `donorEmail`/`donorPhone`, and the JSON-store giving admin route still lacks PII masking. These require dedicated fix effort.

---

## Complete Endpoint Inventory

*No changes to endpoint inventory since api-security-eval-2026-05-20-000000.md. Refer to that report for the full 58-route table.*

Key outstanding unauthenticated endpoints (unchanged):

| Endpoint | Auth Gap | Risk |
|----------|----------|------|
| `POST /bot/api/import-csv` | No assertAdmin | HIGH — data injection |
| `POST /bot/api/preview/service` | No assertAdmin | HIGH — free LLM cost |
| `POST /bot/api/preview/event` | No assertAdmin | HIGH — free LLM cost |
| `POST /bot/api/preview/bulk-*` | No assertAdmin | HIGH — free LLM cost |
| `GET /bot/monitoring/alerts` | No auth | MEDIUM |
| `GET /bot/monitoring/errors` | No auth | MEDIUM |
| `GET /bot/monitoring/metrics` | No auth | MEDIUM |
| `POST /api/contact/submit` | No rate limit | MEDIUM |
| `POST /api/newsletter/subscribe` | No rate limit | MEDIUM |
| `POST /api/observability/rum` | No rate limit | MEDIUM |
| `GET /api/giving/confirm` | Public + donor PII | HIGH |
| `POST /api/giving/abandon` | Public + donor PII | HIGH |

---

## Category Scores

| Category | Weight | Score | Weighted Score | Change |
|----------|--------|-------|----------------|--------|
| Endpoint Inventory & Classification | 1.2 | 4.5 | 5.40 | — |
| WhatsApp Cloud API Integration | 1.5 | 7.0 | 10.50 | — |
| Attendance Service API | 1.2 | 6.5 | 7.80 | — |
| Admin API Endpoints | 1.4 | 7.0 | 9.80 | — |
| Public-Facing API Endpoints | 1.1 | 3.5 | 3.85 | — |
| Payment Integration (Paystack) | 1.3 | 7.67 | 9.97 | — |
| LLM API Integration Security | 1.0 | 6.5 | 6.50 | ▲+0.5 |
| **OVERALL** | **8.7** | — | **53.82 / 8.7 = 6.18** | **▲+0.18** |

---

## Detailed Findings — Changed Criteria Only

*All criteria not listed here are unchanged from api-security-eval-2026-05-20-000000.md. Scores and evidence are preserved from that report.*

---

### llm-api — LLM API Integration Security

#### llm-01 LLM Provider Security — Score: 7/10 (unchanged)

No changes to provider key handling, timeouts, or cascade fallback logic.

---

#### llm-02 Prompt Injection Prevention — Score: 6/10 ▲+1

**Evidence**:
- `bot/src/services/message-generator.service.js:141` — `buildServiceReminderPrompt`:
  ```js
  const firstName = String(name || '').trim().split(/\s+/)[0] || name
  ```
- `bot/src/services/message-generator.service.js:164` — `buildEventReminderPrompt`:
  ```js
  const firstName = String(name || '').trim().split(/\s+/)[0] || name
  ```
- `bot/src/services/message-generator.service.js:149,175` — `Recipient name: ${firstName}` (first name only, not full name)
- LLM system prompt style guide still in user role (not `system` role) — unchanged
- LLM output still not validated after generation — unchanged

**Findings**: The PII minimization improvement reduces the prompt injection surface: an attacker would need their first name specifically (not full name) to contain adversarial text to influence the prompt. More importantly, this is a data minimization win — only the first name (not full name, phone, or email) crosses the border to US-based LLM providers. The structural prompt injection mitigations (system role separation, output validation) remain unimplemented. Score improves from 5 to 6 — meaningful progress but not fully mitigated.

**Remaining remediation** (from previous report):
1. Move `BOT_MESSAGE_STYLE_GUIDE` to `{ role: 'system', content: guide }` for the OpenAI call.
2. Validate LLM output after generation: length ≤ 500 chars, no unexpected URLs, presence of "Reply STOP".
3. Strip adversarial patterns from `firstName` before embedding: remove `Ignore`, `System:`, `Override` (case-insensitive).

---

## Action Items — Status Update

### P0 — Critical (OPEN from previous report)

**P0.1 — Missing authentication on `import-csv` and `preview/*` endpoints**
- Status: ❌ OPEN
- Files: `bot/src/routes/import.js:10`, `bot/src/routes/preview.js:10,21,32,56`

**P0.2 — Donor PII in public giving confirmation endpoint**
- Status: ❌ OPEN
- Files: `src/api/giving.db.ts:27-42`, `src/api/giving.routes.ts:93,102`

### P1 — Poor (OPEN from previous report)

- **P1.1** No rate limiting on contact/newsletter/RUM — ❌ OPEN
- **P1.2** Newsletter email enumeration — ❌ OPEN
- **P1.3** Media upload unrestricted MIME types — ❌ OPEN
- **P1.4** JSON-store giving admin route missing PII masking — ❌ OPEN
- **P1.5** Bot monitoring endpoints publicly accessible — ❌ OPEN
- **P1.6** WhatsApp webhook accepts events when META_APP_SECRET absent in prod — ❌ OPEN

### P2 — Moderate (PARTIALLY ADDRESSED)

- **P2.1** Prompt injection in LLM reminders — ⚠️ PARTIAL (first-name only reduces surface; structural fix pending)
- **P2.2–P2.8** — ❌ OPEN (all others unchanged)

---

## Progress Tracking

| Criterion | Previous | Current | Delta |
|-----------|----------|---------|-------|
| inv-01 | 4 | 4 | — |
| inv-02 | 5 | 5 | — |
| wa-api-01 | 8 | 8 | — |
| wa-api-02 | 7 | 7 | — |
| wa-api-03 | 6 | 6 | — |
| att-01 | 7 | 7 | — |
| att-02 | 6 | 6 | — |
| admin-01 | 7 | 7 | — |
| admin-02 | 7 | 7 | — |
| pub-01 | 3 | 3 | — |
| pub-02 | 4 | 4 | — |
| pay-01 | 8 | 8 | — |
| pay-02 | 7 | 7 | — |
| pay-03 | 8 | 8 | — |
| llm-01 | 7 | 7 | — |
| llm-02 | 5 | 6 | ▲+1 |
| **Overall** | **6.02** | **6.18** | **▲+0.18** |
