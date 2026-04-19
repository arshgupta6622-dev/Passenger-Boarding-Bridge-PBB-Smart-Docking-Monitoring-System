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
