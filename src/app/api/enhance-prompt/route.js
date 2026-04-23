import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mime from "mime-types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  vertexai: false,
});

const enhanceUserPrompt = async (prompt, image) => {
  const contents = [{ inlineData: { mimeType: image.mimeType, data: image.base64Image } }, { text: prompt }];
  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      responseModalities: ["TEXT"],
      systemInstruction: fs.readFileSync(path.join(__dirname, "../generate/gemini/enhancedPrompt.txt"), "utf8"),
    },
  });
  return response.text;
};

export async function POST(request) {
  const { prompt, image } = await request.json();
  const imagePath =
    process.env.NODE_ENV === "development" ? path.join(process.cwd(), "public", image) : path.join(process.cwd(), image);
  const base64Image = fs.readFileSync(imagePath, "base64");
  const mimeType = mime.lookup(imagePath);
  const enhancedPrompt = await enhanceUserPrompt(prompt, { base64Image, mimeType });
  return NextResponse.json({ result: enhancedPrompt });
}
