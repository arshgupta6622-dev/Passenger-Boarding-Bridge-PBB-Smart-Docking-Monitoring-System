import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import type { Assignment, Flight, Gate } from "@/lib/types";

const SYSTEM = `You explain to an airport operations manager why a specific flight could not be assigned to any gate.
- Be concise (2-4 sentences).
- Reference specific gates and time windows when relevant.
- Suggest one concrete action they could take.
- Use plain English, not jargon.`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      flight: Flight;
      assignments: Assignment[];
      gates: Gate[];
    };
    const prompt = `Flight: ${JSON.stringify(body.flight)}
Gates: ${JSON.stringify(body.gates)}
Current assignments: ${JSON.stringify(body.assignments)}

Why couldn't this flight be assigned? What should the operator do?`;
    const explanation = await generateText(prompt, SYSTEM);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
