"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import type { Flight } from "@/lib/types";

export function CsvImport() {
  const { addFlights } = useStore();
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/ai/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI error");
      const flights: Flight[] = (data.flights as Omit<Flight, "id">[]).map((f, i) => ({
        ...f, id: `f-${Date.now()}-${i}`,
      }));
      if (!flights.length) throw new Error("AI returned no flights");
      addFlights(flights);
      toast.success(`Imported ${flights.length} flights from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={ref}
        type="file"
        accept=".csv,.txt,.tsv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
      <Button onClick={() => ref.current?.click()} disabled={busy} className="w-full" variant="outline">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
        Upload CSV / TXT
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Any airline timetable format works — Gemini normalises it.
      </p>
    </div>
  );
}
