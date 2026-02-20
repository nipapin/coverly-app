import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize the client
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    vertexai: false,
});

// Reusable headers for CORS
const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Remember to restrict this in production!
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function POST(req) {
    try {
        const { texts, languages } = await req.json();

        // 1. Input Validation
        if (!Array.isArray(texts) || texts.length === 0) {
            return NextResponse.json(
                { error: "Input 'texts' must be a non-empty array of strings" },
                {
                    status: 400,
                    headers: corsHeaders,
                },
            );
        }

        if (!Array.isArray(languages) || languages.length === 0) {
            return NextResponse.json(
                { error: "Input 'languages' must be a non-empty array of strings" },
                {
                    status: 400,
                    headers: corsHeaders,
                },
            );
        }

        // 2. Dynamic Prompt Construction
        const prompt = `
        You are an expert localization assistant. 
        Take the following JSON input containing a list of strings ('texts') and target language codes ('languages'):

        ${JSON.stringify({ texts, languages }, null, 2)}

        Translate each string into all the requested languages. 
        Return strictly a JSON object matching this exact structure:

        {
          "texts": [
            {
              "source": "<original string>",
              "<lang_code_1>": "<translation>",
              "<lang_code_2>": "<translation>"
            }
          ]
        }
        `;

        // 3. Call Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // or gemini-2.5-flash for faster/cheaper responses
            contents: [{ text: prompt }],
            config: {
                // Force JSON output
                responseMimeType: "application/json",
                temperature: 0.1, // Low temperature for deterministic translations
            },
        });

        // 4. Parse and Return the Response
        // Since we enforced responseMimeType, response.text is guaranteed to be a JSON string
        const resultJson = JSON.parse(response.text);

        return NextResponse.json(resultJson.texts, {
            status: 200,
            headers: corsHeaders,
        });
    } catch (error) {
        console.error("Translation API Error:", error);

        return NextResponse.json(
            { error: "An error occurred while generating translations." },
            {
                status: 500,
                headers: corsHeaders,
            },
        );
    }
}
