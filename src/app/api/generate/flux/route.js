import fs from "fs";
import { lookup as lookupMimeType } from "mime-types";
import { NextResponse } from "next/server";
import { createPrompt } from "./prompt";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request) {
	let url = "";
	let computeId = undefined;

	const loadImage = (filename) => {
		console.log("🖼️ Loading image: " + filename);
		const image = fs.readFileSync(filename);
		const form = new FormData();
		const mimeType = lookupMimeType(filename) || "application/octet-stream";
		form.append("image", new Blob([image], { type: mimeType }), filename);
		form.append("type", "input");
		form.append("overwrite", "true");

		return fetch(`${url}/upload/image`, { method: "POST", body: form });
	};

	const sendPrompt = (positivePrompt, filename) => {
		const prompt = createPrompt({ positivePrompt, filename });
		return fetch(`${url}/prompt`, {
			method: "POST",
			body: JSON.stringify({ prompt })
		}).then((res) => res.json());
	};

	const waitUntilDone = (prompt_id) => {
		return new Promise((resolve, reject) => {
			(async () => {
				while (true) {
					const history = await fetch(`${url}/history`).then((res) => res.json());
					if (history[prompt_id]) {
						resolve(history[prompt_id]);
						break;
					}
					await sleep(500);
				}
			})();
		});
	};

	const waitForComfyReady = async (maxWaitMs = 30000) => {
		const start = Date.now();
		while (Date.now() - start < maxWaitMs) {
			try {
				const res = await fetch(`${url}/system_stats`);
				console.log("🔗 System stats: " + res);
				if (res.ok) return;
			} catch (_) {
				// ignore and retry
			}
			await sleep(1000);
		}
		throw new Error("ComfyUI server did not become ready in time");
	};

	const getEnhancedImage = async (promptResult) => {
		const outputFile = promptResult.outputs[136].images[0];
		const output = await fetch(`${url}/view?filename=${outputFile.filename}&type=${outputFile.type}`).then((res) => res.arrayBuffer());
		fs.writeFileSync(outputFile.filename, Buffer.from(output));
		return outputFile.filename;
	};

	try {
		const { prompt, image } = await request.json();
		const imageType = image.split(";")[0].split("/")[1];
		const imageBuffer = image.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(imageBuffer, "base64");
		const fileName = crypto.randomUUID() + "." + imageType;

		fs.writeFileSync(`./${fileName}`, buffer);

		const { compute_id, ip, uptime } = await fetch("http://localhost:3030/create", {
			method: "POST",
			body: JSON.stringify({}),
			headers: { "Content-Type": "application/json" }
		}).then((res) => res.json());

		computeId = compute_id;
		url = `http://${ip}:8188`;
		console.log("🔗 Server URL: " + url);
		console.log("🖥️ Computed ID: " + compute_id);
		console.log("⌚ Uptime: " + uptime);
		console.log("💬 Prompt: " + prompt);
		console.log("🖼️ Image: " + fileName);
		const comfyuiStart = Date.now();
		await waitForComfyReady(300000);
		console.log("🔗 ComfyUI is ready", uptime + (Date.now() - comfyuiStart));
		await loadImage(fileName);

		const { prompt_id } = await sendPrompt(prompt, fileName);
		const promptResult = await waitUntilDone(prompt_id);
		const enhancedImageName = await getEnhancedImage(promptResult);
		const enhancedImage = fs.readFileSync(enhancedImageName);
		const base64 = Buffer.from(enhancedImage).toString("base64");

		fs.unlinkSync(fileName);
		fs.unlinkSync(enhancedImageName);

		return NextResponse.json({ base64, mimeType: `image/${imageType}` }, { status: 200 });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
	} finally {
		if (computeId) {
			try {
				await fetch("http://localhost:3030/delete", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ compute_id: computeId })
				});
			} catch (_) {
				// ignore
			}
		}
	}
}
