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
    const newResult = schedule(get().flights, get().gates);
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
