import type { AircraftType, Gate } from "./types";

export function canAssign(aircraft: AircraftType, gate: Gate): boolean {
  return gate.compatibleTypes.includes(aircraft);
}

export function scoreGate(aircraft: AircraftType, gate: Gate): number {
  if (!canAssign(aircraft, gate)) return -Infinity;
  let score = 0;
  if (gate.hasJetBridge) score += aircraft === "wide" ? 10 : 5;
  if (aircraft === "wide" && gate.compatibleTypes.includes("wide")) score += 3;
  if (aircraft === "narrow" && !gate.compatibleTypes.includes("wide")) score += 2;
  return score;
}
