"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function FlightList() {
  const { flights, removeFlight } = useStore();
  const sorted = [...flights].sort(
    (a, b) => new Date(a.arrival).getTime() - new Date(b.arrival).getTime(),
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-1">
        <AnimatePresence initial={false}>
          {sorted.map((f) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-2 text-sm hover:bg-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{f.flightNumber}</span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {f.aircraftType}
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {f.origin} → {f.destination} · {hhmm(f.arrival)}–{hhmm(f.departure)}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => removeFlight(f.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
