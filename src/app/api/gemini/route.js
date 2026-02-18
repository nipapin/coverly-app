import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import sharp from "sharp";

const genai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    vertexai: false,
});

export async function POST(request) {
    const formData = await request.formData();
    const image = formData.get("image");
    const text = formData.get("text");
    const imageBuffer = Buffer.from(image, "base64");
    const imageMeta = await sharp(imageBuffer).metadata();
    const mimeType = `image/${imageMeta.format}`;
    const originalSize = [imageMeta.width, imageMeta.height];

    const prompt = [
        { text: text },
        {
            inlineData: {
                mimeType: mimeType,
                data: image,
            },
        },
    ];

    const response = await genai.models
        .generateContent({
            model: "gemini-3-pro-image-preview",
            contents: prompt,
            config: {
                responseModalities: ["IMAGE"],
                candidateCount: 1,
            },
        })
        .then((response) => {
            return { parts: response.candidates?.[0]?.content?.parts || [] };
        })
        .catch((error) => {
            return { error: error.message };
        });

    if ("error" in response) {
        return NextResponse.json({ error: response.error }, { status: 500 });
    }

    for (const part of response.parts) {
        if (part.inlineData) {
            const imageData = part.inlineData.data;
            const imageBuffer = Buffer.from(imageData, "base64");
            await sharp(imageBuffer).resize(originalSize[0], originalSize[1]).toBuffer();
            return NextResponse.json({ image: imageBuffer.toString("base64") }, { status: 200 });
        }
    }
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
}
