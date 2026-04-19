"use client";

import { useStore } from "@/lib/store";
import { TimeAxis } from "./time-axis";
import { FlightBlock } from "./flight-block";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@/lib/types";

const HOUR_WIDTH = 72;
const TOTAL_WIDTH = HOUR_WIDTH * 24;

export function GanttChart() {
  const { gates, flights, result } = useStore();
  const flightsById = new Map(flights.map((f) => [f.id, f]));
  const byGate = new Map<string, Assignment[]>();
  if (result) {
    for (const a of result.assignments) {
      if (!byGate.has(a.gateId)) byGate.set(a.gateId, []);
      byGate.get(a.gateId)!.push(a);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gate Timeline</h2>
        {result && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{result.assignments.length} assigned</Badge>
            {result.unassigned.length > 0 && (
              <Badge variant="destructive">{result.unassigned.length} unassigned</Badge>
            )}
            <Badge variant="outline">Peak {String(result.metrics.peakHour.hour).padStart(2, "0")}:00 · {result.metrics.peakHour.count} flights</Badge>
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

          <div className="ml-[120px]">
            <TimeAxis hourWidth={HOUR_WIDTH} />
            {gates.map((g) => (
              <div key={g.id} className="relative h-12 border-b border-border/30">
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
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
