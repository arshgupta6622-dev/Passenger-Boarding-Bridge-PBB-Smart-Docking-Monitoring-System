# Gate & Bridge Assignment Scheduler

An AI-assisted airport gate and jet-bridge scheduler. Input a day's flights, click Run, and get a conflict-free Gantt chart with utilisation metrics. Powered by Gemini for natural-language flight entry, bulk import, conflict explanation, optimisation, and what-if chat.

## Quick start

```bash
npm install
cp .env.example .env.local
# paste your Gemini API key into .env.local
npm run dev
```

Open http://localhost:3000.

## Features

- First-fit scheduler with 15-minute turnaround buffer and aircraft/gate compatibility rules.
- Interactive Gantt chart with airline colour-coding, hover tooltips, and live animations.
- 5 Gemini AI features:
  - **Parse flight** — type `AI 202 from Delhi at 10:30, wide body, departs 12:15` and the form auto-fills.
  - **Bulk import** — paste a messy airline timetable; Gemini normalises it into structured rows.
  - **Explain conflict** — for any unassigned flight, Gemini explains why and suggests an action.
  - **Optimise** — Gemini proposes swaps to improve utilisation; review and apply individually.
  - **What-if chat** — ask `What happens if AI 205 is delayed 30 min?` and get a scenario walkthrough.
- Metrics dashboard: overall utilisation, per-gate bars, peak hour, average turnaround, jet-bridge share, unassigned count, before/after deltas.
- Dark mode by default, localStorage persistence, no database.

## Tech stack

- Next.js 15+ (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui
- Framer Motion · Recharts · Zustand
- `@google/generative-ai` (Gemini 2.5 Flash)
- Vitest for scheduler/metrics tests

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm test` — run unit tests
- `npm run lint` — lint

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the repo on https://vercel.com/new.
3. Add `GEMINI_API_KEY` as an environment variable.
4. Deploy.

## License

MIT
