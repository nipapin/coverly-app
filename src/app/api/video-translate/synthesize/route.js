import {
	SUPPORTED_LANGS,
	synthesizeSegmentsToTimelineMp3Buffer,
	synthesizeTextToMp3Buffer,
} from "@/lib/videoTranslateAi";
import { getVideoTranslateS3, signGetUrl, uploadFileToS3 } from "@/lib/videoTranslate";
import { getJobById, setAudioS3KeyForLang } from "@/lib/videoTranslationRepo";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";
export const maxDuration = 300;

const URL_TTL = 3600;

export async function POST(req) {
	try {
		const body = await req.json();
		const translationId = body?.translationId;
		const lang = body?.lang;
		const text = body?.text;

		if (!translationId || typeof translationId !== "string") {
			return Response.json(
				{ error: "Request is incomplete. Reload the page and try again.", code: "VALIDATION" },
				{ status: 400 },
			);
		}
		if (!lang || typeof lang !== "string" || !SUPPORTED_LANGS.includes(lang)) {
			return Response.json({ error: "Invalid language", code: "VALIDATION" }, { status: 400 });
		}
		if (!text || typeof text !== "string" || !text.trim()) {
			return Response.json({ error: "Missing text", code: "VALIDATION" }, { status: 400 });
		}

		const row = await getJobById(translationId);
		if (!row) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}
		const jobId = row.jobId;
		const segments = row.transcriptSegments;
		const useSegments = Array.isArray(segments) && segments.length > 0;

		/** @type {Record<string, string>} */
		const speakerEmbeddings =
			row?.speakerEmbeddings && typeof row.speakerEmbeddings === "object" ? row.speakerEmbeddings : {};

		const { client, bucket } = getVideoTranslateS3();
		const mp3 = useSegments
			? await synthesizeSegmentsToTimelineMp3Buffer(segments, lang, 0, {}, speakerEmbeddings)
			: await synthesizeTextToMp3Buffer(text, lang, null, null);
		const objectKey = `video-translate/outputs/${jobId}/${lang}.mp3`;
		await uploadFileToS3(client, bucket, objectKey, mp3, "audio/mpeg");
		await setAudioS3KeyForLang(translationId, lang, objectKey);
		const audioUrl = await signGetUrl(client, bucket, objectKey, URL_TTL);

		return Response.json({ audioUrl, objectKey, jobId });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err, { phase: "synthesize" });
		return Response.json({ error: message, code }, { status: 500 });
	}
}
