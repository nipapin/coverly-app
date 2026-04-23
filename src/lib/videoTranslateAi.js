import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fal } from "@fal-ai/client";
import { fetchWithRetry } from "@/lib/fetchRetry";
import {
	amixAudioFilesToMp3,
	chunkTextForTts,
	concatMp3Files,
	probeMediaDurationSeconds,
	runFfmpeg,
} from "@/lib/videoTranslate";

/** @see https://fal.ai/models/fal-ai/elevenlabs/tts/turbo-v2.5/api — `voice` is name or id; `language_code` is ISO 639-1. */
const TTS_MODEL = "fal-ai/elevenlabs/tts/turbo-v2.5";

export const LANG_TTS = {
	en: { voice: "Rachel", language_code: "en" },
	de: { voice: "Rachel", language_code: "de" },
	it: { voice: "Rachel", language_code: "it" },
	es: { voice: "Rachel", language_code: "es" },
};

export const SUPPORTED_LANGS = ["en", "de", "it", "es"];

const WHISPER_MODEL = "fal-ai/whisper";

const WHISPER_INPUT_BASE = {
	task: "transcribe",
	chunk_level: "segment",
	batch_size: 64,
	num_speakers: null,
};

/**
 * @typedef {{ start: number, end: number, texts: Record<string, string> }} TranscriptSegment
 */

/**
 * @param {unknown} chunk
 * @returns {{ start: number, end: number }}
 */
function whisperChunkTimes(chunk) {
	const ts = chunk && typeof chunk === "object" && "timestamp" in chunk ? chunk.timestamp : null;
	if (Array.isArray(ts) && ts.length >= 2) {
		const start = Number(ts[0]);
		const end = Number(ts[1]);
		if (!Number.isFinite(start)) {
			return { start: 0, end: 0 };
		}
		if (!Number.isFinite(end)) {
			return { start: Math.max(0, start), end: Math.max(0, start) };
		}
		return { start: Math.max(0, start), end: Math.max(0, end) };
	}
	return { start: 0, end: 0 };
}

/**
 * Align per-language Whisper segment texts to one timeline (timestamps from first usable chunk per index).
 * @param {Record<string, { text: string, chunks?: unknown[] }>} byLang
 * @returns {TranscriptSegment[] | null}
 */
export function mergeTranscriptSegments(byLang) {
	let maxLen = 0;
	/** @type {Record<string, unknown[]>} */
	const arrays = {};
	for (const l of SUPPORTED_LANGS) {
		const ch = byLang[l]?.chunks;
		const arr = Array.isArray(ch) ? ch : [];
		arrays[l] = arr;
		maxLen = Math.max(maxLen, arr.length);
	}
	if (maxLen === 0) {
		return null;
	}
	/** @type {TranscriptSegment[]} */
	const segments = [];
	for (let i = 0; i < maxLen; i++) {
		let start = 0;
		let end = 0;
		for (const l of SUPPORTED_LANGS) {
			const ch = arrays[l][i];
			if (ch) {
				const t = whisperChunkTimes(ch);
				if (t.end > t.start || t.start > 0) {
					start = t.start;
					end = t.end;
					break;
				}
			}
		}
		const texts = {};
		for (const l of SUPPORTED_LANGS) {
			const ch = arrays[l][i];
			const raw = ch && typeof ch === "object" && "text" in ch ? ch.text : "";
			texts[l] = String(raw ?? "").trim();
		}
		segments.push({ start, end, texts });
	}
	return segments;
}

/**
 * @param {string} audioUrl
 * @returns {Promise<Record<string, { text: string, chunks: unknown[] }>>}
 */
export async function transcribeWithLanguageHintsDetailed(audioUrl) {
	ensureFalConfigured();
	const results = await Promise.all(
		SUPPORTED_LANGS.map((language) =>
			fal.subscribe(WHISPER_MODEL, {
				input: {
					audio_url: audioUrl,
					...WHISPER_INPUT_BASE,
					language,
				},
				logs: false,
			}),
		),
	);
	/** @type {Record<string, { text: string, chunks: unknown[] }>} */
	const out = {};
	for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
		const lang = SUPPORTED_LANGS[i];
		const data = results[i].data;
		const chunks = Array.isArray(data?.chunks) ? data.chunks : [];
		out[lang] = {
			text: (data?.text || "").trim(),
			chunks,
		};
	}
	return out;
}

/**
 * @param {string} audioUrl
 * @returns {Promise<Record<"en"|"de"|"it"|"es", string>>}
 */
export async function transcribeWithLanguageHints(audioUrl) {
	const detailed = await transcribeWithLanguageHintsDetailed(audioUrl);
	return Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, detailed[l].text]));
}

export function ensureFalConfigured() {
	const falKey = process.env.FAL_KEY;
	if (!falKey) {
		throw new Error("FAL_KEY is not set");
	}
	fal.config({ credentials: falKey });
}

/**
 * One TTS request → MP3 bytes.
 * @param {string} text
 * @param {string} langCode
 */
export async function synthesizeChunkTextToMp3Buffer(text, langCode) {
	const tts = LANG_TTS[langCode];
	if (!tts) {
		throw new Error("Invalid language code");
	}
	ensureFalConfigured();
	const result = await fal.subscribe(TTS_MODEL, {
		input: {
			text,
			voice: tts.voice,
			language_code: tts.language_code,
		},
		logs: false,
	});
	const url = result.data?.audio?.url;
	if (!url) {
		throw new Error("TTS response missing audio URL");
	}
	const res = await fetchWithRetry(url, {}, { retries: 4, baseDelayMs: 500 });
	if (!res.ok) {
		throw new Error(`Failed to download TTS audio: ${res.status}`);
	}
	return Buffer.from(await res.arrayBuffer());
}

export async function synthesizeTextToMp3Buffer(text, langCode) {
	const parts = chunkTextForTts(text, 4000);
	const workDir = await mkdtemp(join(tmpdir(), "video-translate-tts-"));
	try {
		const chunkPaths = [];
		for (let i = 0; i < parts.length; i++) {
			const buf = await synthesizeChunkTextToMp3Buffer(parts[i], langCode);
			const chunkPath = join(workDir, `tts_${langCode}_${i}.mp3`);
			await writeFile(chunkPath, buf);
			chunkPaths.push(chunkPath);
		}
		const mp3Path = join(workDir, `out_${langCode}.mp3`);
		await concatMp3Files(chunkPaths, mp3Path);
		return readFile(mp3Path);
	} finally {
		await rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
}

/**
 * Build one MP3 aligned to Whisper segment start times (same timeline as extracted audio / video).
 * @param {TranscriptSegment[]} segments
 * @param {string} langCode
 * @param {number} [minOutputDurationSec] pad with silence to at least this length (e.g. video duration)
 */
export async function synthesizeSegmentsToTimelineMp3Buffer(segments, langCode, minOutputDurationSec = 0) {
	if (!segments?.length) {
		throw new Error("No transcript segments");
	}
	const workDir = await mkdtemp(join(tmpdir(), "video-translate-tts-timeline-"));
	try {
		const delayedPaths = [];
		let segIdx = 0;
		for (const seg of segments) {
			const text = seg.texts?.[langCode]?.trim();
			if (!text) {
				continue;
			}
			const parts = chunkTextForTts(text, 4000);
			const partPaths = [];
			for (let p = 0; p < parts.length; p++) {
				const buf = await synthesizeChunkTextToMp3Buffer(parts[p], langCode);
				const pp = join(workDir, `raw_${segIdx}_${p}.mp3`);
				await writeFile(pp, buf);
				partPaths.push(pp);
			}
			const segMerged = join(workDir, `seg_${segIdx}_merged.mp3`);
			await concatMp3Files(partPaths, segMerged);
			const delayMs = Math.round(Math.max(0, seg.start) * 1000);
			const delayed = join(workDir, `seg_${segIdx}_delayed.mp3`);
			await runFfmpeg([
				"-y",
				"-i",
				segMerged,
				"-af",
				`adelay=${delayMs}|${delayMs}`,
				delayed,
			]);
			delayedPaths.push(delayed);
			segIdx += 1;
		}
		if (delayedPaths.length === 0) {
			throw new Error("No non-empty segments for this language");
		}
		const mixed = join(workDir, "mixed.mp3");
		await amixAudioFilesToMp3(delayedPaths, mixed, workDir);
		const tail = Math.max(
			minOutputDurationSec,
			...segments.map((s) => (Number.isFinite(s.end) ? s.end : 0)),
		);
		const padded = join(workDir, "padded.mp3");
		const cur = await probeMediaDurationSeconds(mixed);
		if (tail > 0 && cur < tail - 0.05) {
			const padSamples = Math.ceil((tail - cur) * 48000);
			await runFfmpeg([
				"-y",
				"-i",
				mixed,
				"-af",
				`apad=pad_len=${padSamples}`,
				"-c:a",
				"libmp3lame",
				"-q:a",
				"4",
				padded,
			]);
		} else {
			await copyFile(mixed, padded);
		}
		return readFile(padded);
	} finally {
		await rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
}
