"use client";

import { motion } from "framer-motion";
import type { Assignment, Flight } from "@/lib/types";
import { airlineColor } from "@/lib/colors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  assignment: Assignment;
  flight: Flight;
  hourWidth: number;
}

const minutesFromMidnight = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function FlightBlock({ assignment, flight, hourWidth }: Props) {
  const startMin = minutesFromMidnight(assignment.start);
  const endMin = minutesFromMidnight(assignment.end);
  const left = (startMin / 60) * hourWidth;
  const width = Math.max(((endMin - startMin) / 60) * hourWidth, 40);
  const color = airlineColor(flight.airline);

  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger
          render={
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="absolute top-1 flex h-10 cursor-pointer items-center overflow-hidden rounded-lg px-2 text-[11px] font-medium text-white shadow-md ring-1 ring-white/10 hover:brightness-110"
              style={{ left, width, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <span className="truncate">{flight.flightNumber}</span>
              <span className="ml-1 truncate text-white/75">· {flight.origin}</span>
            </motion.div>
          }
        />
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold">{flight.flightNumber} · {flight.airline}</div>
            <div>{flight.origin} → {flight.destination}</div>
            <div>{hhmm(assignment.start)} – {hhmm(assignment.end)}</div>
            <div>Aircraft: {flight.aircraftType}-body{flight.pax ? ` · ${flight.pax} pax` : ""}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
