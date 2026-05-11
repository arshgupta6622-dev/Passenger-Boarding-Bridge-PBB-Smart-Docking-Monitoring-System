"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Flight, AircraftType } from "@/lib/types";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const fromIso = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface Props {
  initial?: Partial<Flight>;
  onDone?: () => void;
}

export function FlightForm({ initial, onDone }: Props) {
  const { addFlight, gates } = useStore();
  const [flightNumber, setFlightNumber] = useState(initial?.flightNumber ?? "");
  const [airline, setAirline] = useState(initial?.airline ?? "");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [arrival, setArrival] = useState(initial?.arrival ? fromIso(initial.arrival) : "10:00");
  const [departure, setDeparture] = useState(initial?.departure ? fromIso(initial.departure) : "11:30");
  const [aircraftType, setAircraftType] = useState<AircraftType>(initial?.aircraftType ?? "narrow");
  const [pax, setPax] = useState(initial?.pax?.toString() ?? "");

  const submit = () => {
    if (!flightNumber || !airline) {
      toast.error("Flight number and airline are required.");
      return;
    }
    const flight: Flight = {
      id: `f-${Date.now()}`,
      flightNumber, airline, origin, destination,
      arrival: todayAt(arrival), departure: todayAt(departure),
      aircraftType,
      pax: pax ? Number(pax) : undefined,
    };
    addFlight(flight);
    // Inspect the resulting schedule to give the user a precise outcome
    const result = useStore.getState().result;
    const assignment = result?.assignments.find((a) => a.flightId === flight.id);
    if (assignment) {
      const gate = gates.find((g) => g.id === assignment.gateId);
      toast.success(`${flight.flightNumber} docked at ${gate?.name ?? assignment.gateId}`);
    } else {
      const reason = result?.unassigned.find((u) => u.flight.id === flight.id)?.reason
        ?? "No compatible PBB available in that window.";
      toast.warning(`${flight.flightNumber} couldn't be docked — check Conflicts tab`, {
        description: reason,
      });
    }
    onDone?.();
    setFlightNumber(""); setOrigin(""); setDestination(""); setPax("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Flight #</Label>
          <Input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="6E 234" />
        </div>
        <div>
          <Label className="text-xs">Airline</Label>
          <Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="IndiGo" />
        </div>
        <div>
          <Label className="text-xs">From</Label>
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="BOM" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="DEL" />
        </div>
        <div>
          <Label className="text-xs">Arrival</Label>
          <Input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Departure</Label>
          <Input type="time" value={departure} onChange={(e) => setDeparture(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Aircraft</Label>
          <Select value={aircraftType} onValueChange={(v) => setAircraftType(v as AircraftType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="narrow">Narrow-body</SelectItem>
              <SelectItem value="wide">Wide-body</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pax</Label>
          <Input type="number" value={pax} onChange={(e) => setPax(e.target.value)} placeholder="180" />
        </div>
      </div>
      <Button onClick={submit} className="w-full brand-gradient text-white">
        <Plus className="mr-2 h-4 w-4" /> Add Flight
      </Button>
    </div>
  );
}
