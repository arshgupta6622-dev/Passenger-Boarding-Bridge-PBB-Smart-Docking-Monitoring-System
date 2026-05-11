"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssistantPanel } from "./ai/assistant-panel";
import { MetricsDashboard } from "./metrics/metrics-dashboard";
import { ConflictsPanel } from "./conflicts/conflicts-panel";
import { OptimizeDialog } from "./ai/optimize-dialog";
import { useStore } from "@/lib/store";

export function RightPanel() {
  const unassignedCount = useStore((s) => s.result?.unassigned.length ?? 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 p-3">
        <OptimizeDialog />
      </div>
      <Tabs defaultValue="assistant" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="conflicts" className="relative">
            Conflicts
            {unassignedCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white animate-pulse">
                {unassignedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="assistant" className="flex-1 overflow-hidden">
          <AssistantPanel />
        </TabsContent>
        <TabsContent value="metrics" className="flex-1 overflow-auto">
          <MetricsDashboard />
        </TabsContent>
        <TabsContent value="conflicts" className="flex-1 overflow-auto">
          <ConflictsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
