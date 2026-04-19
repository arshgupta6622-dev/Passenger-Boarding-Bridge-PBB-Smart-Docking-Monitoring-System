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
