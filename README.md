# FGC Upper Room Mgbuoba Website v2.0

Modern React-based website and WhatsApp bot for FGC Upper Room Mgbuoba - the youth fellowship of Foursquare Gospel Church, Mgbuoba Zonal HQ.

## 🚀 Quick Start

```bash
npm install                  # Install dependencies
npm run dev                  # Start backend services (media API + bot + worker + attendance)
npm run dev:web              # Start website only (localhost:3000)
npm run env:parity           # Verify env template parity (dev/staging/prod)
npm run ops:backup-drill     # Run PostgreSQL + Redis backup/restore drill
```

## 📦 What's Inside

- **Website**: Multi-page React app with advanced media gallery, blog, events, and contact
- **WhatsApp Bot**: Automated service reminders and event notifications with Redis queue
- **OpenClaw Sidecar (Optional)**: Operator-facing AI gateway that can ingest bot alert digests
- **Admin Center**: Content management at `/admin` (events, media, blog posts)
- **YouTube Integration**: Auto-sync sermons from YouTube channel
- **Full-Stack**: Express + Vite with TypeScript support

## 📁 Project Structure

```
src/
├── pages/               # Public routes + Admin center
│   ├── Home/            # Landing page with hero & countdown
│   ├── Media/           # Advanced gallery with filtering & pagination
│   ├── Blog/            # Articles, devotionals, Sunday school
│   ├── Events/          # Upcoming programs
│   ├── Admin/           # 🔒 Content management (events, media, blog)
│   └── ...
├── components/          # Reusable UI & layout components
bot/
├── src/                 # WhatsApp bot backend
│   ├── routes/          # API endpoints (visitors, events, messages)
│   ├── services/        # WhatsApp, LLM, analytics services
│   └── workers/         # Queue workers for reminders
└── db/schema.sql        # PostgreSQL database schema
```

## 🧭 Architecture Diagrams

```mermaid
flowchart LR
  U[Users]
  W[React Website<br/>Vite SPA]
  API[Website API<br/>server.ts]
  BOT[Bot API<br/>Express]
  WORKER[Reminder Worker<br/>BullMQ]
  REDIS[(Redis)]
  PG[(PostgreSQL)]
  META[Meta WhatsApp Cloud]

  U --> W
  W --> API
  W --> BOT
  API --> BOT
  BOT --> PG
  BOT --> REDIS
  WORKER --> REDIS
  WORKER --> PG
  WORKER --> META
```

```mermaid
flowchart TD
  V[Visitor Created] --> M[Member Profile Sync]
  V --> D[Duplicate Scan + Links]
  V --> MSG[Welcome Message Log]
  E[Event Created] --> R[RSVPs]
  R --> CAP[Capacity + Waitlist]
  C[Attendance Session + Checkins] --> HIST[Attendance History]
  P[Privacy Action] --> SD[Soft Delete]
  P --> ER[Erase + Redact]
  SD --> PURGE[Retention Purge Job]
  ER --> PURGE
```

## 🎨 Key Features

### Website
- **Media Gallery**: Category filtering (Sermons, Youth, Events, Audio), date ranges, pagination, YouTube embeds, multi-asset lightbox
- **Blog**: Articles, devotionals, Sunday school materials with categorization
- **Events**: Countdown timers, registration forms, event details
- **Admin Center** (`/admin`): Create/manage events, upload media, publish blog posts

### WhatsApp Bot
- **Service Reminders**: Automated Saturday 12 PM notifications (first Sunday 07:30, others 08:00)
- **Event Notifications**: Weekly reminders starting 1 month before events
- **LLM-Powered**: Personalized messages via Vertex AI, OpenAI, or Gemini
- **Opt-Out Support**: Automatic STOP detection and suppression list

## 🎨 Brand Colors

```css
--cross-red: #8a161e;     /* Savior */
--dove-yellow: #d4a82e;   /* Baptizer */
--cup-blue: #2d3a7a;      /* Healer */
--crown-purple: #5a4494;  /* Coming King */
--main-cream: #e8dfc5;    /* Background */
```
⚙️ Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# YouTube Data API (for sermon sync)
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CHANNEL_ID=your_channel_id

# Admin Access
ADMIN_PASSWORD=your_secure_password

# WhatsApp Bot (Meta Cloud API)
META_ACCESS_TOKEN=EAAx...
META_PHONE_NUMBER_ID=123456789012345
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# LLM (auto-selects: Vertex → OpenAI → Gemini → static templates)
LLM_PROVIDER=auto
VERTEX_PROJECT_ID=your-gcp-project
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

See [`bot/ENV_SECRETS_SETUP.md`](bot/ENV_SECRETS_SETUP.md) for detailed setup instructions.
See [`bot/BACKUP_RECOVERY.md`](bot/BACKUP_RECOVERY.md) for backup + HTTPS verification runbook.
See [`OPERATIONS.md`](OPERATIONS.md) for concise P3 observability, QA, schema/API notes, and hardening baseline.
OpenClaw templates and policy map: `openclaw/gateway.example.jsonc`, `openclaw/bot-api-policy.json`.
Edit `src/pages/Team/Team.jsx` with real names and photos

## 🌐 Deployment

This project deploys automatically via **GitHub Actions**.

- Push changes to a feature branch and open a **Pull Request**
- Once merged to `main`, the site updates automatically

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

**"Raising Kingdom Youths!"**

*Jesus Christ the same yesterday, and today, and forever. — Hebrews 13:8*
