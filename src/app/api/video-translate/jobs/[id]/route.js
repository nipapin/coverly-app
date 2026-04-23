import { deleteJobById, getJobById, restoreJobAfterError } from "@/lib/videoTranslationRepo";
import { collectVideoTranslateS3Keys, deleteS3Objects, getVideoTranslateS3, signGetUrl } from "@/lib/videoTranslate";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

const URL_TTL = 60 * 60 * 24 * 7; // 7d for sharing

async function attachSignedMedia(job) {
	if (!job) return null;
	const { client, bucket } = getVideoTranslateS3();
	/** @type {Record<string, string>} */
	const audioUrls = {};
	/** @type {Record<string, string>} */
	const muxedVideoUrls = {};
	let videoUrl = null;
	if (job.videoS3Key) {
		videoUrl = await signGetUrl(client, bucket, job.videoS3Key, URL_TTL);
	}
	const keys = job.audioS3Keys;
	if (keys && typeof keys === "object") {
		for (const [lang, k] of Object.entries(keys)) {
			if (typeof k === "string" && k) {
				audioUrls[lang] = await signGetUrl(client, bucket, k, URL_TTL);
			}
		}
	}
	const muxKeys = job.muxedVideoS3Keys;
	if (muxKeys && typeof muxKeys === "object") {
		for (const [lang, k] of Object.entries(muxKeys)) {
			if (typeof k === "string" && k) {
				muxedVideoUrls[lang] = await signGetUrl(client, bucket, k, URL_TTL);
			}
		}
	}
	return { ...job, videoUrl, audioUrls, muxedVideoUrls };
}

export async function GET(_req, { params }) {
	const id = (await params).id;
	if (!id || typeof id !== "string") {
		return Response.json({ error: "Bad request" }, { status: 400 });
	}
	try {
		const row = await getJobById(id);
		if (!row) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}
		const withUrls = await attachSignedMedia({ ...row });
		if (withUrls) {
			delete withUrls.videoS3Key;
			delete withUrls.extractedAudioS3Key;
			delete withUrls.audioS3Keys;
			delete withUrls.muxedVideoS3Keys;
			delete withUrls.transcriptSegments;
		}
		return Response.json({ job: withUrls });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err);
		return Response.json({ error: message, code }, { status: 500 });
	}
}

/** Remove job row and best-effort delete all referenced S3 objects. */
export async function DELETE(_req, { params }) {
	const id = (await params).id;
	if (!id || typeof id !== "string") {
		return Response.json({ error: "Bad request" }, { status: 400 });
	}
	try {
		const row = await getJobById(id);
		if (!row) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}
		const { client, bucket } = getVideoTranslateS3();
		const keys = collectVideoTranslateS3Keys(row);
		await deleteS3Objects(client, bucket, keys);
		await deleteJobById(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err);
		return Response.json({ error: message, code }, { status: 500 });
	}
}

/** Clear server-side error and set status from stored video/audio/transcript so the client can resume. */
export async function POST(_req, { params }) {
	const id = (await params).id;
	if (!id || typeof id !== "string") {
		return Response.json({ error: "Bad request" }, { status: 400 });
	}
	try {
		const row = await getJobById(id);
		if (!row) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}
		if (row.status === "error") {
			await restoreJobAfterError(id);
		}
		const updated = await getJobById(id);
		const withUrls = await attachSignedMedia({ ...updated });
		if (withUrls) {
			delete withUrls.videoS3Key;
			delete withUrls.extractedAudioS3Key;
			delete withUrls.audioS3Keys;
			delete withUrls.muxedVideoS3Keys;
			delete withUrls.transcriptSegments;
		}
		return Response.json({ job: withUrls });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err);
		return Response.json({ error: message, code }, { status: 500 });
	}
}
