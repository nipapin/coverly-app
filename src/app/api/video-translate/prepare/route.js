import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fal } from "@fal-ai/client";
import {
	concatMp3Files,
	downloadS3ObjectToFile,
	getVideoTranslateS3,
	runFfmpeg,
	uploadFileToS3,
} from "@/lib/videoTranslate";
import { fetchWithRetry, runWithNetworkRetry } from "@/lib/fetchRetry";
import {
	ensureFalConfigured,
	extractUniqueSpeakers,
	mergeTranscriptSegments,
	SUPPORTED_LANGS,
	transcribeWithLanguageHintsDetailed,
} from "@/lib/videoTranslateAi";
import { getJobById, setJobError, setPrepareResult } from "@/lib/videoTranslationRepo";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";
export const maxDuration = 600;
const DEMUCS_MODEL = "fal-ai/demucs";
const CLONE_MODEL = "fal-ai/qwen-3-tts/clone-voice/0.6b";
const MAX_REF_SECONDS_PER_SPEAKER = 24;
const MIN_SEGMENT_SECONDS = 0.8;

async function downloadToBuffer(url) {
	const res = await fetchWithRetry(url, {}, { retries: 4, baseDelayMs: 600 });
	if (!res.ok) {
		throw new Error(`Failed to download file (${res.status})`);
	}
	return Buffer.from(await res.arrayBuffer());
}

async function buildSpeakerReferenceMp3(vocalsPath, speaker, segments, workDir) {
	const selected = [];
	let total = 0;
	for (const seg of segments) {
		if (seg?.speaker !== speaker) continue;
		const start = Number(seg?.start ?? 0);
		const end = Number(seg?.end ?? 0);
		const dur = Math.max(0, end - start);
		if (dur < MIN_SEGMENT_SECONDS) continue;
		selected.push({ start, end });
		total += dur;
		if (total >= MAX_REF_SECONDS_PER_SPEAKER) break;
	}
	if (selected.length === 0) return null;

	const clipPaths = [];
	for (let i = 0; i < selected.length; i++) {
		const clipPath = join(workDir, `speaker_${speaker}_clip_${i}.mp3`);
		await runFfmpeg([
			"-y",
			"-i",
			vocalsPath,
			"-ss",
			String(selected[i].start),
			"-to",
			String(selected[i].end),
			"-acodec",
			"libmp3lame",
			"-q:a",
			"4",
			clipPath,
		]);
		clipPaths.push(clipPath);
	}
	const outPath = join(workDir, `speaker_${speaker}_ref.mp3`);
	await concatMp3Files(clipPaths, outPath);
	return outPath;
}

async function cloneVoicesPerSpeaker(vocalsPath, transcriptSegments, speakers, workDir) {
	/** @type {Record<string, string>} */
	const embeddings = {};
	for (const speaker of speakers) {
		const refPath = await buildSpeakerReferenceMp3(vocalsPath, speaker, transcriptSegments || [], workDir);
		if (!refPath) continue;
		const refBuffer = await readFile(refPath);
		const file = new File([refBuffer], `${speaker}.mp3`, { type: "audio/mpeg" });
		const refUrl = await fal.storage.upload(file);
		const cloned = await fal.subscribe(CLONE_MODEL, {
			input: { audio_url: refUrl },
			logs: false,
		});
		const embeddingUrl = cloned?.data?.speaker_embedding?.url;
		if (embeddingUrl) {
			embeddings[speaker] = embeddingUrl;
		}
	}
	return embeddings;
}

/**
 * @param {object} row — row from getJobById (with extractedAudioS3Key, jobId)
 * @returns {Promise<{ _empty: true, jobId: string } | { _empty: false, jobId: string, transcript: string, translations: object, transcriptSegments: object[] | null, detectedSpeakers: string[], speakerEmbeddings: Record<string, string>, vocalsS3Key: string, accompanimentS3Key: string }>}
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
		const vocalsPath = join(workDir, "vocals.mp3");
		const accPath = join(workDir, "accompaniment.mp3");
		await downloadS3ObjectToFile(client, bucket, audioKey, audioPath);

		const audioBuffer = await readFile(audioPath);
		const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });
		const audioUrl = await fal.storage.upload(audioFile);
		const separated = await fal.subscribe(DEMUCS_MODEL, {
			input: {
				audio_url: audioUrl,
				model: "htdemucs",
				stems: ["vocals", "other"],
				output_format: "mp3",
			},
			logs: false,
		});
		const vocalsUrl = separated?.data?.vocals?.url;
		const accompanimentUrl = separated?.data?.other?.url;
		if (!vocalsUrl || !accompanimentUrl) {
			throw new Error("Could not split vocals and background track");
		}

		const vocalsBuffer = await downloadToBuffer(vocalsUrl);
		const accompanimentBuffer = await downloadToBuffer(accompanimentUrl);
		await writeFile(vocalsPath, vocalsBuffer);
		await writeFile(accPath, accompanimentBuffer);

		const vocalsS3Key = `video-translate/extracted/${jobId}/vocals.mp3`;
		const accompanimentS3Key = `video-translate/extracted/${jobId}/accompaniment.mp3`;
		await uploadFileToS3(client, bucket, vocalsS3Key, vocalsBuffer, "audio/mpeg");
		await uploadFileToS3(client, bucket, accompanimentS3Key, accompanimentBuffer, "audio/mpeg");

		/** Vocals → translated strings + aligned segment timestamps (with diarization). */
		const detailed = await transcribeWithLanguageHintsDetailed(vocalsUrl);
		const translations = Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, detailed[l].text]));

		const allEmpty = SUPPORTED_LANGS.every((k) => !translations[k]);
		if (allEmpty) {
			return { _empty: true, jobId };
		}
		const missing = SUPPORTED_LANGS.filter((k) => !translations[k]);
		if (missing.length) {
			const err = new Error(
				`Some translations could not be generated: ${missing.join(", ")}.`,
			);
			err.retriable = false;
			throw err;
		}

		const transcript = String(detailed?.__source?.text || "").trim();
		const transcriptSegments = mergeTranscriptSegments(detailed);
		const detectedSpeakers = extractUniqueSpeakers(transcriptSegments);
		const speakerEmbeddings = await cloneVoicesPerSpeaker(
			vocalsPath,
			transcriptSegments || [],
			detectedSpeakers,
			workDir,
		);
		return {
			_empty: false,
			jobId,
			transcript,
			translations,
			transcriptSegments,
			detectedSpeakers,
			speakerEmbeddings,
			vocalsS3Key,
			accompanimentS3Key,
		};
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
			detectedSpeakers: out.detectedSpeakers,
			speakerEmbeddings: out.speakerEmbeddings,
			vocalsS3Key: out.vocalsS3Key,
			accompanimentS3Key: out.accompanimentS3Key,
			status: "transcribed",
		});
		return Response.json({
			jobId: out.jobId,
			transcript: out.transcript,
			translations: out.translations,
			transcriptSegments: out.transcriptSegments,
			detectedSpeakers: out.detectedSpeakers,
			speakerEmbeddings: out.speakerEmbeddings,
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
