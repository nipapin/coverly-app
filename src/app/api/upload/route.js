import { randomUUID } from "node:crypto";
import { getVideoTranslateS3, uploadFileToS3 } from "@/lib/videoTranslate";

function safeBasename(name) {
	const base = (typeof name === "string" ? name : "upload").split(/[/\\]/).pop() || "upload";
	return base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200);
}

export async function POST(req) {
	try {
		const formData = await req.formData();
		const file = formData.get("file");

		if (!file || typeof file === "string") {
			return Response.json({ error: "No file uploaded" }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const name = safeBasename(file.name);
		const key = `app/uploads/${Date.now()}-${randomUUID()}-${name}`;
		const { client, bucket } = getVideoTranslateS3();
		await uploadFileToS3(client, bucket, key, buffer, file.type || "application/octet-stream");

		const url = `/api/media?key=${encodeURIComponent(key)}`;
		return Response.json({ url, key }, { status: 200 });
	} catch (err) {
		console.error(err);
		const message = err instanceof Error ? err.message : "Upload failed";
		return Response.json({ error: message }, { status: 500 });
	}
}
