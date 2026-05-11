"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { TimeAxis } from "./time-axis";
import { FlightBlock } from "./flight-block";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@/lib/types";
import { toast } from "sonner";

const HOUR_WIDTH = 72;
const TOTAL_WIDTH = HOUR_WIDTH * 24;

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function GanttChart() {
  const { gates, flights, result, reassignFlight } = useStore();
  const [dropTargetGate, setDropTargetGate] = useState<string | null>(null);
  const [now, setNow] = useState(() => nowMinutes());

  useEffect(() => {
    setNow(nowMinutes());
    const interval = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const flightsById = new Map(flights.map((f) => [f.id, f]));
  const byGate = new Map<string, Assignment[]>();
  if (result) {
    for (const a of result.assignments) {
      if (!byGate.has(a.gateId)) byGate.set(a.gateId, []);
      byGate.get(a.gateId)!.push(a);
    }
  }

  const handleDragOver = (gateId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("application/pbb-flight-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dropTargetGate !== gateId) setDropTargetGate(gateId);
    }
  };

  const handleDragLeave = () => setDropTargetGate(null);

  const handleDrop = (gateId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropTargetGate(null);
    const flightId = e.dataTransfer.getData("application/pbb-flight-id");
    if (!flightId) return;
    const res = reassignFlight(flightId, gateId);
    const gate = gates.find((g) => g.id === gateId);
    const flight = flights.find((f) => f.id === flightId);
    if (res.ok) {
      toast.success(`${flight?.flightNumber ?? flightId} → ${gate?.name ?? gateId}`);
    } else {
      toast.error(`Can't reassign ${flight?.flightNumber ?? flightId}`, {
        description: res.reason,
      });
    }
  };

  const nowLeft = (now / 60) * HOUR_WIDTH;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">PBB Docking Timeline</h2>
        {result && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{result.assignments.length} assigned</Badge>
            {result.unassigned.length > 0 && (
              <Badge variant="destructive">{result.unassigned.length} unassigned</Badge>
            )}
            <Badge variant="outline">Peak {String(result.metrics.peakHour.hour).padStart(2, "0")}:00 · {result.metrics.peakHour.count} flights</Badge>
            <Badge variant="outline" className="border-rose-500/40 text-rose-500">
              ● Now {String(Math.floor(now / 60)).padStart(2, "0")}:{String(now % 60).padStart(2, "0")}
            </Badge>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div style={{ width: TOTAL_WIDTH + 120 }} className="relative">
          <div className="sticky left-0 z-20 w-[120px] flex-shrink-0">
            <div className="h-8 border-b border-r border-border/50 bg-background/80 backdrop-blur" />
            {gates.map((g) => (
              <div key={g.id} className="flex h-12 items-center border-b border-r border-border/30 bg-background/60 px-3 backdrop-blur">
                <div>
                  <div className="text-xs font-semibold">{g.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {g.hasJetBridge ? "Jet-bridge" : "Remote"} · {g.compatibleTypes.includes("wide") ? "Wide+" : "Narrow"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="ml-[120px] relative">
            <TimeAxis hourWidth={HOUR_WIDTH} />
            {gates.map((g) => {
              const isTarget = dropTargetGate === g.id;
              return (
                <div
                  key={g.id}
                  onDragOver={handleDragOver(g.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop(g.id)}
                  className={`relative h-12 border-b border-border/30 transition-colors ${
                    isTarget ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40" : ""
                  }`}
                >
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} className="flex-shrink-0 border-r border-border/20" style={{ width: HOUR_WIDTH }} />
                    ))}
                  </div>
                  {(byGate.get(g.id) ?? []).map((a) => {
                    const f = flightsById.get(a.flightId);
                    if (!f) return null;
                    return <FlightBlock key={a.flightId} assignment={a} flight={f} hourWidth={HOUR_WIDTH} />;
                  })}
                </div>
              );
            })}

            {/* Live "now" indicator */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10"
              style={{ left: nowLeft }}
            >
              <div className="absolute top-0 bottom-0 w-px bg-rose-500/80" />
              <div className="absolute -left-[5px] top-7 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse" />
              <div className="absolute -left-7 top-1 rounded-md bg-rose-500/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                NOW
              </div>
            </div>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
