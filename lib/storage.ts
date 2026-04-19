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
