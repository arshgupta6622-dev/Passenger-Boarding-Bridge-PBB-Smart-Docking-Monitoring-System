"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Swap } from "@/lib/types";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function OptimizeDialog() {
  const { flights, gates, result, applySwaps } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [swaps, setSwaps] = useState<Swap[]>([]);

  const run = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flights, gates, assignments: result.assignments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary);
      setSwaps(data.swaps ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    applySwaps(swaps);
    setOpen(false);
    setSwaps([]);
    setSummary("");
    toast.success(`Applied ${swaps.length} swap${swaps.length === 1 ? "" : "s"}`);
  };

  const gateName = (id: string) => gates.find((g) => g.id === id)?.name ?? id;
  const flightNumber = (id: string) => flights.find((f) => f.id === id)?.flightNumber ?? id;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) run();
        else {
          setSwaps([]);
          setSummary("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="w-full">
            <Sparkles className="mr-2 h-4 w-4" /> AI Optimize
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-gradient">AI Schedule Optimisation</DialogTitle>
        </DialogHeader>
        {busy && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Gemini is analysing your schedule\u2026
          </div>
        )}
        {!busy && summary && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{summary}</p>
            <div className="space-y-2">
              {swaps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-border/50 bg-card/40 p-3 text-sm"
                >
                  <div className="font-medium">
                    {flightNumber(s.flightId)}: {gateName(s.fromGateId)} \u2192 {gateName(s.toGateId)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.reason}</div>
                </motion.div>
              ))}
            </div>
            {swaps.length > 0 && (
              <Button onClick={apply} className="w-full brand-gradient text-white">
                <Check className="mr-2 h-4 w-4" /> Apply all {swaps.length} swap{swaps.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
