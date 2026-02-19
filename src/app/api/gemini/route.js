import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import sharp from "sharp";

const genai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    vertexai: false,
});

// Reusable headers for CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Be specific for security
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function POST(request) {
    try {
        const { image, text } = await request.json();
        const imageBuffer = Buffer.from(image, "base64");
        const imageMeta = await sharp(imageBuffer).metadata();
        const mimeType = `image/${imageMeta.format}`;
        const originalSize = [imageMeta.width, imageMeta.height];

        const prompt = [
            { text: text },
            { inlineData: { mimeType: mimeType, data: image } },
        ];

        const geminiResponse = await genai.models
            .generateContent({
                model: "gemini-3-pro-image-preview",
                contents: prompt,
                config: {
                    responseModalities: ["IMAGE"],
                    candidateCount: 1,
                },
            })
            .then((response) => ({ parts: response.candidates?.[0]?.content?.parts || [] }))
            .catch((error) => ({ error: error.message }));

        if ("error" in geminiResponse) {
            return NextResponse.json({ error: geminiResponse.error }, {
                status: 500,
                headers: corsHeaders
            });
        }

        for (const part of geminiResponse.parts) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const outputBuffer = Buffer.from(imageData, "base64");
                const resizedImageBuffer = await sharp(outputBuffer)
                    .resize({ width: originalSize[0], height: originalSize[1], fit: "contain" })
                    .toBuffer();

                return NextResponse.json(
                    { image: resizedImageBuffer.toString("base64") },
                    { status: 200, headers: corsHeaders }
                );
            }
        }

        return NextResponse.json({ error: "Failed to generate image" }, {
            status: 500,
            headers: corsHeaders
        });

    } catch (err) {
        return NextResponse.json({ error: err.message || "Internal Server Error" }, {
            status: 500,
            headers: corsHeaders
        });
    }
}