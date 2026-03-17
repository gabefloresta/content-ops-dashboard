# ContentOps Dashboard

Daily content operations dashboard for managing 5 Facebook accounts × 2 videos/day.

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
# Unzip the project, then:
cd content-ops-dashboard
git init
git add .
git commit -m "ContentOps dashboard"
```

Go to [github.com/new](https://github.com/new), create a repo called `content-ops-dashboard`, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/content-ops-dashboard.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `content-ops-dashboard` repo
4. Framework Preset will auto-detect **Vite** — leave defaults
5. Click **Deploy**

Your app will be live at `https://content-ops-dashboard.vercel.app` (or similar).

### Step 3: Enable Trending Research (optional)

The "Trending Research" button uses Claude's API to search for viral hooks.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/)
2. In Vercel: go to your project → **Settings** → **Environment Variables**
3. Add: `ANTHROPIC_API_KEY` = `sk-ant-your-key-here`
4. Redeploy (Vercel → Deployments → three-dot menu → Redeploy)

Without this key, everything else works — you just can't use the trending research button.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Features

- **Accounts** — 5 slots with name, product, avatar, EN/ES toggle
- **Angles** — Bank of hooks by category, select 5-10 daily, AI trending research
- **Prompt** — Auto-builds batch script prompt, one-click copy
- **Tracker** — 4-step pipeline per video, progress bar, daily reset
- **Storage** — All data persists via localStorage
- **Theme** — Dark/light mode toggle
