"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import type { Flight } from "@/lib/types";

export function PasteImport() {
  const { addFlights, addFlight } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const parseOne = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/parse-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      const flight: Flight = { id: `f-${Date.now()}`, ...data.flight };
      addFlight(flight);
      const result = useStore.getState().result;
      const gates = useStore.getState().gates;
      const a = result?.assignments.find((x) => x.flightId === flight.id);
      if (a) {
        const gate = gates.find((g) => g.id === a.gateId);
        toast.success(`${flight.flightNumber} docked at ${gate?.name ?? a.gateId}`);
      } else {
        toast.warning(`${flight.flightNumber} couldn't be docked — check Conflicts tab`);
      }
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse");
    } finally {
      setBusy(false);
    }
  };

  const parseMany = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      const flights: Flight[] = (data.flights as Omit<Flight, "id">[]).map((f, i) => ({
        ...f, id: `f-${Date.now()}-${i}`,
      }));
      if (!flights.length) throw new Error("AI returned no flights");
      addFlights(flights);
      const result = useStore.getState().result;
      const newIds = new Set(flights.map((f) => f.id));
      const docked = result?.assignments.filter((a) => newIds.has(a.flightId)).length ?? 0;
      const undocked = flights.length - docked;
      if (undocked === 0) {
        toast.success(`Imported ${flights.length} flights — all docked`);
      } else {
        toast.warning(`Imported ${flights.length} flights · ${docked} docked, ${undocked} unassigned`, {
          description: "Open the Conflicts tab to see which couldn't fit.",
        });
      }
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a single flight like 'AI 202 from Delhi at 10:30, wide body, departs 12:15' or paste an entire airline timetable here…"
        className="min-h-[160px] font-mono text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={parseOne} disabled={busy || !text.trim()} variant="outline">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Parse one
        </Button>
        <Button onClick={parseMany} disabled={busy || !text.trim()} className="brand-gradient text-white">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Parse many
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Powered by Gemini. No local validation — review flights after import.
      </p>
    </div>
  );
}
