"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlightForm } from "./flight-form";
import { FlightList } from "./flight-list";
import { PasteImport } from "./paste-import";
import { CsvImport } from "./csv-import";
import { Separator } from "@/components/ui/separator";

export function InputPanel() {
  return (
    <div className="flex h-full flex-col p-4">
      <Tabs defaultValue="manual" className="flex-shrink-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="paste">AI Paste</TabsTrigger>
          <TabsTrigger value="csv">CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-3">
          <FlightForm />
        </TabsContent>
        <TabsContent value="paste" className="mt-3">
          <PasteImport />
        </TabsContent>
        <TabsContent value="csv" className="mt-3">
          <CsvImport />
        </TabsContent>
      </Tabs>
      <Separator className="my-4" />
      <div className="min-h-0 flex-1">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Flights
        </div>
        <FlightList />
      </div>
    </div>
  );
}
