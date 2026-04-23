import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_ID = "gemini-flash-latest";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env.local");
  return new GoogleGenerativeAI(key);
}

export async function generateJson<T>(
  prompt: string,
  schema: object,
  systemInstruction?: string,
): Promise<T> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema as never,
      temperature: 0.2,
    },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction,
    generationConfig: { temperature: 0.3 },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
