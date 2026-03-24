# Implementation TODOs from PROJECT_ANALYSIS.md

Source: `PROJECT_ANALYSIS.md` (sections 2 and 5)
Open items found: 140 unchecked tasks
Date generated: 2026-03-23

## P0 - Critical Fixes and Foundation

- [x] Fix repository/schema drift in visitor creation (`visitor.repository.js` vs `visitors` table `email` column mismatch).
- [x] Resolve bot reminder reliability issue where message records are written with `status = failed` after queue processing. (validated on 2026-03-23 with controlled queue run: job `6` persisted as `status = sent`; Meta live sends still require a valid token)
- [x] Validate environment parity for dev/staging/prod (required env keys, queue, DB, provider credentials).
- [x] Add and verify backup strategy for PostgreSQL and Redis persistence. (validated with local live drill on 2026-03-23; evidence logged in `bot/DRILL_LOG.md`)
- [ ] Confirm and document HTTPS/SSL setup for production. (runbook + `npm run ops:verify-https` added; final pass needs the live production bot URL configured as `BOT_PUBLIC_BASE_URL` or `VITE_BOT_API_URL`)
- [x] Add starter content: blog posts, testimonies, media gallery seed content.
- [x] Replace team placeholders with real photos or a better image fallback system.
- [x] Replace hardcoded sample events with dynamic events sourced from backend.

## P1 - Core User Experience

- [x] Add search across blog and media (title/topic/speaker/date). (implemented on 2026-03-23 in public Blog + Media filters)
- [x] Add calendar export/integration for events (Google/Outlook/iCal). (implemented in Events modal actions on 2026-03-23)
- [x] Add email newsletter signup and email sync for event communications.
- [x] Add auto-response flow for contact form submissions.
- [x] Add event reminder preferences (per-event subscriptions, frequency preferences). (implemented on 2026-03-24 with persisted visitor `reminder_preferences`, per-event/frequency API support, and Events page preference controls)
- [x] Improve mobile UX (navigation, forms, touch gestures, responsive polish). (implemented on 2026-03-24: header/menu behavior, modal interactions, touch targets, focus states, and responsive refinements on key public pages)
- [x] Implement public-site accessibility improvements (ARIA coverage, keyboard support). (implemented on 2026-03-24 across Home modal focus/escape trap + dialog semantics, Contact social link labels, and explicit form labels/status announcements)
- [x] Implement accessibility test pass and browser compatibility matrix. (implemented on 2026-03-24 with `npm run qa:accessibility` smoke checks and `ACCESSIBILITY_BROWSER_MATRIX.md`)

## P1 - Admin Security and Workflow

- [x] Move from single shared admin password to multi-admin accounts with RBAC. (implemented on 2026-03-24 with server-side admin users, role permissions, token sessions, and protected admin APIs under `/api/admin/*`)
- [x] Add admin audit logs (who changed what and when). (implemented on 2026-03-24 with persisted audit trail in `data/admin-audit-log.json`, API endpoints, and client-side content action logging)
- [x] Add admin 2FA and password reset mechanism. (implemented on 2026-03-24 with TOTP setup/verify/disable and password reset request/confirm endpoints + login UX support)
- [x] Add scheduled publishing for blog/events. (implemented on 2026-03-24 with scheduled statuses, scheduled timestamps, and auto-publish transitions in blog/event managers)
- [x] Add content version history and rollback support. (implemented on 2026-03-24 with per-item version snapshots and rollback actions for blog/events)
- [x] Add approval/review workflow for content publishing. (implemented on 2026-03-24 with draft → pending review → approved/published workflow actions in blog/events)
- [x] Add bulk editing for events/blog/media. (implemented on 2026-03-24 with multi-select and bulk status/category/delete actions)
- [x] Improve admin UX (destructive-action confirmations, last-updated timestamps). (implemented on 2026-03-24 by standardizing destructive confirmations and surfacing last-updated/scheduled metadata on content cards)

## P2 - Bot Feature Completion

- [ ] Send registration success acknowledgment message.
- [ ] Support WhatsApp event RSVPs.
- [x] Include direct event registration links in reminders. (implemented on 2026-03-24 by passing event registration URLs into reminder payloads and generated event reminder messages)
- [x] Add richer template system (dynamic templates, template storage in DB). (implemented on 2026-03-24 with `message_templates` table, render service, seeded defaults, and admin template management endpoints)
- [x] Add rich media message support (image/video broadcasts where supported). (implemented on 2026-03-24 in WhatsApp service + reminder worker with media payloads/captions and metadata-driven reminder media)
- [x] Add two-way conversational capabilities (FAQ, feedback collection, prayer request intake). (implemented on 2026-03-24 via inbound intent handling for FAQ/feedback/prayer and persisted feedback/prayer records)
- [x] Add user quiet hours and delivery-time optimization. (implemented on 2026-03-24 with reminder preference quiet-hours windows, preferred delivery hour, and deferred queue scheduling)
- [x] Add per-user timezone support (not just Africa/Lagos). (implemented on 2026-03-24 with visitor timezone capture from signup and timezone-aware delivery window evaluation)
- [x] Add holiday exception handling for reminders. (implemented on 2026-03-24 with `holiday_exceptions` table, admin CRUD, cached holiday checks, and holiday-aware reminder deferral)
- [x] Improve reliability controls (bounce handling, duplicate prevention, provider failover, circuit breaker, dynamic rate limits). (implemented on 2026-03-24 with delivery-failure tracking/blocking, message fingerprint dedupe, Meta->stub failover, circuit breaker, and adaptive send limits)

## P2 - Data Model and Product Expansion

- [x] Persist attendance history in long-term DB tables. (implemented on 2026-03-24 with `attendance_sessions`/`attendance_checkins` + attendance-to-bot sync flow)
- [x] Add prayer requests data model and management flows. (implemented on 2026-03-24 with `prayer_requests` table + `/bot/api/prayer-requests`)
- [x] Add event capacity limits and RSVP tracking model. (implemented on 2026-03-24 with event capacity columns + `event_rsvps` and RSVP APIs)
- [x] Add member profile model and lifecycle states (active/inactive/moved). (implemented on 2026-03-24 with `member_profiles` + lifecycle update APIs)
- [x] Define duplicate detection rules and phone validation strategy. (implemented on 2026-03-24 with normalized E.164 phone validation + duplicate scoring + `visitor_duplicates`)
- [x] Define retention policy, soft delete behavior, and privacy controls. (implemented on 2026-03-24 with policy doc + privacy/retention endpoints and soft-delete fields)

## P3 - Observability, QA, and Documentation

- [x] Add automated unit, integration, and E2E test suites for critical flows. (implemented on 2026-03-24 with Node test runner suites in `bot/tests/unit`, `bot/tests/integration`, and `bot/tests/e2e`; expanded coverage for RSVP capacity/waitlist, prayer-request workflow, member lifecycle sync, and privacy endpoints)
- [x] Integrate load/security/performance tests into CI/CD. (implemented on 2026-03-24 in `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` with `qa:load`, `qa:security`, and `qa:performance`)
- [x] Add uptime, error alerting, centralized logs, APM, and DB query monitoring. (implemented on 2026-03-24 with telemetry snapshots, slow query logging, request latency tracking, and `/bot/monitoring/metrics`)
- [x] Add real user monitoring for frontend performance. (implemented on 2026-03-24 with web-vitals-lite capture in `src/utils/rum.js` and ingest endpoint `/api/observability/rum`)
- [x] Expand API docs with request/response examples. (implemented on 2026-03-24 in `OPERATIONS.md`)
- [x] Document DB schema with entity relationships and lifecycle notes. (implemented on 2026-03-24 in `OPERATIONS.md`)
- [x] Add architecture diagrams and troubleshooting runbook. (implemented on 2026-03-24 with architecture diagrams in `README.md` and runbook section in `OPERATIONS.md`)
- [x] Add security hardening guide and baseline secure defaults. (implemented on 2026-03-24 in `OPERATIONS.md` and enforced in route/admin auth + security headers)

## P4 - Strategic Features (After Core Stabilization)

- [ ] Member portal login and personalized dashboard.
- [ ] Small groups system (directory, schedules, resources).
- [ ] Online giving platform and giving record management.
- [ ] Live streaming and video-on-demand integration.
- [x] Advanced analytics dashboard and segmentation.
- [ ] CRM/ChMS integrations (Breeze, Planning Center, others) - pending explicit go-ahead.
- [x] Language support and localization.
- [ ] PWA/mobile app roadmap.
