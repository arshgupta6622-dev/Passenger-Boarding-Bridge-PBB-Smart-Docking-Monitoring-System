import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";

const FLIGHT_SCHEMA = {
  type: "object",
  properties: {
    flightNumber: { type: "string" },
    airline: { type: "string" },
    origin: { type: "string" },
    destination: { type: "string" },
    arrival: { type: "string", description: "ISO 8601 timestamp for today" },
    departure: { type: "string", description: "ISO 8601 timestamp for today" },
    aircraftType: { type: "string", enum: ["narrow", "wide", "regional"] },
    pax: { type: "number" },
  },
  required: ["flightNumber", "airline", "origin", "destination", "arrival", "departure", "aircraftType"],
};

const SYSTEM = `You parse natural-language flight descriptions into structured JSON for an airport gate scheduler.
- Always assume the date is today (the user's local date is provided in the prompt).
- Return ISO 8601 timestamps in local time (no timezone offset).
- If the aircraft type is ambiguous, infer from aircraft model: A320/B737/E190 = narrow, A330/B777/B787/A380 = wide, ATR/CRJ/Dash = regional.
- Airlines: IndiGo (6E), Air India (AI), Vistara (UK), SpiceJet (SG), Emirates (EK), Qatar Airways (QR), British Airways (BA), Lufthansa (LH).`;

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    const today = new Date();
    const dateHint = `Today's date is ${today.toISOString().slice(0, 10)}.`;
    const flight = await generateJson(
      `${dateHint}\n\nDescription: ${text}`,
      FLIGHT_SCHEMA,
      SYSTEM,
    );
    return NextResponse.json({ flight });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
