"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  accent?: string;
}

export function MetricCard({ icon: Icon, label, value, delta, accent = "from-indigo-500/20 to-purple-500/10" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br ${accent} p-3`}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {delta && (
          <span className={`text-xs font-medium ${delta.positive ? "text-emerald-500" : "text-rose-500"}`}>
            {delta.positive ? "\u25B2" : "\u25BC"} {delta.value}
          </span>
        )}
      </div>
    </motion.div>
  );
}
