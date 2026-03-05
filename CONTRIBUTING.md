# Contributing to FGC Upper Room Website

## Getting Started

1. **Clone the repo**
```bash
   git clone https://github.com/dan-od/fgc-upperroom.git
   cd fgc-upperroom
```

2. **Install dependencies**
```bash
   npm install
```

3. **Run locally**
```bash
   npm run dev
```
   Opens at `http://localhost:5173`

## Making Changes

1. Make sure you're on the latest main:
```bash
   git checkout main
   git pull
```

2. Create a branch for your changes:
```bash
   git checkout -b feature/your-feature-name
```

3. Make your changes and test locally

4. Push your branch:
```bash
   git add .
   git commit -m "Brief description of changes"
   git push origin feature/your-feature-name
```

5. Go to GitHub and open a **Pull Request** into `main`

6. Once approved and merged, the site updates automatically!

## Branch Naming

- `feature/...` — new features or sections
- `fix/...` — bug fixes
- `update/...` — content updates (text, images, etc.)

## Rules

- Never push directly to `main`
- Always create a branch first
- Test your changes locally before pushing
- Keep commits focused and descriptive
- Don't commit `.env` files or secrets