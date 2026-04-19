# Gate & Bridge Assignment Scheduler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web app that takes a day's flight schedule and automatically assigns each flight to a compatible gate using first-fit scheduling, visualises the result as a Gantt chart, exposes utilisation/turnaround metrics, and offers five Gemini-powered AI features (natural-language flight entry, bulk paste import, conflict explanation, optimisation suggestions, what-if chat).

**Architecture:** Client-heavy SPA. Scheduling and metrics run in the browser (React + Zustand). Gemini calls go through Next.js API routes so the API key stays server-side. Data persists via localStorage; no database.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Recharts · Zustand · Vitest (unit tests) · `@google/generative-ai` (Gemini 2.5 Flash)

**Spec:** [docs/superpowers/specs/2026-04-19-gate-scheduler-design.md](../specs/2026-04-19-gate-scheduler-design.md)

**Project root:** `c:/Users/athar/Desktop/arsh-major project/` — note the space in the folder name. Always quote paths.

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.env.example`, `README.md`

- [ ] **Step 1: Initialise Next.js + Tailwind via create-next-app**

Run from the project root:

```bash
npx create-next-app@latest scheduler --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack --yes
```

Then move everything up one level so the app lives at the project root (so `package.json` is next to `docs/`):

```bash
cd scheduler && mv -f ./* ./.[!.]* .. 2>/dev/null; cd .. && rmdir scheduler
```

Expected: `package.json`, `app/`, `public/` now sit at the project root. `docs/` is still there.

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install zustand framer-motion recharts lucide-react clsx tailwind-merge @google/generative-ai class-variance-authority date-fns
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/node
```

Expected: dependencies added to `package.json`, no npm errors.

- [ ] **Step 3: Initialise shadcn/ui**

```bash
npx shadcn@latest init --yes --defaults
```

When prompted (or via the defaults flag), choose: TypeScript, New York style, Slate base, CSS variables yes, `app/globals.css`, `tailwind.config.ts`, `@/components`, `@/lib/utils`, React Server Components yes.

Then add the components we'll use:

```bash
npx shadcn@latest add button card input label tabs tooltip dialog dropdown-menu select separator textarea toast sonner scroll-area switch badge sheet --yes
```

Expected: `components/ui/*.tsx` created, `lib/utils.ts` created.

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Add scripts to `package.json` under `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```
GEMINI_API_KEY=your_gemini_key_here
```

- [ ] **Step 6: Verify scaffolding builds**

```bash
npm run build
```

Expected: Next.js build succeeds, no TypeScript errors.

- [ ] **Step 7: Initialise git + first commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn + Vitest"
```

---

## Task 2: Core types and compatibility rules

**Files:**
- Create: `lib/types.ts`
- Create: `lib/compatibility.ts`
- Test: `lib/compatibility.test.ts`

- [ ] **Step 1: Create types file**

Create `lib/types.ts`:

```ts
export type AircraftType = "narrow" | "wide" | "regional";

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  arrival: string;   // ISO 8601 local airport time
  departure: string; // ISO 8601
  aircraftType: AircraftType;
  pax?: number;
}

export interface Gate {
  id: string;
  name: string;
  terminal?: string;
  compatibleTypes: AircraftType[];
  hasJetBridge: boolean;
}

export interface Assignment {
  flightId: string;
  gateId: string;
  start: string;
  end: string;
}

export interface Unassigned {
  flight: Flight;
  reason: string;
}

export interface Metrics {
  overallUtilisation: number;
  perGateUtilisation: Record<string, number>;
  peakHour: { hour: number; count: number };
  avgTurnaroundMinutes: number;
  jetbridgeShare: number;
  conflictCount: number;
  unassignedCount: number;
  totalFlights: number;
  assignedFlights: number;
}

export interface ScheduleResult {
  assignments: Assignment[];
  unassigned: Unassigned[];
  metrics: Metrics;
}

export interface Swap {
  flightId: string;
  fromGateId: string;
  toGateId: string;
  reason: string;
}
```

- [ ] **Step 2: Write failing compatibility tests**

Create `lib/compatibility.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canAssign, scoreGate } from "./compatibility";
import type { Gate } from "./types";

const narrowGate: Gate = {
  id: "g1", name: "G1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true,
};
const wideGate: Gate = {
  id: "g2", name: "G2", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true,
};
const remoteStand: Gate = {
  id: "g3", name: "G3", compatibleTypes: ["narrow", "regional"], hasJetBridge: false,
};

describe("canAssign", () => {
  it("allows narrow-body on narrow-capable gate", () => {
    expect(canAssign("narrow", narrowGate)).toBe(true);
  });
  it("rejects wide-body on narrow-only gate", () => {
    expect(canAssign("wide", narrowGate)).toBe(false);
  });
  it("allows wide-body on wide-capable gate", () => {
    expect(canAssign("wide", wideGate)).toBe(true);
  });
});

describe("scoreGate", () => {
  it("prefers jet-bridge gate for wide-body", () => {
    expect(scoreGate("wide", wideGate)).toBeGreaterThan(scoreGate("wide", remoteStand));
  });
  it("prefers jet-bridge gate for narrow-body", () => {
    expect(scoreGate("narrow", narrowGate)).toBeGreaterThan(scoreGate("narrow", remoteStand));
  });
});
```

- [ ] **Step 3: Run tests, confirm failure**

```bash
npm test -- lib/compatibility.test.ts
```

Expected: failure (module not found).

- [ ] **Step 4: Implement compatibility module**

Create `lib/compatibility.ts`:

```ts
import type { AircraftType, Gate } from "./types";

export function canAssign(aircraft: AircraftType, gate: Gate): boolean {
  return gate.compatibleTypes.includes(aircraft);
}

export function scoreGate(aircraft: AircraftType, gate: Gate): number {
  if (!canAssign(aircraft, gate)) return -Infinity;
  let score = 0;
  if (gate.hasJetBridge) score += aircraft === "wide" ? 10 : 5;
  // Wide-body gates should prefer wide-body traffic to avoid wasting wide-capable gates on narrow flights
  if (aircraft === "wide" && gate.compatibleTypes.includes("wide")) score += 3;
  if (aircraft === "narrow" && !gate.compatibleTypes.includes("wide")) score += 2;
  return score;
}
```

- [ ] **Step 5: Run tests, confirm pass**

```bash
npm test -- lib/compatibility.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/compatibility.ts lib/compatibility.test.ts
git commit -m "feat(core): add Flight/Gate types and compatibility rules"
```

---

## Task 3: Scheduling algorithm

**Files:**
- Create: `lib/scheduler.ts`
- Test: `lib/scheduler.test.ts`

- [ ] **Step 1: Write failing scheduler tests**

Create `lib/scheduler.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { schedule, TURNAROUND_BUFFER_MINUTES } from "./scheduler";
import type { Flight, Gate } from "./types";

const day = (h: number, m = 0) =>
  new Date(2026, 3, 19, h, m).toISOString();

const narrow = (id: string, start: number, end: number, type: "narrow" | "wide" | "regional" = "narrow"): Flight => ({
  id, flightNumber: id, airline: "Test", origin: "BOM", destination: "DEL",
  arrival: day(start), departure: day(end), aircraftType: type,
});

const gates: Gate[] = [
  { id: "g1", name: "G1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "g2", name: "G2", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true },
];

describe("schedule", () => {
  it("assigns a single flight to a compatible gate", () => {
    const result = schedule([narrow("F1", 10, 12)], gates);
    expect(result.assignments).toHaveLength(1);
    expect(result.unassigned).toHaveLength(0);
  });

  it("places non-overlapping flights on the same gate", () => {
    const flights = [narrow("F1", 10, 11), narrow("F2", 12, 13)];
    const result = schedule(flights, gates);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].gateId).toBe(result.assignments[1].gateId);
  });

  it("places overlapping flights on different gates", () => {
    const flights = [narrow("F1", 10, 12), narrow("F2", 11, 13)];
    const result = schedule(flights, gates);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].gateId).not.toBe(result.assignments[1].gateId);
  });

  it("enforces turnaround buffer", () => {
    const flights = [narrow("F1", 10, 11), narrow("F2", 11, 12)];
    const result = schedule(flights, gates);
    // F2 should NOT go on same gate as F1 because buffer is 15 min
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].gateId).not.toBe(result.assignments[1].gateId);
  });

  it("rejects wide-body on narrow-only gates", () => {
    const narrowOnly: Gate[] = [
      { id: "g1", name: "G1", compatibleTypes: ["narrow"], hasJetBridge: true },
    ];
    const result = schedule([narrow("F1", 10, 12, "wide")], narrowOnly);
    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toHaveLength(1);
  });

  it("marks flights unassigned when no gate fits", () => {
    const oneGate: Gate[] = [
      { id: "g1", name: "G1", compatibleTypes: ["narrow"], hasJetBridge: true },
    ];
    const flights = [narrow("F1", 10, 12), narrow("F2", 11, 13)];
    const result = schedule(flights, oneGate);
    expect(result.assignments).toHaveLength(1);
    expect(result.unassigned).toHaveLength(1);
  });

  it("exports the buffer constant in minutes", () => {
    expect(TURNAROUND_BUFFER_MINUTES).toBe(15);
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

```bash
npm test -- lib/scheduler.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement scheduler**

Create `lib/scheduler.ts`:

```ts
import type { Flight, Gate, Assignment, Unassigned, ScheduleResult } from "./types";
import { canAssign, scoreGate } from "./compatibility";
import { computeMetrics } from "./metrics";

export const TURNAROUND_BUFFER_MINUTES = 15;

const msBuffer = TURNAROUND_BUFFER_MINUTES * 60 * 1000;

export function schedule(flights: Flight[], gates: Gate[]): ScheduleResult {
  const sorted = [...flights].sort(
    (a, b) => new Date(a.arrival).getTime() - new Date(b.arrival).getTime(),
  );

  const perGate = new Map<string, Assignment[]>(gates.map((g) => [g.id, []]));
  const assignments: Assignment[] = [];
  const unassigned: Unassigned[] = [];

  for (const flight of sorted) {
    const arr = new Date(flight.arrival).getTime();
    const dep = new Date(flight.departure).getTime();

    if (dep <= arr) {
      unassigned.push({ flight, reason: "Departure is not after arrival." });
      continue;
    }

    const candidates = gates
      .filter((g) => canAssign(flight.aircraftType, g))
      .map((g) => ({ gate: g, score: scoreGate(flight.aircraftType, g) }))
      .sort((a, b) => b.score - a.score);

    let placed = false;
    for (const { gate } of candidates) {
      const existing = perGate.get(gate.id)!;
      const last = existing[existing.length - 1];
      if (!last || new Date(last.end).getTime() + msBuffer <= arr) {
        const a: Assignment = {
          flightId: flight.id,
          gateId: gate.id,
          start: flight.arrival,
          end: flight.departure,
        };
        existing.push(a);
        assignments.push(a);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const compatibleCount = gates.filter((g) => canAssign(flight.aircraftType, g)).length;
      const reason = compatibleCount === 0
        ? `No gate is compatible with ${flight.aircraftType}-body aircraft.`
        : `All ${compatibleCount} compatible gate(s) are occupied during ${flight.arrival}–${flight.departure}.`;
      unassigned.push({ flight, reason });
    }
  }

  const metrics = computeMetrics(assignments, gates, flights, unassigned);
  return { assignments, unassigned, metrics };
}
```

- [ ] **Step 4: Run tests, confirm pass**

`lib/metrics.ts` doesn't exist yet, so the scheduler won't compile. Create a stub for now:

Create `lib/metrics.ts` (will be filled in fully in Task 4):

```ts
import type { Assignment, Flight, Gate, Metrics, Unassigned } from "./types";

export function computeMetrics(
  _assignments: Assignment[],
  _gates: Gate[],
  flights: Flight[],
  unassigned: Unassigned[],
): Metrics {
  return {
    overallUtilisation: 0,
    perGateUtilisation: {},
    peakHour: { hour: 0, count: 0 },
    avgTurnaroundMinutes: 0,
    jetbridgeShare: 0,
    conflictCount: 0,
    unassignedCount: unassigned.length,
    totalFlights: flights.length,
    assignedFlights: flights.length - unassigned.length,
  };
}
```

Run tests:

```bash
npm test -- lib/scheduler.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/scheduler.ts lib/scheduler.test.ts lib/metrics.ts
git commit -m "feat(scheduler): implement first-fit scheduling with turnaround buffer"
```

---

## Task 4: Metrics calculations

**Files:**
- Modify: `lib/metrics.ts`
- Test: `lib/metrics.test.ts`

- [ ] **Step 1: Write failing metrics tests**

Create `lib/metrics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeMetrics } from "./metrics";
import type { Assignment, Flight, Gate } from "./types";

const day = (h: number, m = 0) => new Date(2026, 3, 19, h, m).toISOString();

const gates: Gate[] = [
  { id: "g1", name: "G1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "g2", name: "G2", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: false },
];

const flight = (id: string, start: number, end: number): Flight => ({
  id, flightNumber: id, airline: "T", origin: "A", destination: "B",
  arrival: day(start), departure: day(end), aircraftType: "narrow",
});

describe("computeMetrics", () => {
  it("reports zero utilisation with no assignments", () => {
    const m = computeMetrics([], gates, [], []);
    expect(m.overallUtilisation).toBe(0);
  });

  it("computes per-gate utilisation", () => {
    const flights = [flight("F1", 10, 12)];
    const assignments: Assignment[] = [
      { flightId: "F1", gateId: "g1", start: day(10), end: day(12) },
    ];
    const m = computeMetrics(assignments, gates, flights, []);
    expect(m.perGateUtilisation["g1"]).toBeCloseTo(2 / 24, 3);
    expect(m.perGateUtilisation["g2"]).toBe(0);
  });

  it("computes overall utilisation across all gates", () => {
    const flights = [flight("F1", 10, 12), flight("F2", 14, 18)];
    const assignments: Assignment[] = [
      { flightId: "F1", gateId: "g1", start: day(10), end: day(12) },
      { flightId: "F2", gateId: "g2", start: day(14), end: day(18) },
    ];
    const m = computeMetrics(assignments, gates, flights, []);
    // 2h + 4h = 6h over 2 gates × 24h = 48h → 0.125
    expect(m.overallUtilisation).toBeCloseTo(6 / 48, 3);
  });

  it("identifies peak hour", () => {
    const flights = [flight("F1", 10, 11), flight("F2", 10, 11), flight("F3", 15, 16)];
    const assignments: Assignment[] = flights.map((f, i) => ({
      flightId: f.id, gateId: gates[i % 2].id, start: f.arrival, end: f.departure,
    }));
    const m = computeMetrics(assignments, gates, flights, []);
    expect(m.peakHour.hour).toBe(10);
    expect(m.peakHour.count).toBe(2);
  });

  it("computes average turnaround in minutes", () => {
    const flights = [flight("F1", 10, 12), flight("F2", 14, 15)]; // 120 + 60 = 180 → avg 90
    const assignments: Assignment[] = flights.map((f, i) => ({
      flightId: f.id, gateId: gates[i].id, start: f.arrival, end: f.departure,
    }));
    const m = computeMetrics(assignments, gates, flights, []);
    expect(m.avgTurnaroundMinutes).toBe(90);
  });

  it("computes jet-bridge share", () => {
    const flights = [flight("F1", 10, 11), flight("F2", 10, 11)];
    const assignments: Assignment[] = [
      { flightId: "F1", gateId: "g1", start: day(10), end: day(11) }, // jet-bridge
      { flightId: "F2", gateId: "g2", start: day(10), end: day(11) }, // remote
    ];
    const m = computeMetrics(assignments, gates, flights, []);
    expect(m.jetbridgeShare).toBe(0.5);
  });

  it("counts unassigned flights", () => {
    const flights = [flight("F1", 10, 12)];
    const m = computeMetrics([], gates, flights, [{ flight: flights[0], reason: "" }]);
    expect(m.unassignedCount).toBe(1);
    expect(m.assignedFlights).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

```bash
npm test -- lib/metrics.test.ts
```

Expected: tests fail (stub returns zeros).

- [ ] **Step 3: Replace metrics stub with full implementation**

Replace the contents of `lib/metrics.ts`:

```ts
import type { Assignment, Flight, Gate, Metrics, Unassigned } from "./types";

const MS_PER_HOUR = 60 * 60 * 1000;
const DAY_HOURS = 24;

export function computeMetrics(
  assignments: Assignment[],
  gates: Gate[],
  flights: Flight[],
  unassigned: Unassigned[],
): Metrics {
  const perGateHours: Record<string, number> = Object.fromEntries(
    gates.map((g) => [g.id, 0]),
  );

  let totalHours = 0;
  let totalTurnaroundMin = 0;
  let jetbridgeCount = 0;

  const gatesById = new Map(gates.map((g) => [g.id, g]));

  for (const a of assignments) {
    const durH = (new Date(a.end).getTime() - new Date(a.start).getTime()) / MS_PER_HOUR;
    perGateHours[a.gateId] = (perGateHours[a.gateId] ?? 0) + durH;
    totalHours += durH;
    totalTurnaroundMin += durH * 60;
    if (gatesById.get(a.gateId)?.hasJetBridge) jetbridgeCount += 1;
  }

  const perGateUtilisation: Record<string, number> = {};
  for (const g of gates) {
    perGateUtilisation[g.id] = (perGateHours[g.id] ?? 0) / DAY_HOURS;
  }

  const overallUtilisation = gates.length === 0
    ? 0
    : totalHours / (gates.length * DAY_HOURS);

  // Peak hour: count assignments that cover each hour slot.
  const hourCounts = new Array(24).fill(0);
  for (const a of assignments) {
    const startH = new Date(a.start).getHours();
    const endDate = new Date(a.end);
    const endH = endDate.getHours() + (endDate.getMinutes() > 0 ? 1 : 0);
    for (let h = startH; h < Math.min(endH, 24); h++) hourCounts[h] += 1;
  }
  let peakHour = 0;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > peakCount) {
      peakHour = h;
      peakCount = hourCounts[h];
    }
  }

  const avgTurnaroundMinutes = assignments.length === 0
    ? 0
    : Math.round(totalTurnaroundMin / assignments.length);

  const jetbridgeShare = assignments.length === 0
    ? 0
    : jetbridgeCount / assignments.length;

  // Conflict detection: overlapping assignments on the same gate.
  let conflictCount = 0;
  const byGate = new Map<string, Assignment[]>();
  for (const a of assignments) {
    if (!byGate.has(a.gateId)) byGate.set(a.gateId, []);
    byGate.get(a.gateId)!.push(a);
  }
  for (const list of byGate.values()) {
    list.sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime());
    for (let i = 1; i < list.length; i++) {
      if (new Date(list[i].start).getTime() < new Date(list[i - 1].end).getTime()) {
        conflictCount += 1;
      }
    }
  }

  return {
    overallUtilisation,
    perGateUtilisation,
    peakHour: { hour: peakHour, count: peakCount },
    avgTurnaroundMinutes,
    jetbridgeShare,
    conflictCount,
    unassignedCount: unassigned.length,
    totalFlights: flights.length,
    assignedFlights: flights.length - unassigned.length,
  };
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
npm test
```

Expected: all tests (compatibility, scheduler, metrics) pass.

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.ts lib/metrics.test.ts
git commit -m "feat(metrics): compute utilisation, peak hour, turnaround, conflicts"
```

---

## Task 5: Seed data + localStorage helpers

**Files:**
- Create: `lib/seed.ts`
- Create: `lib/storage.ts`

- [ ] **Step 1: Create seed data**

Create `lib/seed.ts`:

```ts
import type { Flight, Gate } from "./types";

const TODAY = new Date();
const iso = (h: number, m: number = 0) => {
  const d = new Date(TODAY);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const SEED_GATES: Gate[] = [
  { id: "G1", name: "G1", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G2", name: "G2", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G3", name: "G3", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G4", name: "G4", terminal: "T1", compatibleTypes: ["narrow", "regional"], hasJetBridge: true },
  { id: "G5", name: "G5", terminal: "T1", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true },
  { id: "G6", name: "G6", terminal: "T1", compatibleTypes: ["narrow", "wide", "regional"], hasJetBridge: true },
  { id: "G7", name: "G7 (Remote)", terminal: "T2", compatibleTypes: ["narrow", "regional"], hasJetBridge: false },
  { id: "G8", name: "G8 (Remote)", terminal: "T2", compatibleTypes: ["narrow", "regional"], hasJetBridge: false },
];

export const SEED_FLIGHTS: Flight[] = [
  { id: "f1", flightNumber: "6E 234", airline: "IndiGo", origin: "BOM", destination: "DEL", arrival: iso(6, 30), departure: iso(7, 45), aircraftType: "narrow", pax: 180 },
  { id: "f2", flightNumber: "AI 865", airline: "Air India", origin: "BLR", destination: "DEL", arrival: iso(7, 0), departure: iso(8, 15), aircraftType: "narrow", pax: 160 },
  { id: "f3", flightNumber: "UK 995", airline: "Vistara", origin: "HYD", destination: "DEL", arrival: iso(7, 15), departure: iso(8, 45), aircraftType: "narrow", pax: 170 },
  { id: "f4", flightNumber: "SG 145", airline: "SpiceJet", origin: "MAA", destination: "DEL", arrival: iso(8, 0), departure: iso(9, 30), aircraftType: "narrow", pax: 189 },
  { id: "f5", flightNumber: "EK 512", airline: "Emirates", origin: "DXB", destination: "DEL", arrival: iso(9, 0), departure: iso(11, 30), aircraftType: "wide", pax: 380 },
  { id: "f6", flightNumber: "AI 101", airline: "Air India", origin: "JFK", destination: "DEL", arrival: iso(9, 30), departure: iso(12, 0), aircraftType: "wide", pax: 340 },
  { id: "f7", flightNumber: "6E 512", airline: "IndiGo", origin: "CCU", destination: "DEL", arrival: iso(10, 15), departure: iso(11, 30), aircraftType: "narrow", pax: 180 },
  { id: "f8", flightNumber: "UK 815", airline: "Vistara", origin: "BOM", destination: "DEL", arrival: iso(11, 0), departure: iso(12, 15), aircraftType: "narrow", pax: 170 },
  { id: "f9", flightNumber: "QR 578", airline: "Qatar Airways", origin: "DOH", destination: "DEL", arrival: iso(12, 30), departure: iso(15, 0), aircraftType: "wide", pax: 360 },
  { id: "f10", flightNumber: "6E 745", airline: "IndiGo", origin: "GOI", destination: "DEL", arrival: iso(13, 45), departure: iso(15, 0), aircraftType: "narrow", pax: 180 },
  { id: "f11", flightNumber: "SG 220", airline: "SpiceJet", origin: "IXR", destination: "DEL", arrival: iso(14, 30), departure: iso(16, 0), aircraftType: "regional", pax: 80 },
  { id: "f12", flightNumber: "AI 560", airline: "Air India", origin: "PNQ", destination: "DEL", arrival: iso(15, 15), departure: iso(16, 30), aircraftType: "narrow", pax: 160 },
  { id: "f13", flightNumber: "BA 143", airline: "British Airways", origin: "LHR", destination: "DEL", arrival: iso(16, 0), departure: iso(19, 0), aircraftType: "wide", pax: 330 },
  { id: "f14", flightNumber: "6E 880", airline: "IndiGo", origin: "COK", destination: "DEL", arrival: iso(17, 45), departure: iso(19, 0), aircraftType: "narrow", pax: 180 },
  { id: "f15", flightNumber: "LH 761", airline: "Lufthansa", origin: "FRA", destination: "DEL", arrival: iso(18, 30), departure: iso(21, 0), aircraftType: "wide", pax: 340 },
];
```

- [ ] **Step 2: Create storage helpers**

Create `lib/storage.ts`:

```ts
import type { Flight, Gate } from "./types";

const KEY_FLIGHTS = "scheduler:flights";
const KEY_GATES = "scheduler:gates";

function isBrowser() {
  return typeof window !== "undefined";
}

export const storage = {
  loadFlights(): Flight[] | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(KEY_FLIGHTS);
      return raw ? (JSON.parse(raw) as Flight[]) : null;
    } catch {
      return null;
    }
  },
  saveFlights(flights: Flight[]): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(KEY_FLIGHTS, JSON.stringify(flights));
  },
  loadGates(): Gate[] | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(KEY_GATES);
      return raw ? (JSON.parse(raw) as Gate[]) : null;
    } catch {
      return null;
    }
  },
  saveGates(gates: Gate[]): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(KEY_GATES, JSON.stringify(gates));
  },
  clear(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(KEY_FLIGHTS);
    window.localStorage.removeItem(KEY_GATES);
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add lib/seed.ts lib/storage.ts
git commit -m "feat(data): add seed flights/gates and localStorage helpers"
```

---

## Task 6: Zustand store

**Files:**
- Create: `lib/store.ts`

- [ ] **Step 1: Create the store**

Create `lib/store.ts`:

```ts
"use client";

import { create } from "zustand";
import type { Flight, Gate, ScheduleResult, Swap } from "./types";
import { SEED_FLIGHTS, SEED_GATES } from "./seed";
import { storage } from "./storage";
import { schedule } from "./scheduler";

interface StoreState {
  flights: Flight[];
  gates: Gate[];
  result: ScheduleResult | null;
  previousResult: ScheduleResult | null;
  hydrated: boolean;

  hydrate: () => void;
  addFlight: (flight: Flight) => void;
  addFlights: (flights: Flight[]) => void;
  updateFlight: (flight: Flight) => void;
  removeFlight: (id: string) => void;
  setGates: (gates: Gate[]) => void;
  runScheduler: () => void;
  applySwaps: (swaps: Swap[]) => void;
  resetToSeed: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  flights: [],
  gates: [],
  result: null,
  previousResult: null,
  hydrated: false,

  hydrate: () => {
    const flights = storage.loadFlights() ?? SEED_FLIGHTS;
    const gates = storage.loadGates() ?? SEED_GATES;
    const result = schedule(flights, gates);
    set({ flights, gates, result, hydrated: true });
  },

  addFlight: (flight) => {
    const flights = [...get().flights, flight];
    storage.saveFlights(flights);
    set({ flights, result: schedule(flights, get().gates) });
  },

  addFlights: (newFlights) => {
    const flights = [...get().flights, ...newFlights];
    storage.saveFlights(flights);
    set({ flights, result: schedule(flights, get().gates) });
  },

  updateFlight: (flight) => {
    const flights = get().flights.map((f) => (f.id === flight.id ? flight : f));
    storage.saveFlights(flights);
    set({ flights, result: schedule(flights, get().gates) });
  },

  removeFlight: (id) => {
    const flights = get().flights.filter((f) => f.id !== id);
    storage.saveFlights(flights);
    set({ flights, result: schedule(flights, get().gates) });
  },

  setGates: (gates) => {
    storage.saveGates(gates);
    set({ gates, result: schedule(get().flights, gates) });
  },

  runScheduler: () => {
    const current = get().result;
    set({
      previousResult: current,
      result: schedule(get().flights, get().gates),
    });
  },

  applySwaps: (swaps) => {
    const current = get().result;
    if (!current) return;
    const assignments = current.assignments.map((a) => {
      const s = swaps.find((sw) => sw.flightId === a.flightId);
      return s ? { ...a, gateId: s.toGateId } : a;
    });
    // Re-derive metrics after swap
    const newResult = schedule(get().flights, get().gates);
    // Replace assignments with swapped version but keep unassigned from fresh run
    set({
      previousResult: current,
      result: { ...newResult, assignments },
    });
  },

  resetToSeed: () => {
    storage.clear();
    const result = schedule(SEED_FLIGHTS, SEED_GATES);
    set({ flights: SEED_FLIGHTS, gates: SEED_GATES, result, previousResult: null });
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/store.ts
git commit -m "feat(store): add Zustand store with hydrate/run/swap actions"
```

---

## Task 7: Gemini server wrapper

**Files:**
- Create: `lib/gemini.ts` (server-only)

- [ ] **Step 1: Create Gemini wrapper**

Create `lib/gemini.ts`:

```ts
import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_ID = "gemini-2.5-flash";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env.local");
  return new GoogleGenerativeAI(key);
}

export async function generateJson<T>(
  prompt: string,
  schema: object,
  systemInstruction?: string,
): Promise<T> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema as never,
      temperature: 0.2,
    },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: { temperature: 0.3 },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

Also install the `server-only` package:

```bash
npm install server-only
```

- [ ] **Step 2: Commit**

```bash
git add lib/gemini.ts package.json package-lock.json
git commit -m "feat(ai): add Gemini server wrapper with JSON + text helpers"
```

---

## Task 8: AI API routes — parse-flight + bulk-import

**Files:**
- Create: `app/api/ai/parse-flight/route.ts`
- Create: `app/api/ai/bulk-import/route.ts`

- [ ] **Step 1: Create parse-flight route**

Create `app/api/ai/parse-flight/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";

const FLIGHT_SCHEMA = {
  type: "object",
  properties: {
    flightNumber: { type: "string" },
    airline: { type: "string" },
    origin: { type: "string" },
    destination: { type: "string" },
    arrival: { type: "string", description: "ISO 8601 timestamp for today" },
    departure: { type: "string", description: "ISO 8601 timestamp for today" },
    aircraftType: { type: "string", enum: ["narrow", "wide", "regional"] },
    pax: { type: "number" },
  },
  required: ["flightNumber", "airline", "origin", "destination", "arrival", "departure", "aircraftType"],
};

const SYSTEM = `You parse natural-language flight descriptions into structured JSON for an airport gate scheduler.
- Always assume the date is today (the user's local date is provided in the prompt).
- Return ISO 8601 timestamps in local time (no timezone offset).
- If the aircraft type is ambiguous, infer from aircraft model: A320/B737/E190 = narrow, A330/B777/B787/A380 = wide, ATR/CRJ/Dash = regional.
- Airlines: IndiGo (6E), Air India (AI), Vistara (UK), SpiceJet (SG), Emirates (EK), Qatar Airways (QR), British Airways (BA), Lufthansa (LH).`;

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    const today = new Date();
    const dateHint = `Today's date is ${today.toISOString().slice(0, 10)}.`;
    const flight = await generateJson(
      `${dateHint}\n\nDescription: ${text}`,
      FLIGHT_SCHEMA,
      SYSTEM,
    );
    return NextResponse.json({ flight });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create bulk-import route**

Create `app/api/ai/bulk-import/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";

const FLIGHTS_SCHEMA = {
  type: "object",
  properties: {
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flightNumber: { type: "string" },
          airline: { type: "string" },
          origin: { type: "string" },
          destination: { type: "string" },
          arrival: { type: "string" },
          departure: { type: "string" },
          aircraftType: { type: "string", enum: ["narrow", "wide", "regional"] },
          pax: { type: "number" },
        },
        required: ["flightNumber", "airline", "origin", "destination", "arrival", "departure", "aircraftType"],
      },
    },
  },
  required: ["flights"],
};

const SYSTEM = `You convert messy airline timetables (CSV, pasted text, tables) into a clean array of flights for an airport gate scheduler.
- Assume today's date for every timestamp.
- Output ISO 8601 timestamps in local time.
- Infer aircraft type from model or passenger count when the type is not explicit.
- If a row is ambiguous, skip it rather than guessing.`;

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    const today = new Date();
    const dateHint = `Today's date is ${today.toISOString().slice(0, 10)}.`;
    const data = await generateJson<{ flights: unknown[] }>(
      `${dateHint}\n\nTimetable:\n${text}`,
      FLIGHTS_SCHEMA,
      SYSTEM,
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/parse-flight/route.ts app/api/ai/bulk-import/route.ts
git commit -m "feat(ai): add parse-flight and bulk-import API routes"
```

---

## Task 9: AI API routes — explain-conflict + optimize + chat

**Files:**
- Create: `app/api/ai/explain-conflict/route.ts`
- Create: `app/api/ai/optimize/route.ts`
- Create: `app/api/ai/chat/route.ts`

- [ ] **Step 1: Create explain-conflict route**

Create `app/api/ai/explain-conflict/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import type { Assignment, Flight, Gate } from "@/lib/types";

const SYSTEM = `You explain to an airport operations manager why a specific flight could not be assigned to any gate.
- Be concise (2-4 sentences).
- Reference specific gates and time windows when relevant.
- Suggest one concrete action they could take.
- Use plain English, not jargon.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      flight: Flight;
      assignments: Assignment[];
      gates: Gate[];
    };
    const prompt = `Flight: ${JSON.stringify(body.flight)}
Gates: ${JSON.stringify(body.gates)}
Current assignments: ${JSON.stringify(body.assignments)}

Why couldn't this flight be assigned? What should the operator do?`;
    const explanation = await generateText(prompt, SYSTEM);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create optimize route**

Create `app/api/ai/optimize/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import type { Assignment, Flight, Gate } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    swaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flightId: { type: "string" },
          fromGateId: { type: "string" },
          toGateId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["flightId", "fromGateId", "toGateId", "reason"],
      },
    },
  },
  required: ["summary", "swaps"],
};

const SYSTEM = `You optimise airport gate assignments.
- Suggest swaps that increase gate utilisation, reduce wasted jet-bridge capacity, or balance load across terminals.
- Respect aircraft-gate compatibility (wide-body only on wide-capable gates).
- Respect the 15-minute turnaround buffer between flights on the same gate.
- Each swap must reference real flightId/fromGateId/toGateId from the input.
- Limit to the 3 most impactful swaps.
- Write the reason in one sentence, plain English.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      flights: Flight[];
      gates: Gate[];
      assignments: Assignment[];
    };
    const prompt = `Flights: ${JSON.stringify(body.flights)}
Gates: ${JSON.stringify(body.gates)}
Current assignments: ${JSON.stringify(body.assignments)}

Propose up to 3 swaps that improve the schedule. Return JSON matching the provided schema.`;
    const data = await generateJson(prompt, SCHEMA, SYSTEM);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create chat route**

Create `app/api/ai/chat/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import type { Assignment, Flight, Gate, Metrics } from "@/lib/types";

const SYSTEM = `You are an assistant for an airport gate scheduler.
- The user can ask what-if questions, operational questions, or about specific flights/gates.
- You have read-only access to the current flights, gates, assignments, and metrics.
- Answer concisely (under 120 words).
- When asked "what if X changes", walk through the consequences step by step.
- Cite specific flight numbers and gate names when relevant.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message: string;
      flights: Flight[];
      gates: Gate[];
      assignments: Assignment[];
      metrics: Metrics;
    };
    const prompt = `Current schedule context:
Flights: ${JSON.stringify(body.flights)}
Gates: ${JSON.stringify(body.gates)}
Assignments: ${JSON.stringify(body.assignments)}
Metrics: ${JSON.stringify(body.metrics)}

User question: ${body.message}`;
    const reply = await generateText(prompt, SYSTEM);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/explain-conflict/route.ts app/api/ai/optimize/route.ts app/api/ai/chat/route.ts
git commit -m "feat(ai): add explain-conflict, optimize, and chat API routes"
```

---

## Task 10: App shell — layout, theme, top bar

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/top-bar.tsx`
- Create: `components/theme-provider.tsx`

- [ ] **Step 1: Install next-themes**

```bash
npm install next-themes
```

- [ ] **Step 2: Create theme provider**

Create `components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
```

- [ ] **Step 3: Update root layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Gate Scheduler",
  description: "AI-assisted airport gate and jet-bridge assignment scheduler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Add gradient + glass styles to globals.css**

Append to `app/globals.css`:

```css
@layer utilities {
  .glass {
    @apply bg-background/60 backdrop-blur-xl border border-border/40;
  }
  .brand-gradient {
    background: linear-gradient(135deg, hsl(222 84% 58%) 0%, hsl(262 80% 60%) 50%, hsl(200 90% 55%) 100%);
  }
  .text-brand-gradient {
    background: linear-gradient(135deg, hsl(222 84% 58%) 0%, hsl(262 80% 60%) 50%, hsl(200 90% 55%) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}
```

- [ ] **Step 5: Create top bar**

Create `components/top-bar.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Moon, Plane, Play, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function TopBar() {
  const { runScheduler, resetToSeed, result } = useStore();
  const { theme, setTheme } = useTheme();
  const utilisation = result ? Math.round(result.metrics.overallUtilisation * 100) : 0;
  const assigned = result?.metrics.assignedFlights ?? 0;
  const total = result?.metrics.totalFlights ?? 0;

  return (
    <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-lg">
          <Plane className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-brand-gradient text-lg font-bold leading-tight">Gate Scheduler</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">AI-assisted gate & jet-bridge assignment</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <motion.div key={utilisation} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Utilisation</div>
          <div className="text-xl font-bold tabular-nums">{utilisation}%</div>
        </motion.div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Assigned</div>
          <div className="text-xl font-bold tabular-nums">{assigned}/{total}</div>
        </div>

        <Button onClick={runScheduler} className="brand-gradient text-white shadow-lg hover:opacity-90">
          <Play className="mr-2 h-4 w-4" /> Run Scheduler
        </Button>
        <Button onClick={resetToSeed} variant="outline" size="icon" title="Reset to sample data">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} variant="ghost" size="icon">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Replace app/page.tsx with a shell that hydrates the store**

Replace `app/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/top-bar";

export default function Page() {
  const { hydrate, hydrated } = useStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <TopBar />
      <main className="grid h-[calc(100vh-4rem)] grid-cols-[320px_1fr_380px] gap-4 p-4">
        <aside className="glass rounded-2xl overflow-hidden">Left sidebar (Task 11)</aside>
        <section className="glass rounded-2xl overflow-hidden">Gantt chart (Task 13)</section>
        <aside className="glass rounded-2xl overflow-hidden">Right sidebar (Tasks 14–16)</aside>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Run dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:3000. Expected: top bar renders with brand gradient, utilisation chip shows a number from seed data, theme toggle works. Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/globals.css app/page.tsx components/top-bar.tsx components/theme-provider.tsx package.json package-lock.json
git commit -m "feat(ui): add app shell with top bar, theme toggle, and layout grid"
```

---

## Task 11: Left sidebar — FlightForm + FlightList

**Files:**
- Create: `components/input-panel/flight-form.tsx`
- Create: `components/input-panel/flight-list.tsx`
- Create: `components/input-panel/input-panel.tsx`

- [ ] **Step 1: Create FlightForm**

Create `components/input-panel/flight-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Flight, AircraftType } from "@/lib/types";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const fromIso = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface Props {
  initial?: Partial<Flight>;
  onDone?: () => void;
}

export function FlightForm({ initial, onDone }: Props) {
  const { addFlight } = useStore();
  const [flightNumber, setFlightNumber] = useState(initial?.flightNumber ?? "");
  const [airline, setAirline] = useState(initial?.airline ?? "");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [arrival, setArrival] = useState(initial?.arrival ? fromIso(initial.arrival) : "10:00");
  const [departure, setDeparture] = useState(initial?.departure ? fromIso(initial.departure) : "11:30");
  const [aircraftType, setAircraftType] = useState<AircraftType>(initial?.aircraftType ?? "narrow");
  const [pax, setPax] = useState(initial?.pax?.toString() ?? "");

  const submit = () => {
    if (!flightNumber || !airline) {
      toast.error("Flight number and airline are required.");
      return;
    }
    const flight: Flight = {
      id: `f-${Date.now()}`,
      flightNumber, airline, origin, destination,
      arrival: todayAt(arrival), departure: todayAt(departure),
      aircraftType,
      pax: pax ? Number(pax) : undefined,
    };
    addFlight(flight);
    toast.success(`Added ${flight.flightNumber}`);
    onDone?.();
    setFlightNumber(""); setOrigin(""); setDestination(""); setPax("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Flight #</Label>
          <Input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="6E 234" />
        </div>
        <div>
          <Label className="text-xs">Airline</Label>
          <Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="IndiGo" />
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="BOM" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="DEL" />
        </div>
        <div>
          <Label className="text-xs">Arrival</Label>
          <Input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Departure</Label>
          <Input type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Aircraft</Label>
          <Select value={aircraftType} onValueChange={(v) => setAircraftType(v as AircraftType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="narrow">Narrow-body</SelectItem>
              <SelectItem value="wide">Wide-body</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pax</Label>
          <Input type="number" value={pax} onChange={(e) => setPax(e.target.value)} placeholder="180" />
        </div>
      </div>
      <Button onClick={submit} className="w-full brand-gradient text-white">
        <Plus className="mr-2 h-4 w-4" /> Add Flight
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create FlightList**

Create `components/input-panel/flight-list.tsx`:

```tsx
"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function FlightList() {
  const { flights, removeFlight } = useStore();
  const sorted = [...flights].sort(
    (a, b) => new Date(a.arrival).getTime() - new Date(b.arrival).getTime(),
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-1">
        <AnimatePresence initial={false}>
          {sorted.map((f) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-2 text-sm hover:bg-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{f.flightNumber}</span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {f.aircraftType}
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {f.origin} → {f.destination} · {hhmm(f.arrival)}–{hhmm(f.departure)}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => removeFlight(f.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 3: Create InputPanel wrapper (tabs placeholder; paste tab filled in Task 12)**

Create `components/input-panel/input-panel.tsx`:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlightForm } from "./flight-form";
import { FlightList } from "./flight-list";
import { Separator } from "@/components/ui/separator";

export function InputPanel() {
  return (
    <div className="flex h-full flex-col p-4">
      <Tabs defaultValue="manual" className="flex-shrink-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="paste">AI Paste</TabsTrigger>
          <TabsTrigger value="csv">CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-3">
          <FlightForm />
        </TabsContent>
        <TabsContent value="paste" className="mt-3">
          <p className="text-xs text-muted-foreground">(Paste-import added in Task 12.)</p>
        </TabsContent>
        <TabsContent value="csv" className="mt-3">
          <p className="text-xs text-muted-foreground">(CSV upload added in Task 12.)</p>
        </TabsContent>
      </Tabs>
      <Separator className="my-4" />
      <div className="min-h-0 flex-1">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Flights
        </div>
        <FlightList />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire InputPanel into page.tsx**

Edit `app/page.tsx` — replace the left `<aside>` placeholder:

```tsx
<aside className="glass rounded-2xl overflow-hidden">
  <InputPanel />
</aside>
```

And add the import at the top:

```tsx
import { InputPanel } from "@/components/input-panel/input-panel";
```

- [ ] **Step 5: Visual verify**

```bash
npm run dev
```

Expected: left sidebar shows tabs, manual form, flight list with the 15 seed flights. Adding a flight makes it appear in the list.

- [ ] **Step 6: Commit**

```bash
git add components/input-panel app/page.tsx
git commit -m "feat(ui): add manual flight form and flight list"
```

---

## Task 12: Left sidebar — AI paste + CSV upload

**Files:**
- Create: `components/input-panel/paste-import.tsx`
- Create: `components/input-panel/csv-import.tsx`
- Modify: `components/input-panel/input-panel.tsx`

- [ ] **Step 1: Create PasteImport**

Create `components/input-panel/paste-import.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import type { Flight } from "@/lib/types";

export function PasteImport() {
  const { addFlights, addFlight } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const parseOne = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/parse-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      const flight: Flight = { id: `f-${Date.now()}`, ...data.flight };
      addFlight(flight);
      toast.success(`Added ${flight.flightNumber}`);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse");
    } finally {
      setBusy(false);
    }
  };

  const parseMany = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      const flights: Flight[] = (data.flights as Omit<Flight, "id">[]).map((f, i) => ({
        ...f, id: `f-${Date.now()}-${i}`,
      }));
      if (!flights.length) throw new Error("AI returned no flights");
      addFlights(flights);
      toast.success(`Imported ${flights.length} flights`);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a single flight like 'AI 202 from Delhi at 10:30, wide body, departs 12:15' or paste an entire airline timetable here…"
        className="min-h-[160px] font-mono text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={parseOne} disabled={busy || !text.trim()} variant="outline">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Parse one
        </Button>
        <Button onClick={parseMany} disabled={busy || !text.trim()} className="brand-gradient text-white">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Parse many
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Powered by Gemini. No local validation — review flights after import.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create CsvImport**

Create `components/input-panel/csv-import.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import type { Flight } from "@/lib/types";

export function CsvImport() {
  const { addFlights } = useStore();
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/ai/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      const flights: Flight[] = (data.flights as Omit<Flight, "id">[]).map((f, i) => ({
        ...f, id: `f-${Date.now()}-${i}`,
      }));
      if (!flights.length) throw new Error("AI returned no flights");
      addFlights(flights);
      toast.success(`Imported ${flights.length} flights from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={ref}
        type="file"
        accept=".csv,.txt,.tsv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
      <Button onClick={() => ref.current?.click()} disabled={busy} className="w-full" variant="outline">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
        Upload CSV / TXT
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Any airline timetable format works — Gemini normalises it.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Update InputPanel to wire both**

Replace the `TabsContent` sections in `components/input-panel/input-panel.tsx`:

```tsx
<TabsContent value="paste" className="mt-3">
  <PasteImport />
</TabsContent>
<TabsContent value="csv" className="mt-3">
  <CsvImport />
</TabsContent>
```

Add imports at the top:

```tsx
import { PasteImport } from "./paste-import";
import { CsvImport } from "./csv-import";
```

- [ ] **Step 4: Commit**

```bash
git add components/input-panel/paste-import.tsx components/input-panel/csv-import.tsx components/input-panel/input-panel.tsx
git commit -m "feat(ui): add AI-powered paste and CSV upload tabs"
```

---

## Task 13: Gantt chart

**Files:**
- Create: `components/gantt/gantt-chart.tsx`
- Create: `components/gantt/flight-block.tsx`
- Create: `components/gantt/time-axis.tsx`
- Create: `lib/colors.ts`

- [ ] **Step 1: Create airline color mapping**

Create `lib/colors.ts`:

```ts
const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#3b82f6",
];

export function airlineColor(airline: string): string {
  let hash = 0;
  for (let i = 0; i < airline.length; i++) hash = (hash * 31 + airline.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
```

- [ ] **Step 2: Create time axis**

Create `components/gantt/time-axis.tsx`:

```tsx
export function TimeAxis({ hourWidth }: { hourWidth: number }) {
  return (
    <div className="sticky top-0 z-10 flex h-8 border-b border-border/50 bg-background/80 backdrop-blur">
      {Array.from({ length: 24 }).map((_, h) => (
        <div
          key={h}
          className="flex-shrink-0 border-r border-border/30 text-[10px] text-muted-foreground"
          style={{ width: hourWidth }}
        >
          <span className="ml-1">{String(h).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create FlightBlock**

Create `components/gantt/flight-block.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { Assignment, Flight } from "@/lib/types";
import { airlineColor } from "@/lib/colors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  assignment: Assignment;
  flight: Flight;
  hourWidth: number;
}

const minutesFromMidnight = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function FlightBlock({ assignment, flight, hourWidth }: Props) {
  const startMin = minutesFromMidnight(assignment.start);
  const endMin = minutesFromMidnight(assignment.end);
  const left = (startMin / 60) * hourWidth;
  const width = Math.max(((endMin - startMin) / 60) * hourWidth, 40);
  const color = airlineColor(flight.airline);

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="absolute top-1 flex h-10 cursor-pointer items-center overflow-hidden rounded-lg px-2 text-[11px] font-medium text-white shadow-md ring-1 ring-white/10 hover:brightness-110"
            style={{ left, width, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            <span className="truncate">{flight.flightNumber}</span>
            <span className="ml-1 truncate text-white/75">· {flight.origin}</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold">{flight.flightNumber} · {flight.airline}</div>
            <div>{flight.origin} → {flight.destination}</div>
            <div>{hhmm(assignment.start)} – {hhmm(assignment.end)}</div>
            <div>Aircraft: {flight.aircraftType}-body{flight.pax ? ` · ${flight.pax} pax` : ""}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: Create GanttChart**

Create `components/gantt/gantt-chart.tsx`:

```tsx
"use client";

import { useStore } from "@/lib/store";
import { TimeAxis } from "./time-axis";
import { FlightBlock } from "./flight-block";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@/lib/types";

const HOUR_WIDTH = 72;
const TOTAL_WIDTH = HOUR_WIDTH * 24;

export function GanttChart() {
  const { gates, flights, result } = useStore();
  const flightsById = new Map(flights.map((f) => [f.id, f]));
  const byGate = new Map<string, Assignment[]>();
  if (result) {
    for (const a of result.assignments) {
      if (!byGate.has(a.gateId)) byGate.set(a.gateId, []);
      byGate.get(a.gateId)!.push(a);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gate Timeline</h2>
        {result && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{result.assignments.length} assigned</Badge>
            {result.unassigned.length > 0 && (
              <Badge variant="destructive">{result.unassigned.length} unassigned</Badge>
            )}
            <Badge variant="outline">Peak {String(result.metrics.peakHour.hour).padStart(2, "0")}:00 · {result.metrics.peakHour.count} flights</Badge>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div style={{ width: TOTAL_WIDTH + 120 }} className="relative">
          <div className="sticky left-0 z-20 w-[120px] flex-shrink-0">
            <div className="h-8 border-b border-r border-border/50 bg-background/80 backdrop-blur" />
            {gates.map((g) => (
              <div key={g.id} className="flex h-12 items-center border-b border-r border-border/30 bg-background/60 px-3 backdrop-blur">
                <div>
                  <div className="text-xs font-semibold">{g.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {g.hasJetBridge ? "Jet-bridge" : "Remote"} · {g.compatibleTypes.includes("wide") ? "Wide+" : "Narrow"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="ml-[120px]">
            <TimeAxis hourWidth={HOUR_WIDTH} />
            {gates.map((g) => (
              <div key={g.id} className="relative h-12 border-b border-border/30">
                <div className="absolute inset-0 flex">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-shrink-0 border-r border-border/20" style={{ width: HOUR_WIDTH }} />
                  ))}
                </div>
                {(byGate.get(g.id) ?? []).map((a) => {
                  const f = flightsById.get(a.flightId);
                  if (!f) return null;
                  return <FlightBlock key={a.flightId} assignment={a} flight={f} hourWidth={HOUR_WIDTH} />;
                })}
              </div>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 5: Wire into page**

In `app/page.tsx`, replace the center `<section>` with:

```tsx
<section className="glass rounded-2xl overflow-hidden">
  <GanttChart />
</section>
```

Add import:

```tsx
import { GanttChart } from "@/components/gantt/gantt-chart";
```

- [ ] **Step 6: Visual verify**

```bash
npm run dev
```

Expected: middle panel shows 8 rows (one per gate), each with coloured flight blocks at the correct times. Hovering a block shows flight details.

- [ ] **Step 7: Commit**

```bash
git add components/gantt lib/colors.ts app/page.tsx
git commit -m "feat(gantt): implement Gantt chart with airline colors and tooltips"
```

---

## Task 14: Right sidebar — metrics dashboard

**Files:**
- Create: `components/metrics/metrics-dashboard.tsx`
- Create: `components/metrics/metric-card.tsx`
- Create: `components/metrics/gate-utilisation-chart.tsx`

- [ ] **Step 1: Create MetricCard**

Create `components/metrics/metric-card.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  accent?: string;
}

export function MetricCard({ icon: Icon, label, value, delta, accent = "from-indigo-500/20 to-purple-500/10" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br ${accent} p-3`}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {delta && (
          <span className={`text-xs font-medium ${delta.positive ? "text-emerald-500" : "text-rose-500"}`}>
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create GateUtilisationChart**

Create `components/metrics/gate-utilisation-chart.tsx`:

```tsx
"use client";

import { useStore } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

export function GateUtilisationChart() {
  const { gates, result } = useStore();
  if (!result) return null;
  const data = gates.map((g) => ({
    name: g.name,
    utilisation: Math.round((result.metrics.perGateUtilisation[g.id] ?? 0) * 100),
    jetBridge: g.hasJetBridge,
  }));

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Gate utilisation
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: "hsl(var(--background))" }} />
          <Bar dataKey="utilisation" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.jetBridge ? "#6366f1" : "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create MetricsDashboard**

Create `components/metrics/metrics-dashboard.tsx`:

```tsx
"use client";

import { useStore } from "@/lib/store";
import { MetricCard } from "./metric-card";
import { GateUtilisationChart } from "./gate-utilisation-chart";
import { Activity, Clock, Gauge, Plane, TrendingUp, AlertTriangle } from "lucide-react";

export function MetricsDashboard() {
  const { result, previousResult } = useStore();
  if (!result) return null;
  const m = result.metrics;

  const deltaUtil = previousResult
    ? Math.round((m.overallUtilisation - previousResult.metrics.overallUtilisation) * 100)
    : null;

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Gauge}
          label="Utilisation"
          value={`${Math.round(m.overallUtilisation * 100)}%`}
          delta={deltaUtil !== null && deltaUtil !== 0 ? { value: `${Math.abs(deltaUtil)}%`, positive: deltaUtil > 0 } : undefined}
          accent="from-indigo-500/20 to-purple-500/10"
        />
        <MetricCard icon={Plane} label="Assigned" value={`${m.assignedFlights}/${m.totalFlights}`} accent="from-emerald-500/20 to-teal-500/10" />
        <MetricCard icon={TrendingUp} label="Peak hour" value={`${String(m.peakHour.hour).padStart(2, "0")}:00`} accent="from-amber-500/20 to-orange-500/10" />
        <MetricCard icon={Clock} label="Avg turnaround" value={`${m.avgTurnaroundMinutes}m`} accent="from-sky-500/20 to-blue-500/10" />
        <MetricCard icon={Activity} label="Jet-bridge" value={`${Math.round(m.jetbridgeShare * 100)}%`} accent="from-fuchsia-500/20 to-pink-500/10" />
        <MetricCard icon={AlertTriangle} label="Unassigned" value={`${m.unassignedCount}`} accent={m.unassignedCount ? "from-rose-500/20 to-red-500/10" : "from-slate-500/20 to-slate-500/5"} />
      </div>
      <GateUtilisationChart />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/metrics
git commit -m "feat(metrics): add metrics dashboard with cards and utilisation chart"
```

---

## Task 15: Right sidebar — AI assistant chat

**Files:**
- Create: `components/ai/assistant-panel.tsx`

- [ ] **Step 1: Create AssistantPanel**

Create `components/ai/assistant-panel.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/lib/store";
import { Send, Sparkles, Loader2, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What if AI 101 is delayed by 30 minutes?",
  "Which gates are underused?",
  "How many wide-body flights are scheduled?",
  "When is the airport busiest?",
];

export function AssistantPanel() {
  const { flights, gates, result } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me anything about the schedule — utilisation, conflicts, what-if scenarios, or specific flights." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text?: string) => {
    const message = text ?? input;
    if (!message.trim() || !result) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          flights, gates,
          assignments: result.assignments,
          metrics: result.metrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `Sorry, I hit an error: ${err instanceof Error ? err.message : "unknown"}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-4 pt-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="brand-gradient flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Try:</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="rounded-full border border-border/50 px-2.5 py-1 text-[11px] hover:bg-muted">
                <Sparkles className="mr-1 inline h-3 w-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border/50 p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && send()}
            placeholder="Ask the AI…"
            disabled={busy}
          />
          <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ai/assistant-panel.tsx
git commit -m "feat(ai): add assistant chat panel with suggestions"
```

---

## Task 16: Right sidebar — conflicts list + optimise + right-panel wiring

**Files:**
- Create: `components/conflicts/conflicts-panel.tsx`
- Create: `components/ai/optimize-dialog.tsx`
- Create: `components/right-panel.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create ConflictsPanel**

Create `components/conflicts/conflicts-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function ConflictsPanel() {
  const { result, gates } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  if (!result) return null;

  const explain = async (flightId: string) => {
    const item = result.unassigned.find((u) => u.flight.id === flightId);
    if (!item) return;
    setBusy(flightId);
    try {
      const res = await fetch("/api/ai/explain-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight: item.flight, assignments: result.assignments, gates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReasons((r) => ({ ...r, [flightId]: data.explanation }));
    } catch (err) {
      setReasons((r) => ({ ...r, [flightId]: `Error: ${err instanceof Error ? err.message : "unknown"}` }));
    } finally {
      setBusy(null);
    }
  };

  if (result.unassigned.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <AlertTriangle className="h-5 w-5 text-emerald-500" />
        </div>
        No conflicts — every flight has a gate.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {result.unassigned.map(({ flight, reason }) => (
        <motion.div key={flight.id} layout
          className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{flight.flightNumber}</div>
              <div className="text-xs text-muted-foreground">
                {flight.origin} → {flight.destination} · {flight.aircraftType}-body
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => explain(flight.id)} disabled={busy === flight.id}>
              {busy === flight.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
              Explain
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{reason}</p>
          {reasons[flight.id] && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 rounded-lg border border-border/50 bg-background/60 p-2 text-xs leading-relaxed"
            >
              {reasons[flight.id]}
            </motion.p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create OptimizeDialog**

Create `components/ai/optimize-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Swap } from "@/lib/types";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function OptimizeDialog() {
  const { flights, gates, result, applySwaps } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [swaps, setSwaps] = useState<Swap[]>([]);

  const run = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flights, gates, assignments: result.assignments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary);
      setSwaps(data.swaps ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    applySwaps(swaps);
    setOpen(false);
    setSwaps([]);
    setSummary("");
    toast.success(`Applied ${swaps.length} swap${swaps.length === 1 ? "" : "s"}`);
  };

  const gateName = (id: string) => gates.find((g) => g.id === id)?.name ?? id;
  const flightNumber = (id: string) => flights.find((f) => f.id === id)?.flightNumber ?? id;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) run(); else { setSwaps([]); setSummary(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Sparkles className="mr-2 h-4 w-4" /> AI Optimize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-gradient">AI Schedule Optimisation</DialogTitle>
        </DialogHeader>
        {busy && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Gemini is analysing your schedule…
          </div>
        )}
        {!busy && summary && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{summary}</p>
            <div className="space-y-2">
              {swaps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-border/50 bg-card/40 p-3 text-sm"
                >
                  <div className="font-medium">
                    {flightNumber(s.flightId)}: {gateName(s.fromGateId)} → {gateName(s.toGateId)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.reason}</div>
                </motion.div>
              ))}
            </div>
            {swaps.length > 0 && (
              <Button onClick={apply} className="w-full brand-gradient text-white">
                <Check className="mr-2 h-4 w-4" /> Apply all {swaps.length} swap{swaps.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create RightPanel wrapper**

Create `components/right-panel.tsx`:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssistantPanel } from "./ai/assistant-panel";
import { MetricsDashboard } from "./metrics/metrics-dashboard";
import { ConflictsPanel } from "./conflicts/conflicts-panel";
import { OptimizeDialog } from "./ai/optimize-dialog";

export function RightPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 p-3">
        <OptimizeDialog />
      </div>
      <Tabs defaultValue="assistant" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>
        <TabsContent value="assistant" className="flex-1 overflow-hidden data-[state=inactive]:hidden">
          <AssistantPanel />
        </TabsContent>
        <TabsContent value="metrics" className="flex-1 overflow-auto data-[state=inactive]:hidden">
          <MetricsDashboard />
        </TabsContent>
        <TabsContent value="conflicts" className="flex-1 overflow-auto data-[state=inactive]:hidden">
          <ConflictsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: Wire into page.tsx**

In `app/page.tsx`, replace the right `<aside>` with:

```tsx
<aside className="glass rounded-2xl overflow-hidden">
  <RightPanel />
</aside>
```

Add import:

```tsx
import { RightPanel } from "@/components/right-panel";
```

- [ ] **Step 5: Full visual verify**

Create `.env.local` at the project root with the user's Gemini key:

```
GEMINI_API_KEY=paste_your_key_here
```

Then:

```bash
npm run dev
```

Expected on http://localhost:3000:
- Top bar with utilisation %
- Left: flight list, three input tabs
- Center: Gantt chart with seed flights on gates
- Right: Optimize button + 3 tabs (Assistant, Metrics, Conflicts)
- Clicking AI Optimize opens dialog, Gemini returns swaps, "Apply" updates the chart
- Assistant tab answers what-if questions
- Conflicts tab explains unassigned flights

- [ ] **Step 6: Commit**

```bash
git add components/conflicts components/ai/optimize-dialog.tsx components/right-panel.tsx app/page.tsx
git commit -m "feat(ui): wire conflicts panel, AI optimize dialog, and right sidebar"
```

---

## Task 17: Polish, build check, and README

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`
- Modify: `app/globals.css` (small polish)

- [ ] **Step 1: Ensure .gitignore excludes .env.local**

Open `.gitignore` and confirm these lines exist (add if missing):

```
.env*
!.env.example
```

- [ ] **Step 2: Write a useful README**

Replace `README.md`:

````markdown
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

- First-fit decreasing scheduler with 15-minute turnaround buffer and aircraft/gate compatibility rules.
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

- Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui
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
````

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors. Warnings OK.

- [ ] **Step 5: Run production build**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add README.md .gitignore app/globals.css
git commit -m "docs: add README and final polish"
```

---

## Definition of Done

- [ ] `npm test` passes (compatibility + scheduler + metrics).
- [ ] `npm run build` succeeds.
- [ ] `npm run dev` boots at http://localhost:3000.
- [ ] Seed data auto-loads on first visit.
- [ ] Manual flight form adds flights and re-runs the scheduler.
- [ ] AI Paste tab parses a single flight or a bulk timetable.
- [ ] CSV upload goes through the bulk-import route.
- [ ] Gantt chart shows no overlapping blocks on any gate.
- [ ] Wide-body flights never land on narrow-only gates.
- [ ] Conflicts tab lists unassigned flights; Explain button returns a plain-English AI reason.
- [ ] Metrics dashboard shows live values and the utilisation bar chart.
- [ ] AI Optimize returns at least one swap on seed data; Apply updates the Gantt chart.
- [ ] Assistant chat answers "What if AI 101 is delayed 30 minutes?" coherently.
- [ ] Refreshing the page preserves the flight list (localStorage).
- [ ] Theme toggle switches between dark and light.
- [ ] `.env.local` is in `.gitignore` and not committed.
