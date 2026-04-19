import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import type { Assignment, Flight, Gate } from "@/lib/types";

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    swaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flightId: { type: "string" },
          fromGateId: { type: "string" },
          toGateId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["flightId", "fromGateId", "toGateId", "reason"],
      },
    },
  },
  required: ["summary", "swaps"],
};

const SYSTEM = `You optimise airport gate assignments.
- Suggest swaps that increase gate utilisation, reduce wasted jet-bridge capacity, or balance load across terminals.
- Respect aircraft-gate compatibility (wide-body only on wide-capable gates).
- Respect the 15-minute turnaround buffer between flights on the same gate.
- Each swap must reference real flightId/fromGateId/toGateId from the input.
- Limit to the 3 most impactful swaps.
- Write the reason in one sentence, plain English.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      flights: Flight[];
      gates: Gate[];
      assignments: Assignment[];
    };
    const prompt = `Flights: ${JSON.stringify(body.flights)}
Gates: ${JSON.stringify(body.gates)}
Current assignments: ${JSON.stringify(body.assignments)}

Propose up to 3 swaps that improve the schedule. Return JSON matching the provided schema.`;
    const data = await generateJson(prompt, SCHEMA, SYSTEM);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
