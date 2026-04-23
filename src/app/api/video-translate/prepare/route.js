import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fal } from "@fal-ai/client";
import { downloadS3ObjectToFile, getVideoTranslateS3 } from "@/lib/videoTranslate";
import { runWithNetworkRetry } from "@/lib/fetchRetry";
import {
	ensureFalConfigured,
	mergeTranscriptSegments,
	SUPPORTED_LANGS,
	transcribeWithLanguageHintsDetailed,
} from "@/lib/videoTranslateAi";
import { getJobById, setJobError, setPrepareResult } from "@/lib/videoTranslationRepo";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * @param {object} row — row from getJobById (with extractedAudioS3Key, jobId)
 * @returns {Promise<{ _empty: true, jobId: string } | { _empty: false, jobId: string, transcript: string, translations: object, transcriptSegments: object[] | null }>}
 */
async function executePrepare(row) {
	const { jobId } = row;
	const audioKey = row.extractedAudioS3Key;
	if (!audioKey) {
		const err = new Error("No extracted audio in database");
		err.retriable = false;
		throw err;
	}
	const { client, bucket } = getVideoTranslateS3();
	const workDir = await mkdtemp(join(tmpdir(), "video-translate-prepare-"));
	try {
		const audioPath = join(workDir, "for-whisper.mp3");
		await downloadS3ObjectToFile(client, bucket, audioKey, audioPath);

		const audioBuffer = await readFile(audioPath);
		const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });
		const audioUrl = await fal.storage.upload(audioFile);

		/** Same audio → four strings + aligned segment timestamps (Whisper segments). */
		const detailed = await transcribeWithLanguageHintsDetailed(audioUrl);
		const translations = Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, detailed[l].text]));

		const allEmpty = SUPPORTED_LANGS.every((k) => !translations[k]);
		if (allEmpty) {
			return { _empty: true, jobId };
		}
		const missing = SUPPORTED_LANGS.filter((k) => !translations[k]);
		if (missing.length) {
			const err = new Error(
				`Whisper returned no text for: ${missing.join(", ")}. Try different audio or check language hints.`,
			);
			err.retriable = false;
			throw err;
		}

		const transcript = translations.en;
		const transcriptSegments = mergeTranscriptSegments(detailed);
		return { _empty: false, jobId, transcript, translations, transcriptSegments };
	} finally {
		await rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
}

export async function POST(req) {
	let translationId;
	try {
		ensureFalConfigured();

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
		if (!row.extractedAudioS3Key) {
			return Response.json(
				{
					error: "Audio is not ready yet. Wait until sound is extracted from the video.",
					code: "VALIDATION",
				},
				{ status: 400 },
			);
		}

		const out = await runWithNetworkRetry(() => executePrepare(row), {
			attempts: 4,
			baseDelayMs: 2000,
		});

		if (out._empty) {
			const { message, code } = toPublicError(new Error("Transcription is empty"), { phase: "prepare" });
			await setJobError(translationId, { code, message });
			return Response.json({ error: message, code }, { status: 422 });
		}

		await setPrepareResult(translationId, {
			transcript: out.transcript,
			translations: out.translations,
			transcriptSegments: out.transcriptSegments,
			status: "transcribed",
		});
		return Response.json({
			jobId: out.jobId,
			transcript: out.transcript,
			translations: out.translations,
			transcriptSegments: out.transcriptSegments,
		});
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err, { phase: "prepare" });
		if (translationId) {
			await setJobError(translationId, { code, message }).catch(() => {});
		}
		return Response.json({ error: message, code }, { status: 500 });
	}
}
