"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/top-bar";
import { InputPanel } from "@/components/input-panel/input-panel";
import { GanttChart } from "@/components/gantt/gantt-chart";
import { RightPanel } from "@/components/right-panel";

export default function Page() {
  const { hydrate, hydrated } = useStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <TopBar />
      <main className="grid h-[calc(100vh-4rem)] grid-cols-[320px_1fr_380px] gap-4 p-4">
        <aside className="glass rounded-2xl overflow-hidden">
          <InputPanel />
        </aside>
        <section className="glass rounded-2xl overflow-hidden">
          <GanttChart />
        </section>
        <aside className="glass rounded-2xl overflow-hidden">
          <RightPanel />
        </aside>
      </main>
    </div>
  );
}
