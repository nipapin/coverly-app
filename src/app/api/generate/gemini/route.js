import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import mime from "mime-types";
import { NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";

const prompts = {
	analyst: `Describe how to improve visual of the image to make it viral and attractive. Limit your response to 200 symbols.`
};

const genai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
	vertexai: false
});

export async function POST(req) {
	const { src, prompt } = await req.json();
	const imagePath = process.env.NODE_ENV === "development" ? path.join(process.cwd(), "public", src) : path.join(process.cwd(), src);
	const base64Image = fs.readFileSync(imagePath, "base64");
	const mimeType = mime.lookup(imagePath);
	const contents = [
		{
			inlineData: {
				mimeType: mimeType,
				data: base64Image
			}
		},
		{ text: prompts.analyst }
	];

	const response = await genai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: contents
	});
	const text = response.text;

	if (!text) {
		console.log("Cant generate text");
		return NextResponse.json({ error: "Cant generate text" }, { status: 500 });
	}

	const promptContents = [
		{
			text: `${
				prompt
					? `This is important user prompt: ${prompt}. `
					: "Bright and saturated color correction with an appetizing shade. Make the colors more vivid and juicy, so that they look attractive and natural."
			} Increase the contrast and slightly enhance the shadows to give the image depth. The overall atmosphere should be very attractive and 'tasty'.`
		},
		{
			text: `Please generate new image similar to the original one but without any text or logos. Save faces as they are. Apply this user prompt to the task: ${response}.`
		},
		{ text: "Does not provide any text description. Only image." },
		{
			inlineData: {
				mimeType: mimeType,
				data: base64Image
			}
		}
	];

	const generateContentResponse = await genai.models.generateContent({
		model: "gemini-2.5-flash-image-preview",
		contents: promptContents,
		safetySettings: {
			threshold: "BLOCK_NONE"
		}
	});

	if (generateContentResponse?.candidates?.length === 0) {
		console.log("Failed to use gemini-2.5-flash-image-preview");
		return NextResponse.json({ error: "Failed to use gemini-2.5-flash-image-preview" }, { status: 500 });
	}
	const candidate = generateContentResponse.candidates[0];
	const { content } = candidate;

	if (!content) {
		console.log("There is no content");
		return NextResponse.json({ error: "There is no content" }, { status: 500 });
	}

	for (const part of content.parts) {
		if (part.inlineData) {
			const fileName = crypto.randomUUID() + ".png";
			const dirPath = process.env.NODE_ENV === "development" ? ["public", "generations"] : ["generations"];
			fs.mkdirSync(path.join(process.cwd(), ...dirPath), { recursive: true });
			const filePath = path.join(process.cwd(), ...dirPath, fileName);
			const buffer = Buffer.from(part.inlineData.data, "base64");
			fs.writeFileSync(filePath, await resizeToOriginalSize(buffer, base64Image));
			return NextResponse.json({ src: `/generations/${fileName}` }, { status: 200 });
		} else {
			console.log("part", part);
		}
	}

	console.log("Failed to get base64", JSON.stringify(content.parts));
	return NextResponse.json({ error: "Failed to get base64" }, { status: 500 });
}

async function resizeToOriginalSize(buffer, base64Image) {
	const originalImage = sharp(Buffer.from(base64Image, "base64"));
	const originalSize = await originalImage.metadata();
	const resizedImage = sharp(buffer).resize(originalSize.width, originalSize.height);
	return resizedImage.toBuffer();
}
