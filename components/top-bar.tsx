"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { LogOut, Moon, Plane, Play, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function TopBar() {
  const router = useRouter();
  const { runScheduler, resetToSeed, result } = useStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
  const utilisation = result ? Math.round(result.metrics.overallUtilisation * 100) : 0;
  const assigned = result?.metrics.assignedFlights ?? 0;
  const total = result?.metrics.totalFlights ?? 0;

  return (
    <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-lg">
          <Plane className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-brand-gradient text-lg font-bold leading-tight">PBB Smart Docking & Monitoring</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">Passenger Boarding Bridge · real-time monitoring & turnaround optimisation</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <motion.div key={utilisation} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Utilisation</div>
          <div className="text-xl font-bold tabular-nums">{utilisation}%</div>
        </motion.div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Assigned</div>
          <div className="text-xl font-bold tabular-nums">{assigned}/{total}</div>
        </div>

        <Button onClick={runScheduler} className="brand-gradient text-white shadow-lg hover:opacity-90">
          <Play className="mr-2 h-4 w-4" /> Run Scheduler
        </Button>
        <Button onClick={resetToSeed} variant="outline" size="icon" title="Reset to sample data">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} variant="ghost" size="icon" suppressHydrationWarning>
          {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Sun className="h-4 w-4 opacity-0" />}
        </Button>
        <Button onClick={logout} variant="ghost" size="icon" title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
