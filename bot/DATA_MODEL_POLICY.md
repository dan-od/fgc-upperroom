# P2 Data Model Policy (Duplicate, Phone, Retention, Privacy)

Last updated: 2026-03-24

## 1) Phone Validation Strategy

- All inbound phone values are normalized to E.164 format (`+234...` for local NG defaults).
- Accepted canonical format: `/^\+[1-9]\d{9,14}$/`.
- Visitor writes are rejected when phone values do not normalize into valid E.164.
- Hashes (`phone_hash`) are stored for matching and privacy-safe joins.

## 2) Duplicate Detection Rules

Duplicate candidates are detected with confidence scoring:

- `exact_phone` (high confidence)
- `exact_email` (high confidence)
- `name_plus_last7_phone` (medium confidence)

Matches with score `>= 70` are persisted in `visitor_duplicates` for review/merge decisions.

## 3) Member Lifecycle States

Supported states:

- `new`
- `active`
- `inactive`
- `moved`

Lifecycle updates are tracked in `member_profiles` and mirrored to `visitors.member_state`.

## 4) Retention and Soft Delete

Soft delete fields are used before purge:

- `deleted_at`
- `deleted_reason`
- `purge_after`

Default retention windows:

- Prayer requests / RSVPs / member profiles: 30 days after soft delete
- Visitor soft-delete records: 90 days (or immediate privacy erase flow)
- Attendance history: purge records older than 730 days
- Resolved duplicate-review records: purge after 180 days

## 5) Privacy Controls

- `POST /bot/api/privacy/visitors/:id/soft-delete` marks records non-contactable.
- `POST /bot/api/privacy/visitors/:id/erase` redacts visitor PII and soft-deletes related prayer/RSVP/member records.
- `POST /bot/api/privacy/retention/run` executes retention purge.

## 6) Operational Notes

- Admin-protected endpoints require `x-bot-admin-key`.
- Attendance sync endpoints support `x-attendance-sync-key` when configured.
