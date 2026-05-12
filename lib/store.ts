"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Flight, Gate, ScheduleResult, Swap } from "./types";
import { SEED_FLIGHTS, SEED_GATES } from "./seed";
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
  reassignFlight: (
    flightId: string,
    toGateId: string,
  ) => { ok: boolean; reason?: string };
  resetToSeed: () => void;
  generateLiveDemo: () => void;
}

const recompute = (flights: Flight[], gates: Gate[]) =>
  schedule(flights, gates);

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      flights: SEED_FLIGHTS,
      gates: SEED_GATES,
      result: schedule(SEED_FLIGHTS, SEED_GATES),
      previousResult: null,
      hydrated: false,

      hydrate: () => {
        // Persist middleware auto-hydrates from localStorage on first store
        // access. This action stays as a no-op for backwards-compatibility
        // and to flip the hydrated flag if it didn't already get set.
        if (!get().hydrated) {
          const flights = get().flights;
          const gates = get().gates;
          set({ result: recompute(flights, gates), hydrated: true });
        }
      },

      addFlight: (flight) => {
        const flights = [...get().flights, flight];
        set({ flights, result: recompute(flights, get().gates) });
      },

      addFlights: (newFlights) => {
        const flights = [...get().flights, ...newFlights];
        set({ flights, result: recompute(flights, get().gates) });
      },

      updateFlight: (flight) => {
        const flights = get().flights.map((f) =>
          f.id === flight.id ? flight : f,
        );
        set({ flights, result: recompute(flights, get().gates) });
      },

      removeFlight: (id) => {
        const flights = get().flights.filter((f) => f.id !== id);
        set({ flights, result: recompute(flights, get().gates) });
      },

      setGates: (gates) => {
        set({ gates, result: recompute(get().flights, gates) });
      },

      runScheduler: () => {
        const current = get().result;
        set({
          previousResult: current,
          result: recompute(get().flights, get().gates),
        });
      },

      applySwaps: (swaps) => {
        const current = get().result;
        if (!current) return;
        const assignments = current.assignments.map((a) => {
          const s = swaps.find((sw) => sw.flightId === a.flightId);
          return s ? { ...a, gateId: s.toGateId } : a;
        });
        const newResult = recompute(get().flights, get().gates);
        set({
          previousResult: current,
          result: { ...newResult, assignments },
        });
      },

      reassignFlight: (flightId, toGateId) => {
        const current = get().result;
        if (!current) return { ok: false, reason: "Schedule not ready" };
        const flight = get().flights.find((f) => f.id === flightId);
        const gate = get().gates.find((g) => g.id === toGateId);
        if (!flight || !gate)
          return { ok: false, reason: "Unknown flight or gate" };

        if (!gate.compatibleTypes.includes(flight.aircraftType)) {
          return {
            ok: false,
            reason: `${gate.name} can't accept ${flight.aircraftType}-body aircraft.`,
          };
        }

        const start = new Date(flight.arrival).getTime();
        const end = new Date(flight.departure).getTime();
        const buffer = 15 * 60 * 1000;
        const others = current.assignments.filter(
          (a) => a.gateId === toGateId && a.flightId !== flightId,
        );
        for (const o of others) {
          const oStart = new Date(o.start).getTime();
          const oEnd = new Date(o.end).getTime();
          if (start < oEnd + buffer && end + buffer > oStart) {
            return {
              ok: false,
              reason: `${gate.name} is busy from ${o.start.slice(11, 16)}–${o.end.slice(11, 16)}.`,
            };
          }
        }

        const wasUnassigned = !current.assignments.some(
          (a) => a.flightId === flightId,
        );
        const assignments = wasUnassigned
          ? [
              ...current.assignments,
              {
                flightId,
                gateId: toGateId,
                start: flight.arrival,
                end: flight.departure,
              },
            ]
          : current.assignments.map((a) =>
              a.flightId === flightId ? { ...a, gateId: toGateId } : a,
            );
        const unassigned = current.unassigned.filter(
          (u) => u.flight.id !== flightId,
        );

        set({
          previousResult: current,
          result: { ...current, assignments, unassigned },
        });
        return { ok: true };
      },

      resetToSeed: () => {
        const result = schedule(SEED_FLIGHTS, SEED_GATES);
        set({
          flights: SEED_FLIGHTS,
          gates: SEED_GATES,
          result,
          previousResult: null,
        });
      },

      generateLiveDemo: () => {
        const now = new Date();
        const at = (offsetMin: number) => {
          const d = new Date(now.getTime() + offsetMin * 60 * 1000);
          d.setSeconds(0, 0);
          return d.toISOString();
        };

        const flights: Flight[] = [
          { id: `live-${Date.now()}-1`, flightNumber: "6E 234", airline: "IndiGo", origin: "BOM", destination: "DEL", arrival: at(-90), departure: at(0), aircraftType: "narrow", pax: 180 },
          { id: `live-${Date.now()}-2`, flightNumber: "EK 512", airline: "Emirates", origin: "DXB", destination: "DEL", arrival: at(-60), departure: at(90), aircraftType: "wide", pax: 380 },
          { id: `live-${Date.now()}-3`, flightNumber: "AI 865", airline: "Air India", origin: "BLR", destination: "DEL", arrival: at(-30), departure: at(45), aircraftType: "narrow", pax: 160 },
          { id: `live-${Date.now()}-4`, flightNumber: "UK 995", airline: "Vistara", origin: "HYD", destination: "DEL", arrival: at(15), departure: at(105), aircraftType: "narrow", pax: 170 },
          { id: `live-${Date.now()}-5`, flightNumber: "QR 578", airline: "Qatar Airways", origin: "DOH", destination: "DEL", arrival: at(30), departure: at(180), aircraftType: "wide", pax: 360 },
          { id: `live-${Date.now()}-6`, flightNumber: "SG 145", airline: "SpiceJet", origin: "MAA", destination: "DEL", arrival: at(60), departure: at(150), aircraftType: "narrow", pax: 189 },
          { id: `live-${Date.now()}-7`, flightNumber: "AI 101", airline: "Air India", origin: "JFK", destination: "DEL", arrival: at(90), departure: at(240), aircraftType: "wide", pax: 340 },
          { id: `live-${Date.now()}-8`, flightNumber: "LH 761", airline: "Lufthansa", origin: "FRA", destination: "DEL", arrival: at(120), departure: at(270), aircraftType: "wide", pax: 340 },
          { id: `live-${Date.now()}-9`, flightNumber: "6E 512", airline: "IndiGo", origin: "CCU", destination: "DEL", arrival: at(150), departure: at(225), aircraftType: "narrow", pax: 180 },
          { id: `live-${Date.now()}-10`, flightNumber: "SG 220", airline: "SpiceJet", origin: "IXR", destination: "DEL", arrival: at(180), departure: at(270), aircraftType: "regional", pax: 80 },
        ];

        const result = schedule(flights, SEED_GATES);
        set({
          flights,
          gates: SEED_GATES,
          result,
          previousResult: null,
        });
      },
    }),
    {
      name: "pbb-scheduler-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      // Only persist user data — `result` is recomputed on rehydrate.
      partialize: (state) => ({
        flights: state.flights,
        gates: state.gates,
      }),
      // After Zustand merges persisted state into the initial state, recompute
      // the schedule and flip `hydrated` so consumers know the store is ready.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.result = schedule(state.flights, state.gates);
          state.hydrated = true;
        }
      },
    },
  ),
);
