import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";

const FLIGHTS_SCHEMA = {
  type: "object",
  properties: {
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flightNumber: { type: "string" },
          airline: { type: "string" },
          origin: { type: "string" },
          destination: { type: "string" },
          arrival: { type: "string" },
          departure: { type: "string" },
          aircraftType: { type: "string", enum: ["narrow", "wide", "regional"] },
          pax: { type: "number" },
        },
        required: ["flightNumber", "airline", "origin", "destination", "arrival", "departure", "aircraftType"],
      },
    },
  },
  required: ["flights"],
};

const SYSTEM = `You convert messy airline timetables (CSV, pasted text, tables) into a clean array of flights for an airport gate scheduler.
- Assume today's date for every timestamp.
- Output ISO 8601 timestamps in local time.
- arrival MUST be earlier than departure. When a row has two times with no labels, the smaller (earlier) one is arrival and the larger (later) one is departure.
- Typical column order is: flightNumber, airline, origin, destination, arrival, departure, aircraft, pax.
- Infer aircraft type from model or passenger count when the type is not explicit.
- If a row is ambiguous or missing required fields, skip it rather than guessing.`;

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    const today = new Date();
    const dateHint = `Today's date is ${today.toISOString().slice(0, 10)}.`;
    const data = await generateJson<{ flights: unknown[] }>(
      `${dateHint}\n\nTimetable:\n${text}`,
      FLIGHTS_SCHEMA,
      SYSTEM,
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
