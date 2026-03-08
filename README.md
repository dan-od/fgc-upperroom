# FGC Upper Room Mgbuoba Website v2.0

A multi-page React website for FGC Upper Room Mgbuoba - the youth fellowship of Foursquare Gospel Church, Mgbuoba Zonal HQ.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start website dev server
npm run dev
```

Website opens at `http://localhost:3000`

## 🤖 Bot Runtime (Independent Service)

```bash
# Start bot API + scheduler
npm run bot:dev

# Start bot worker in another terminal
npm run bot:worker
```

Bot API health endpoint:

- `http://localhost:4100/bot/health`

The bot is isolated under `bot/` and runs independently from the Vite web server.

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI (Button, Card, SectionHeader)
│   ├── layout/          # Layout (Header, Footer, ServiceBar)
│   └── features/        # Feature components (Countdown, Testimonials)
├── pages/               # Route pages
│   ├── Home/            # Homepage
│   ├── About/           # About page
│   ├── Team/            # Team & leadership
│   ├── Events/          # Events page
│   ├── Media/           # Gallery & videos
│   ├── Blog/            # Blog posts
│   ├── Contact/         # Contact form & info
│   └── Testimonies/     # Testimonies page
├── styles/
│   ├── variables.css    # CSS variables (colors, spacing)
│   └── globals.css      # Global styles
└── assets/
```

## 🎨 Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Full hero, countdown, pastor welcome, beliefs, etc. |
| About | `/about` | Vision, mission, Foursquare beliefs |
| Team | `/team` | Leadership, excos, departments |
| Events | `/events` | Upcoming programs |
| Media | `/media` | Photo gallery |
| Blog | `/blog` | Articles & devotionals |
| Contact | `/contact` | Contact form, info, map |
| Testimonies | `/testimonies` | Member testimonies |

## 🎨 Brand Colors

```css
--cross-red: #8a161e;     /* Savior */
--dove-yellow: #d4a82e;   /* Baptizer */
--cup-blue: #2d3a7a;      /* Healer */
--crown-purple: #5a4494;  /* Coming King */
--main-cream: #e8dfc5;    /* Background */
```

## ✏️ Customization

### Add Hero Background Image
1. Add image to `public/assets/images/hero-bg.jpg`
2. It will automatically be used in the hero section

### Update Contact Info
Edit `src/pages/Contact/Contact.jsx`

### Add Special Event Countdown
Edit `src/components/features/Countdown/Countdown.jsx`:
```javascript
const SPECIAL_EVENTS = [
  {
    name: "Upper Room Week 2025",
    date: "2025-03-15T09:00:00",
  }
]
```

### Update Team
Edit `src/pages/Team/Team.jsx` with real names and photos

## 🌐 Deployment

This project deploys automatically via **GitHub Actions**.

- Push changes to a feature branch and open a **Pull Request**
- Once merged to `main`, the site updates automatically

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

**"Raising Kingdom Youths!"**

*Jesus Christ the same yesterday, and today, and forever. — Hebrews 13:8*
