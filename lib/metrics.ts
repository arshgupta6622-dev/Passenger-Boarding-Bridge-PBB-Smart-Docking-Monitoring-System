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
