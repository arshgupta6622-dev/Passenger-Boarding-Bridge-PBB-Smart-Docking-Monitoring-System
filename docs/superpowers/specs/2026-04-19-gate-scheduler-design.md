# Gate & Bridge Assignment Scheduler — Design Spec

**Date:** 2026-04-19
**Author:** Major project (student)
**Status:** Approved for implementation

## 1. Problem

Airports assign arriving flights to gates (and jet-bridges) by hand, juggling aircraft-size compatibility, turnaround time, and overlapping slots. Manual scheduling is error-prone and slow. This project is a single-page web app that takes a day's flight schedule, automatically produces a conflict-free gate assignment, and visualises the result as a Gantt chart. Gemini-powered AI features make the UX smoother (natural-language entry, conflict explanation, optimisation suggestions, what-if chat).

## 2. Goals & Non-Goals

**Goals**
- Accept a day's flight list (manual form, CSV upload, or natural-language paste).
- Automatically assign each flight to a compatible gate with no overlaps.
- Visualise the assignment as an interactive Gantt chart.
- Surface metrics (utilisation, peak hour, turnaround, conflicts).
- Integrate five Gemini-powered AI features (see §7).
- Run locally with `npm run dev`, deployable to Vercel's free tier.

**Non-Goals**
- Multi-day / recurring schedules.
- Real-time flight-status feeds or airline APIs.
- Authentication, user accounts, multi-tenant data.
- Persistent database. Data lives in React state + localStorage; export/import as JSON.
- Mobile-first design. Desktop-first; responsive enough to demo on a laptop.

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Vercel-native, server components give us a safe home for the Gemini key |
| Styling | Tailwind CSS + shadcn/ui | Polished primitives, fast to theme, dark-mode by default |
| Animation | Framer Motion | Smooth Gantt transitions, subtle micro-interactions |
| State | Zustand | Lightweight, no Redux boilerplate |
| Charts | Recharts | Metrics dashboard widgets |
| AI | `@google/generative-ai` (Gemini 2.5 Flash) | Free tier, fast, good structured-output support |
| Persistence | localStorage | No backend; schedules survive a page refresh |

## 4. Architecture

Client-heavy SPA. Scheduling and metrics run in the browser. The only server code is a handful of Next.js API routes that proxy Gemini calls so the API key never ships to the client.

```
app/
  layout.tsx
  page.tsx                         # Main scheduler view
  api/ai/
    parse-flight/route.ts          # Natural-language → Flight JSON
    bulk-import/route.ts           # Messy paste → Flight[]
    explain-conflict/route.ts      # Why this flight is unassigned
    optimize/route.ts              # Suggest schedule swaps
    chat/route.ts                  # What-if queries
components/
  gantt/GanttChart.tsx
  gantt/GanttRow.tsx
  gantt/FlightBlock.tsx
  input-panel/FlightForm.tsx
  input-panel/PasteImport.tsx      # AI-assisted paste/CSV
  input-panel/FlightList.tsx
  metrics/MetricsDashboard.tsx
  metrics/UtilisationChart.tsx
  ai-assistant/AssistantPanel.tsx
  conflicts/ConflictsDrawer.tsx
  ui/ (shadcn generated)
lib/
  scheduler.ts                     # First-Fit Decreasing algorithm
  metrics.ts                       # All calculations
  compatibility.ts                 # Aircraft↔gate rules
  gemini.ts                        # Gemini SDK wrapper (server-only)
  types.ts                         # Flight, Gate, Assignment, etc.
  storage.ts                       # localStorage helpers
  seed.ts                          # Sample flights + gates
  store.ts                         # Zustand store
```

## 5. Data Model

```ts
type AircraftType = "narrow" | "wide" | "regional";

type Flight = {
  id: string;
  flightNumber: string;      // e.g., "AI 202"
  airline: string;           // e.g., "Air India"
  origin: string;            // IATA or city
  destination: string;
  arrival: string;           // ISO timestamp (local airport time)
  departure: string;         // ISO timestamp
  aircraftType: AircraftType;
  pax?: number;
};

type Gate = {
  id: string;
  name: string;              // e.g., "G7"
  terminal?: string;         // "T1", "T2"
  compatibleTypes: AircraftType[];
  hasJetBridge: boolean;
};

type Assignment = {
  flightId: string;
  gateId: string;
  start: string;             // = flight.arrival
  end: string;               // = flight.departure
};

type ScheduleResult = {
  assignments: Assignment[];
  unassigned: { flight: Flight; reason: string }[];
  metrics: Metrics;
};

type Swap = {
  flightId: string;
  fromGateId: string;
  toGateId: string;
  reason: string;           // AI-generated explanation
};

type Metrics = {
  overallUtilisation: number;        // 0–1
  perGateUtilisation: Record<string, number>;
  peakHour: { hour: number; count: number };
  avgTurnaroundMinutes: number;
  jetbridgeShare: number;            // 0–1
  conflictCount: number;
  unassignedCount: number;
};
```

## 6. Scheduling Algorithm

**First-Fit Decreasing by arrival time** with a 15-minute turnaround buffer.

1. Sort flights by arrival ascending.
2. For each flight:
   - Filter gates where `gate.compatibleTypes` includes `flight.aircraftType`.
   - Walk the filtered list in order. Assign to the first gate whose last assignment ends ≥ 15 min before this flight's arrival.
   - If no gate fits, push to `unassigned` with a reason stub (populated by AI on demand).
3. Return `{ assignments, unassigned, metrics }`.

Compatibility rules:
- Narrow-body (A320, B737) → any gate.
- Wide-body (B777, A330, B787) → only gates whose `compatibleTypes` includes `"wide"`.
- Regional (ATR, CRJ) → any gate (usually remote stands preferred — not modelled in v1).
- Jet-bridge preference: wide-body > narrow-body > regional. Break ties by preferring jet-bridge gates for wide/narrow.

**AI Optimize pass (optional).** User clicks "AI Optimize". We send the current assignments + gate list to Gemini and ask for swap suggestions that improve utilisation or free up jet-bridges for wide-body flights. Response includes a list of swaps each with a plain-English reason. User accepts/rejects individually.

## 7. AI Features

All five go through Next.js API routes on the server. The Gemini key lives only in `.env.local` (`GEMINI_API_KEY`) — never in client code, never committed.

| Route | Purpose | Input | Output |
|---|---|---|---|
| `/api/ai/parse-flight` | "AI 202 from Delhi at 10:30, wide body, departs 12:15" → Flight | string | Flight JSON |
| `/api/ai/bulk-import` | Pasted airline timetable → Flight[] | string | Flight[] |
| `/api/ai/explain-conflict` | Why is this flight unassigned? | {flight, assignments, gates} | string (markdown) |
| `/api/ai/optimize` | Suggest schedule swaps | {assignments, gates, flights} | `{swaps: Swap[], summary: string}` |
| `/api/ai/chat` | "What if AI 205 is delayed 30 min?" | {message, context} | string + optional simulated Schedule |

All routes use **structured output** (`responseMimeType: "application/json"` + schema) where the response is JSON, to keep parsing deterministic.

## 8. UI Layout

Desktop-first, single page:

- **Top bar** — product name, date picker (defaults to today), overall utilisation %, "Run Scheduler" primary button, theme toggle.
- **Left sidebar (~320 px)** — tabs: (1) Manual flight form, (2) AI paste, (3) CSV upload. Below: flight list with edit/delete.
- **Center** — Gantt chart. Rows = gates. X-axis = 00:00–23:59 with hour ticks. Coloured blocks per flight (colour-coded by airline). Hover → tooltip with flight details. Click → detail popover. Unassigned flights appear in a red-tinted row at the bottom.
- **Right sidebar (~380 px)** — tabs: (1) AI Assistant chat, (2) Metrics dashboard, (3) Conflicts list.
- **Bottom drawer** — collapsible; shows unassigned flights with "Explain with AI" buttons.

Visual polish:
- Dark mode default, light mode toggle.
- Soft gradients on headers, glassmorphism on panels.
- Framer Motion: flight blocks slide in on schedule run; conflict blocks pulse red; AI suggestions animate in one-by-one.
- Inter font, rounded corners, subtle shadows.

## 9. Metrics & Calculations

Computed in `lib/metrics.ts` after every schedule run:

- **Overall utilisation %** = Σ(flight-hours assigned) / (gates × 24h).
- **Per-gate utilisation %** = (flight-hours on this gate) / 24h, shown as horizontal bar chart.
- **Peak hour** = hour of day with the most concurrent assignments; shown as a callout.
- **Average turnaround** = mean (departure − arrival) in minutes across assigned flights.
- **Jet-bridge share** = assignments on jet-bridge gates / total assignments.
- **Conflict count** = assignments that, after an edit, overlap a neighbour (should always be 0 after auto-run; non-zero only after manual edits).
- **Unassigned count** = flights the algorithm couldn't place.
- **Before/after** — when "AI Optimize" runs, we snapshot the metrics pre-run and show deltas (green for improved, red for worse).

## 10. Seed Data

Pre-load on first visit:
- 8 gates across 2 terminals: G1–G4 narrow-only (T1), G5–G6 wide+narrow with jet-bridge (T1), G7–G8 remote stands (T2).
- ~15 sample flights — mix of IndiGo, Air India, Vistara, Emirates, SpiceJet; mix of narrow-body and wide-body; spread across the day with a few deliberate conflicts so the demo shows the scheduler working.

## 11. Acceptance Criteria

1. User can add a flight via the manual form and see it appear in the flight list.
2. User can paste "IndiGo 6E 234 from BOM lands 09:45 departs 10:45 narrow body" and the AI fills the form correctly.
3. Clicking "Run Scheduler" populates the Gantt chart with no overlapping blocks on any gate.
4. Wide-body flights are never placed on narrow-only gates.
5. Unassigned flights show a plain-English reason when "Explain with AI" is clicked.
6. Metrics dashboard updates after every schedule run.
7. "AI Optimize" produces at least one actionable swap suggestion on the seed data.
8. Chat tab accepts "What if AI 205 is delayed 30 minutes?" and returns a coherent answer referencing the current schedule.
9. Refreshing the page preserves the flights + gates (localStorage).
10. `npm run build` succeeds with zero TypeScript errors. App runs on `npm run dev` at http://localhost:3000.

## 12. Out of Scope (v1)

- Multi-day schedules
- Drag-and-drop manual re-assignment on the Gantt (can add in v2)
- User accounts, cloud save, sharing
- Real airline API integration
- Printable PDF report (nice-to-have; may add if time permits)

## 13. Risks

- **Gemini free-tier rate limits.** Mitigation: debounce AI calls; cache parse results; show a visible "AI is thinking…" state so the user doesn't spam-click.
- **Gemini hallucinating flight data.** Mitigation: always show the parsed flight in the form for user confirmation before adding it to the schedule.
- **Gantt chart performance with many flights.** v1 targets ~50 flights, 10 gates — fine for SVG. If pushed further, virtualise rows.
