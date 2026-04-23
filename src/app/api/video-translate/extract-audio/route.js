import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	downloadS3ObjectToFile,
	extractAudioMp3,
	getVideoTranslateS3,
	uploadFileToS3,
} from "@/lib/videoTranslate";
import { getJobById, setAudioExtracted, setJobError } from "@/lib/videoTranslationRepo";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req) {
	let translationId;
	let workDir;
	try {
		const body = await req.json();
		translationId = body?.translationId;
		if (!translationId || typeof translationId !== "string") {
			return Response.json(
				{ error: "Request is incomplete. Reload the page and try again.", code: "VALIDATION" },
				{ status: 400 },
			);
		}

		const row = await getJobById(translationId);
		if (!row) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}
		if (row.status === "audio_ready" && row.extractedAudioS3Key) {
			return Response.json({ ok: true, jobId: row.jobId, skipped: true });
		}
		if (!row.videoS3Key) {
			return Response.json(
				{ error: "No video on file. Upload a video first.", code: "VALIDATION" },
				{ status: 400 },
			);
		}

		const key = row.videoS3Key;
		const { jobId } = row;
		const { client, bucket } = getVideoTranslateS3();
		workDir = await mkdtemp(join(tmpdir(), "video-translate-extract-"));
		const ext = key.includes(".") ? key.slice(key.lastIndexOf(".")) : ".mp4";
		const videoPath = join(workDir, `input${ext}`);
		const audioPath = join(workDir, "extracted.mp3");

		await downloadS3ObjectToFile(client, bucket, key, videoPath);
		await extractAudioMp3(videoPath, audioPath);

		const audioBuffer = await readFile(audioPath);
		const outKey = `video-translate/extracted/${jobId}/audio.mp3`;
		await uploadFileToS3(client, bucket, outKey, audioBuffer, "audio/mpeg");
		await setAudioExtracted(translationId, { extractedAudioS3Key: outKey, status: "audio_ready" });

		return Response.json({ ok: true, jobId });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err, { phase: "extract" });
		if (translationId) {
			await setJobError(translationId, { code, message }).catch(() => {});
		}
		return Response.json({ error: message, code }, { status: 500 });
	} finally {
		if (workDir) {
			await rm(workDir, { recursive: true, force: true }).catch(() => {});
		}
	}
}
