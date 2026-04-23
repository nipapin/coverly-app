import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getVideoTranslateS3 } from "@/lib/videoTranslate";
import { getJobById, setJobError, setUploadComplete } from "@/lib/videoTranslationRepo";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

function safeBasename(name) {
	const base = (name || "video").split(/[/\\]/).pop() || "video";
	return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(req) {
	let translationId;
	try {
		const { client, bucket } = getVideoTranslateS3();
		const formData = await req.formData();
		const tid = formData.get("translationId");
		translationId = typeof tid === "string" ? tid : null;
		if (!translationId) {
			return Response.json(
				{ error: "Request is incomplete. Reload the page and try again.", code: "VALIDATION" },
				{ status: 400 },
			);
		}

		const job = await getJobById(translationId);
		if (!job) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}

		const file = formData.get("file");
		if (!file || typeof file === "string") {
			return Response.json({ error: "No file uploaded", code: "VALIDATION" }, { status: 400 });
		}
		const buffer = Buffer.from(await file.arrayBuffer());
		const name = safeBasename(file.name);
		const key = `video-translate/uploads/${Date.now()}-${randomUUID()}-${name}`;
		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: buffer,
				ContentType: file.type || "application/octet-stream",
			}),
		);
		await setUploadComplete(translationId, {
			videoS3Key: key,
			originalFilename: file.name || name,
			status: "uploaded",
		});
		return Response.json({ key, jobId: job.jobId });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err, { phase: "upload" });
		if (translationId) {
			await setJobError(translationId, { code, message }).catch(() => {});
		}
		return Response.json({ error: message, code }, { status: 500 });
	}
}
