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
