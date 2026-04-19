"use client";

import { useStore } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

export function GateUtilisationChart() {
  const { gates, result } = useStore();
  if (!result) return null;
  const data = gates.map((g) => ({
    name: g.name,
    utilisation: Math.round((result.metrics.perGateUtilisation[g.id] ?? 0) * 100),
    jetBridge: g.hasJetBridge,
  }));

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Gate utilisation
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: "hsl(var(--background))" }} />
          <Bar dataKey="utilisation" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.jetBridge ? "#6366f1" : "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
