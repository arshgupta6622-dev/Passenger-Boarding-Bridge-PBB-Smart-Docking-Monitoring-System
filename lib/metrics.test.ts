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
    const flights = [flight("F1", 10, 12), flight("F2", 14, 15)];
    const assignments: Assignment[] = flights.map((f, i) => ({
      flightId: f.id, gateId: gates[i].id, start: f.arrival, end: f.departure,
    }));
    const m = computeMetrics(assignments, gates, flights, []);
    expect(m.avgTurnaroundMinutes).toBe(90);
  });

  it("computes jet-bridge share", () => {
    const flights = [flight("F1", 10, 11), flight("F2", 10, 11)];
    const assignments: Assignment[] = [
      { flightId: "F1", gateId: "g1", start: day(10), end: day(11) },
      { flightId: "F2", gateId: "g2", start: day(10), end: day(11) },
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
