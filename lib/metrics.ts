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
