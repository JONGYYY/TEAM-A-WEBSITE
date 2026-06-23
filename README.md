# DreamCollege.ai — Team A

Student-facing **Dashboard · Career Planning · College Planning** for DreamCollege.ai, built to the spec in [`PRD.md`](./PRD.md). Design system: **"The Almanac"** — warm parchment + deep ivy + marigold, Fraunces / Hanken Grotesk / Spline Sans Mono, with a working dark "Nightfall Library" theme. Built with Next.js 14 (App Router), TypeScript, and Framer Motion.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
```

> Requires Node 18.17+ (project pins Next 14 for Node 18 compatibility).

## What's built

| Surface | Routes |
|---|---|
| **Dashboard** | `/dashboard` — first-run get-to-know-you intake, then progress ring, stats, next-best-action, tiles |
| **College Profile** (onboarding) | `/college/profile` — 7-step adaptive builder: résumé autofill, auto-expanding rows, AI-tidy descriptions, privacy notes, no-negative inputs, autosave |
| **Admissions Evaluation** | `/college/assessment` — 7-section committee review + skill radar + action items (gated on profile completion) |
| **Career Planning** | `/career/discovery` · `/career/fit-report` · `/career/tracks` · `/career/explore` · `/career/planner` |
| **College Planning** | `/college/majors` · `/college/colleges` (Likely/Target/Reach + EA/ED strategy) · `/college/scholarships` · `/college/shortlist` |

## AI integration

The evaluation runs through `POST /api/assess` (JSON-first contract).

- Set `ANTHROPIC_API_KEY` in `.env.local` to use **Claude** for the report.
- Without a key, a deterministic, profile-aware generator produces the same JSON shape so everything works offline.

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

## Data

All student data is JSON-first and stored client-side (`localStorage`): `dc.profile`, `dc.assessment`, `dc.career`, `dc.shortlist`, `dc.savedClusters`, `dc.theme`. No PII leaves the device in this build.

## Project structure

```
app/                 routes (dashboard, career/*, college/*, api/assess)
components/          Sidebar, AppShell, Intake, fields, Icon, Radar, CountUp, PageHeader
lib/                 types, taxonomy, content, store, theme, motion, autofill, generateAssessment
app/globals.css      design tokens + both themes
```
