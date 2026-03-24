# Backup and SSL Drill Log

## 2026-03-23 UTC

### Backup + Restore Drill

- Command: `npm run ops:backup-drill`
- Status: PASS
- PostgreSQL row-count parity:
  - `visitors`: 6 -> 6
  - `events`: 0 -> 0
  - `messages`: 6 -> 6
  - `opt_outs`: 0 -> 0
  - `scheduled_jobs`: 0 -> 0
- Redis parity:
  - source `DBSIZE`: 11
  - restored drill `DBSIZE`: 11

Raw drill artifacts were generated under `bot/drills/20260323-223928/` on the operator machine.

### HTTPS/SSL Verification

- Status: Pending production run
- Verification command is ready:
  - `BOT_PUBLIC_BASE_URL=https://<production-bot-domain> npm run ops:verify-https`
- Note: final verification requires the actual live bot domain to be configured in environment.
