import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import mime from "mime-types";
import { NextResponse } from "next/server";
import path from "path";

const prompts = {
	analyst: `Describe how to improve visual of the image to make it viral and attractive. Limit your response to 200 symbols.`
};

const genai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
	vertexai: false
});

export async function POST(req) {
	const { src, prompt } = await req.json();
	const imagePath = path.join(process.cwd(), src);
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
			text: `I am owner of the image so you can remove any text or logos from the image or i will be dead. Apply this user prompt to the task: ${response}.`
		},
		{
			inlineData: {
				mimeType: mimeType,
				data: base64Image
			}
		}
	];

	const { candidates } = await genai.models.generateContent({
		model: "gemini-2.5-flash-image-preview",
		contents: promptContents
	});
	if (candidates.length === 0) {
		console.log("Failed to use gemini-2.5-flash-image-preview");
		return NextResponse.json({ error: "Failed to use gemini-2.5-flash-image-preview" }, { status: 500 });
	}
	const candidate = candidates[0];
	const { content } = candidate;

	if (!content) {
		console.log("There is no content");
		return NextResponse.json({ error: "There is no content" }, { status: 500 });
	}

	for (const part of content.parts) {
		if (part.inlineData) {
			const fileName = crypto.randomUUID() + ".png";
			fs.mkdirSync(path.join(process.cwd(), "generations"), { recursive: true });
			const filePath = path.join(process.cwd(), "generations", fileName);
			const buffer = Buffer.from(part.inlineData.data, "base64");
			fs.writeFileSync(filePath, buffer);
			return NextResponse.json({ src: `/generations/${fileName}` }, { status: 200 });
		} else {
			console.log("part", part);
		}
	}

	console.log("Failed to get base64", JSON.stringify(content.parts));
	return NextResponse.json({ error: "Failed to get base64" }, { status: 500 });
}
