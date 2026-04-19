"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssistantPanel } from "./ai/assistant-panel";
import { MetricsDashboard } from "./metrics/metrics-dashboard";
import { ConflictsPanel } from "./conflicts/conflicts-panel";
import { OptimizeDialog } from "./ai/optimize-dialog";

export function RightPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 p-3">
        <OptimizeDialog />
      </div>
      <Tabs defaultValue="assistant" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
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
