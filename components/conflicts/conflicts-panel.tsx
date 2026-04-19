"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function ConflictsPanel() {
  const { result, gates } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  if (!result) return null;

  const explain = async (flightId: string) => {
    const item = result.unassigned.find((u) => u.flight.id === flightId);
    if (!item) return;
    setBusy(flightId);
    try {
      const res = await fetch("/api/ai/explain-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight: item.flight, assignments: result.assignments, gates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReasons((r) => ({ ...r, [flightId]: data.explanation }));
    } catch (err) {
      setReasons((r) => ({ ...r, [flightId]: `Error: ${err instanceof Error ? err.message : "unknown"}` }));
    } finally {
      setBusy(null);
    }
  };

  if (result.unassigned.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
          <AlertTriangle className="h-5 w-5 text-emerald-500" />
        </div>
        No conflicts \u2014 every flight has a gate.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {result.unassigned.map(({ flight, reason }) => (
        <motion.div
          key={flight.id}
          layout
          className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{flight.flightNumber}</div>
              <div className="text-xs text-muted-foreground">
                {flight.origin} \u2192 {flight.destination} \u00B7 {flight.aircraftType}-body
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => explain(flight.id)} disabled={busy === flight.id}>
              {busy === flight.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
              Explain
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{reason}</p>
          {reasons[flight.id] && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 rounded-lg border border-border/50 bg-background/60 p-2 text-xs leading-relaxed"
            >
              {reasons[flight.id]}
            </motion.p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
