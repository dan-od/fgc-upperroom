# Project Guidelines

## Build and Run
- Install dependencies with `npm install`.
- Frontend dev stack: `npm run dev` (Vite on port 3000 + media API sidecar on port 3001).
- Website API for sermons: `npm run dev:server` (Express `server.ts`).
- Bot API: `npm run bot:dev` (port 4100).
- Bot worker (required for queued reminder delivery): `npm run bot:worker`.
- Production build: `npm run build` and verify with `npm run preview`.
- Bot readiness and behavior checks: `npm run bot:validate`, `npm run bot:test-messages`, `npm run bot:load-test`.

## Architecture
- This repository has two primary runtimes:
  - Website app (`src/`) built with React + Vite.
  - Church bot service (`bot/src/`) built with Express + PostgreSQL + Redis + BullMQ.
- Keep route handlers thin and move business logic into services/repositories:
  - Bot route files in `bot/src/routes/` should delegate to `*.service.js` and `*.repository.js`.
- Queue/scheduler boundaries for bot:
  - Scheduling belongs in `bot/src/scheduler/`.
  - Job execution and rate limiting belong in `bot/src/workers/`.
  - Queue definitions stay in `bot/src/queue/`.
- Frontend page-level code belongs in `src/pages/`, reusable UI in `src/components/`, and browser persistence helpers in `src/utils/*Storage.js`.

## Conventions
- Use existing file conventions:
  - Frontend components/pages: `.jsx`.
  - Shared types/constants: `.ts` where already present.
  - Bot modules: `.js` with ESM imports/exports.
- Frontend env access must use `import.meta.env.VITE_*` (never `process.env` in browser code).
- Keep CSS colocated with components/pages where the repo already follows that pattern.
- For persistence in the frontend admin tools, follow existing storage utility patterns in `src/utils/` before introducing new abstractions.
- Prefer incremental edits that preserve existing API shapes and route contracts.
- Reduce use of comments in favor of clear code structure and naming, especially in the bot service where logic can be complex. Use comments to clarify intent when necessary, but strive for self-explanatory code.
- For bot scheduling logic, be mindful of timezone handling and edge cases around daylight saving time, as the bot operates on `Africa/Lagos` time semantics.
- Make sure to update the `README.md` and `DEPLOYMENT.md` files in the `bot/` directory with any changes that affect deployment steps, environment variables, or runtime behavior of the bot service.
- Make sure to update this instructions file with any changes that affect build/run commands, architectural patterns, or conventions to keep the guidelines up to date for future contributors.

## Environment and Pitfalls
- Vite base path is configured as `/fgc-testing/`; preserve this unless deployment requirements change.
- `/bot/*` requests in frontend dev are proxied to `http://localhost:4100`; bot API must be running for those routes.
- Admin authentication currently reads `VITE_ADMIN_PASSWORD` in frontend code.
- Bot scheduler is controlled by `ENABLE_SCHEDULER`; reminders will not auto-enqueue when it is `false`.
- Bot uses `Africa/Lagos` timezone semantics for schedule calculations; be careful when modifying reminder timing logic.

## Key Reference Files
- `package.json`
- `vite.config.js`
- `server.ts`
- `src/App.jsx`
- `src/pages/Admin/Admin.jsx`
- `src/utils/blogStorage.js`
- `bot/src/index.js`
- `bot/src/config/env.js`
- `bot/src/scheduler/reminder.scheduler.js`
- `bot/src/workers/reminder.worker.js`
- `bot/README.md`
- `bot/DEPLOYMENT.md`