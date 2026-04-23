import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import mime from "mime-types";
import { NextResponse } from "next/server";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import crypto from "crypto";
import Logger from "@/utilities/Logger";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const prompts = {
	enhancer: fs.readFileSync(path.join(__dirname, "enhancedPrompt.txt"), "utf8"),
	designer: fs.readFileSync(path.join(__dirname, "designerPrompt.txt"), "utf8"),
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
	const contents = [
		{ inlineData: { mimeType: image.mimeType, data: image.base64Image } },
		{ text: `${userPrompt}` },
		{ text: `please remove all text from the image` }
	];
	const response = await genai.models.generateContent({
		model: "gemini-2.5-flash-image",
		contents: contents,
		config: {
			responseModalities: ["IMAGE"],
			systemInstruction: `
Objective: Transform the current dull and warm-toned image into a bright, clean, and hyper-vibrant commercial aesthetic. Eliminate the yellow/green color cast on the skin and background, dramatically boost color saturation, and increase overall luminosity to achieve a playful, high-energy, and visually striking look.
Key Adjustments:
Lighting and Exposure:
Exposure Boost: Significantly increase overall exposure to brighten the entire image, aiming for a high-key look.
Shadow & Black Point Lift: Aggressively lift shadows and black points to remove all dark, muddy areas, especially on the skin and in any existing crevices. Ensure there are no true blacks, making the image feel airy and light.
Highlight & White Point Expansion: Push highlights and white points to pure white, ensuring the background (currently dull blue) becomes a vibrant, clean blue and any light elements on the subject (e.g., nails, whites of eyes) are crisp.
Color Correction (Crucial for this image):
White Balance Adjustment: Correct the severe yellow/green color cast. Shift the temperature towards cooler tones (more blue) and adjust the tint significantly towards magenta to neutralize the green. The skin should appear natural and healthy, not sallow.
Saturation & Vibrance Boost: Dramatically increase both saturation and vibrance across all colors. Make the rainbow rings pop with intense, distinct colors. The blue background should become a vivid, electric blue, matching the high-energy aesthetic.
Hue Purity: Ensure the blue of the background is a pure, clean blue. Verify that the colors in the rings are distinct and not bleeding into each other.
Clarity and Sharpness:
Clarity Boost: Add a moderate amount of clarity to enhance mid-tone contrast, making the details of the rings, skin, and face more defined without looking overly artificial.
Sharpening: Apply a noticeable level of sharpening to ensure crisp edges and emphasize fine details, particularly on the jewelry and facial features.`
		}
	});
	Logger.info("generateImage response", { response });
	const candidate = response.candidates[0];
	const { content } = candidate;
	if (!content) {
		Logger.error("generateImage response content is empty");
		return;
	}
	if (!content.parts) {
		Logger.error("generateImage response content parts is empty");
		return;
	}
	Logger.info("generateImage response content parts", { parts: content.parts });
	for (const part of content.parts) {
		if (part.inlineData) {
			const fileName = crypto.randomUUID() + ".png";
			const dirPath = process.env.NODE_ENV === "development" ? ["public", "generations"] : ["generations"];
			fs.mkdirSync(path.join(process.cwd(), ...dirPath), { recursive: true });
			const filePath = path.join(process.cwd(), ...dirPath, fileName);
			const buffer = Buffer.from(part.inlineData.data, "base64");
			fs.writeFileSync(filePath, await resizeToOriginalSize(buffer, image.base64Image));
			Logger.info("generateImage response part inlineData", { fileName });
			return fileName;
		}
	}
	Logger.error("generateImage response part inlineData is empty");
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
	// const analystPrompt = await retrySystem(() => describeInputImage({ base64Image, mimeType }));
	const analystPrompt = "";
	const enhancedPrompt = prompt.trim() === "" ? "" : await retrySystem(() => enhanceUserPrompt(prompt, { base64Image, mimeType }));
	const generatedImage = await retrySystem(() => generateImage(enhancedPrompt, analystPrompt, { base64Image, mimeType }));
	Logger.info("generateImage", { prompt, imagePath, analystPrompt, enhancedPrompt, generatedImage });
	return NextResponse.json({ src: `/generations/${generatedImage}` }, { status: 200 });
}
