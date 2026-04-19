"use client";

import { useStore } from "@/lib/store";
import { MetricCard } from "./metric-card";
import { GateUtilisationChart } from "./gate-utilisation-chart";
import { Activity, Clock, Gauge, Plane, TrendingUp, AlertTriangle } from "lucide-react";

export function MetricsDashboard() {
  const { result, previousResult } = useStore();
  if (!result) return null;
  const m = result.metrics;

  const deltaUtil = previousResult
    ? Math.round((m.overallUtilisation - previousResult.metrics.overallUtilisation) * 100)
    : null;

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Gauge}
          label="Utilisation"
          value={`${Math.round(m.overallUtilisation * 100)}%`}
          delta={deltaUtil !== null && deltaUtil !== 0 ? { value: `${Math.abs(deltaUtil)}%`, positive: deltaUtil > 0 } : undefined}
          accent="from-indigo-500/20 to-purple-500/10"
        />
        <MetricCard icon={Plane} label="Assigned" value={`${m.assignedFlights}/${m.totalFlights}`} accent="from-emerald-500/20 to-teal-500/10" />
        <MetricCard icon={TrendingUp} label="Peak hour" value={`${String(m.peakHour.hour).padStart(2, "0")}:00`} accent="from-amber-500/20 to-orange-500/10" />
        <MetricCard icon={Clock} label="Avg turnaround" value={`${m.avgTurnaroundMinutes}m`} accent="from-sky-500/20 to-blue-500/10" />
        <MetricCard icon={Activity} label="Jet-bridge" value={`${Math.round(m.jetbridgeShare * 100)}%`} accent="from-fuchsia-500/20 to-pink-500/10" />
        <MetricCard icon={AlertTriangle} label="Unassigned" value={`${m.unassignedCount}`} accent={m.unassignedCount ? "from-rose-500/20 to-red-500/10" : "from-slate-500/20 to-slate-500/5"} />
      </div>
      <GateUtilisationChart />
    </div>
  );
}
