import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import mime from "mime-types";
import { NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";

const prompts = {
	enhancer: fs.readFileSync(path.join(process.cwd(), "src/app/api/generate/gemini/enhancedPrompt.txt"), "utf8"),
	designer: fs.readFileSync(path.join(process.cwd(), "src/app/api/generate/gemini/designerPrompt.txt"), "utf8")
};

const genai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
	vertexai: false
});

const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

const describeInputImage = async (image) => {
	const contents = [
		{
			inlineData: {
				mimeType: image.mimeType,
				data: image.base64Image
			}
		}
	];
	const response = await genai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: contents,
		config: {
			responseModalities: ["TEXT"],
			systemInstruction: prompts.designer
		}
	});
	return response.text;
};
const enhanceUserPrompt = async (prompt, image) => {
	const contents = [{ inlineData: { mimeType: image.mimeType, data: image.base64Image } }, { text: prompt }];
	const response = await genai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: contents,
		config: {
			responseModalities: ["TEXT"],
			systemInstruction: prompts.enhancer
		}
	});
	return response.text;
};

const generateImage = async (userPrompt, systemPrompt, image) => {
	const contents = [{ text: `please remove all text from the image, ${userPrompt}` }, { inlineData: { mimeType: image.mimeType, data: image.base64Image } }];
	const response = await genai.models.generateContent({
		model: "gemini-2.5-flash-image",
		contents: contents,
		config: {
			responseModalities: ["IMAGE"],
			systemInstruction: systemPrompt
		}
	});
	const candidate = response.candidates[0];
	const { content } = candidate;
	if (!content) {
		return;
	}
	for (const part of content.parts) {
		if (part.inlineData) {
			const fileName = crypto.randomUUID() + ".png";
			const dirPath = process.env.NODE_ENV === "development" ? ["public", "generations"] : ["generations"];
			fs.mkdirSync(path.join(process.cwd(), ...dirPath), { recursive: true });
			const filePath = path.join(process.cwd(), ...dirPath, fileName);
			const buffer = Buffer.from(part.inlineData.data, "base64");
			fs.writeFileSync(filePath, await resizeToOriginalSize(buffer, image.base64Image));
			return fileName;
		}
	}
	return;
};

const retrySystem = async (action) => {
	let retries = 3;
	while (retries > 0) {
		const result = await action();
		if (result) {
			return result;
		}
		retries--;
		await sleep(1000);
	}
	return;
};

const resizeToOriginalSize = async (buffer, base64Image) => {
	const { width, height } = await sharp(Buffer.from(base64Image, "base64")).metadata();
	return await sharp(buffer).resize(width, height).toBuffer();
};

export async function POST(req) {
	const { src, prompt } = await req.json();
	const imagePath = process.env.NODE_ENV === "development" ? path.join(process.cwd(), "public", src) : path.join(process.cwd(), src);
	const base64Image = fs.readFileSync(imagePath, "base64");
	const mimeType = mime.lookup(imagePath);

	const analystPrompt = await retrySystem(() => describeInputImage({ base64Image, mimeType }));
	const enhancedPrompt = prompt.trim() === "" ? "" : await retrySystem(() => enhanceUserPrompt(prompt, { base64Image, mimeType }));
	const generatedImage = await retrySystem(() => generateImage(enhancedPrompt, analystPrompt, { base64Image, mimeType }));
	return NextResponse.json({ src: `/generations/${generatedImage}` }, { status: 200 });
}
