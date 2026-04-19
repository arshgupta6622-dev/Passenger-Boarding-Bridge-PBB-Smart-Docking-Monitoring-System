import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import type { Assignment, Flight, Gate, Metrics } from "@/lib/types";

const SYSTEM = `You are an assistant for an airport gate scheduler.
- The user can ask what-if questions, operational questions, or about specific flights/gates.
- You have read-only access to the current flights, gates, assignments, and metrics.
- Answer concisely (under 120 words).
- When asked "what if X changes", walk through the consequences step by step.
- Cite specific flight numbers and gate names when relevant.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message: string;
      flights: Flight[];
      gates: Gate[];
      assignments: Assignment[];
      metrics: Metrics;
    };
    const prompt = `Current schedule context:
Flights: ${JSON.stringify(body.flights)}
Gates: ${JSON.stringify(body.gates)}
Assignments: ${JSON.stringify(body.assignments)}
Metrics: ${JSON.stringify(body.metrics)}

User question: ${body.message}`;
    const reply = await generateText(prompt, SYSTEM);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
