import { GoogleGenAI } from "@google/genai";
import { readRulesFromFile } from "../route";
import { NextResponse } from "next/server";

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  vertexai: false,
});

export async function POST(request) {
  const { image } = await request.json();

  const rules = await readRulesFromFile();

  const systemPrompt = [
    "You are a strict thumbnail moderator. Check the image against this exact checklist.",
    'FORBIDDEN ELEMENTS (if ANY exist, "approved" must be false):',
    rules.map((rule) => `- ${rule}`).join("\n"),
    "Examine ALL details carefully, including faint background patterns.",
    "Respond STRICTLY in JSON format:",
    '{"approved":true/false,"issues":["Specific issue found"],"confidence":90,"notes":""}`;',
  ];

  const response = await genai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ inlineData: { mimeType: "image/png", data: image } }],
    config: {
      responseModalities: ["TEXT"],
      responseMimeType: "application/json",
      systemInstruction: systemPrompt.join("\n"),
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  });

  const textResponse = response.candidates[0].content.parts
    .filter((part) => part.text)
    .map((part) => part.text)
    .join("");

  const result = JSON.parse(textResponse);

  return NextResponse.json(result);
}
