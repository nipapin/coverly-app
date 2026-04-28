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

/** Balanced profile TTS endpoint (Qwen 0.6B custom voice). */
const TTS_MODEL = "fal-ai/qwen-3-tts/text-to-speech/0.6b";
const TRANSLATION_MODEL = "fal-ai/any-llm";
const TRANSLATION_MODEL_NAME = "google/gemini-2.5-flash-lite";

export const LANG_TTS = {
	en: { voice: "Vivian", language: "English" },
	de: { voice: "Serena", language: "German" },
	it: { voice: "Ryan", language: "Italian" },
	es: { voice: "Aiden", language: "Spanish" },
};

export const SUPPORTED_LANGS = ["en", "de", "it", "es"];

/**
 * Available Qwen voices for speaker assignment.
 * @type {{ id: string, label: string, gender: 'F' | 'M' | 'N' }[]}
 */
export const AVAILABLE_VOICES = [
	{ id: "Vivian", label: "Vivian", gender: "F" },
	{ id: "Serena", label: "Serena", gender: "F" },
	{ id: "Uncle_Fu", label: "Uncle Fu", gender: "M" },
	{ id: "Dylan", label: "Dylan", gender: "M" },
	{ id: "Eric", label: "Eric", gender: "M" },
	{ id: "Ryan", label: "Ryan", gender: "M" },
	{ id: "Aiden", label: "Aiden", gender: "M" },
	{ id: "Ono_Anna", label: "Ono Anna", gender: "F" },
	{ id: "Sohee", label: "Sohee", gender: "F" },
];

/** Default voice rotation order for auto-assigning speakers. */
const SPEAKER_VOICE_SEQUENCE = ["Vivian", "Serena", "Dylan", "Eric", "Ryan", "Aiden", "Ono_Anna", "Sohee"];

/**
 * Build a default speaker → voice mapping from a list of detected speaker IDs.
 * If no speakers detected, returns `{ "_default": "Rachel" }` (applied to all segments without speaker info).
 * @param {string[]} speakers
 * @returns {Record<string, string>}
 */
export function buildDefaultSpeakerVoices(speakers) {
	if (!speakers || speakers.length === 0) {
		return { _default: "Vivian" };
	}
	/** @type {Record<string, string>} */
	const voices = {};
	speakers.forEach((spk, i) => {
		voices[spk] = SPEAKER_VOICE_SEQUENCE[i % SPEAKER_VOICE_SEQUENCE.length];
	});
	return voices;
}

const WHISPER_MODEL = "fal-ai/whisper";

const WHISPER_INPUT_BASE = {
	task: "transcribe",
	chunk_level: "segment",
	batch_size: 64,
	num_speakers: null,
	diarize: true,
};

const LANGUAGE_LABELS = {
	en: "English",
	de: "German",
	it: "Italian",
	es: "Spanish",
};
const SOURCE_TEXT_KEY = "__source";

/**
 * @typedef {{ start: number, end: number, texts: Record<string, string>, speaker: string | null }} TranscriptSegment
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
 * Extract speaker ID from a Whisper chunk (present when diarize: true).
 * @param {unknown} chunk
 * @returns {string | null}
 */
function whisperChunkSpeaker(chunk) {
	if (chunk && typeof chunk === "object" && "speaker" in chunk) {
		const s = chunk.speaker;
		return typeof s === "string" && s ? s : null;
	}
	return null;
}

/**
 * Align per-language Whisper segment texts to one timeline (timestamps from first usable chunk per index).
 * Speaker is sourced from the `en` run (primary language); falls back to any other language if missing.
 * @param {Record<string, { text: string, chunks?: unknown[] }>} byLang
 * @returns {TranscriptSegment[] | null}
 */
export function mergeTranscriptSegments(byLang) {
	const sourceChunks = Array.isArray(byLang[SOURCE_TEXT_KEY]?.chunks) ? byLang[SOURCE_TEXT_KEY].chunks : [];
	if (sourceChunks.length === 0) {
		return null;
	}
	/** @type {TranscriptSegment[]} */
	const segments = [];
	for (let i = 0; i < sourceChunks.length; i++) {
		const source = sourceChunks[i];
		const { start, end } = whisperChunkTimes(source);
		const speaker = whisperChunkSpeaker(source);
		const texts = {};
		for (const l of SUPPORTED_LANGS) {
			const arr = Array.isArray(byLang[l]?.chunks) ? byLang[l].chunks : [];
			const ch = arr[i];
			const raw = ch && typeof ch === "object" && "text" in ch ? ch.text : "";
			texts[l] = String(raw ?? "").trim();
		}
		segments.push({ start, end, texts, speaker });
	}
	return segments;
}

function translationPrompt(text, targetLanguageLabel) {
	return [
		`Translate the following subtitle segment to ${targetLanguageLabel}.`,
		"Preserve meaning, punctuation, and natural spoken style.",
		"Return only translated text without explanations.",
		"",
		text,
	].join("\n");
}

async function translateSegmentText(text, targetLang, cache) {
	const clean = String(text || "").trim();
	if (!clean) return "";
	const cacheKey = `${targetLang}:${clean}`;
	if (cache.has(cacheKey)) return cache.get(cacheKey);

	const translated = await fal.subscribe(TRANSLATION_MODEL, {
		input: {
			model: TRANSLATION_MODEL_NAME,
			priority: "latency",
			temperature: 0.05,
			prompt: translationPrompt(clean, LANGUAGE_LABELS[targetLang] || "target language"),
			max_tokens: 2000,
		},
		logs: false,
	});
	const out = String(translated?.data?.output || "").trim();
	cache.set(cacheKey, out || clean);
	return out || clean;
}

/**
 * Extract unique speaker IDs (sorted) from transcript segments.
 * @param {TranscriptSegment[] | null | undefined} segments
 * @returns {string[]}
 */
export function extractUniqueSpeakers(segments) {
	if (!Array.isArray(segments)) return [];
	const set = new Set();
	for (const s of segments) {
		if (s?.speaker) set.add(s.speaker);
	}
	return [...set].sort();
}

/**
 * @param {string} audioUrl
 * @returns {Promise<Record<string, { text: string, chunks: unknown[] }>>}
 */
export async function transcribeWithLanguageHintsDetailed(audioUrl) {
	ensureFalConfigured();
	const whisper = await fal.subscribe(WHISPER_MODEL, {
		input: {
			audio_url: audioUrl,
			...WHISPER_INPUT_BASE,
			language: null,
		},
		logs: false,
	});
	const sourceChunks = Array.isArray(whisper?.data?.chunks) ? whisper.data.chunks : [];
	const sourceText = String(whisper?.data?.text || "").trim();
	const translationCache = new Map();
	/** @type {Record<string, { text: string, chunks: unknown[] }>} */
	const out = {};
	out[SOURCE_TEXT_KEY] = { text: sourceText, chunks: sourceChunks };
	for (const lang of SUPPORTED_LANGS) {
		/** @type {unknown[]} */
		const translatedChunks = [];
		for (const chunk of sourceChunks) {
			const rawText = chunk && typeof chunk === "object" && "text" in chunk ? chunk.text : "";
			const translatedText = await translateSegmentText(String(rawText || ""), lang, translationCache);
			if (chunk && typeof chunk === "object") {
				translatedChunks.push({ ...chunk, text: translatedText });
			}
		}
		out[lang] = {
			text: translatedChunks
				.map((chunk) => (chunk && typeof chunk === "object" && "text" in chunk ? chunk.text : ""))
				.join(" ")
				.trim(),
			chunks: translatedChunks,
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
 * @param {string | null} [voice] Override voice; defaults to LANG_TTS[langCode].voice.
 */
export async function synthesizeChunkTextToMp3Buffer(
	text,
	langCode,
	voice = null,
	speakerEmbeddingUrl = null,
) {
	const tts = LANG_TTS[langCode];
	if (!tts) {
		throw new Error("Invalid language code");
	}
	ensureFalConfigured();
	const result = await fal.subscribe(TTS_MODEL, {
		input: {
			text,
			voice: voice || tts.voice,
			language: tts.language,
			speaker_voice_embedding_file_url: speakerEmbeddingUrl || undefined,
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

export async function synthesizeTextToMp3Buffer(text, langCode, voice = null, speakerEmbeddingUrl = null) {
	const parts = chunkTextForTts(text, 4000);
	const workDir = await mkdtemp(join(tmpdir(), "video-translate-tts-"));
	try {
		const chunkPaths = [];
		for (let i = 0; i < parts.length; i++) {
			const buf = await synthesizeChunkTextToMp3Buffer(
				parts[i],
				langCode,
				voice,
				speakerEmbeddingUrl,
			);
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
 * Resolve TTS voice for a segment given the speaker voices map.
 * Falls back to `_default` key, then to the language default voice.
 * @param {string | null} speaker
 * @param {string} langCode
 * @param {Record<string, string>} speakerVoices
 * @returns {string | null}
 */
function resolveVoice(speaker, langCode, speakerVoices) {
	if (speaker && speakerVoices[speaker]) return speakerVoices[speaker];
	if (speakerVoices["_default"]) return speakerVoices["_default"];
	return LANG_TTS[langCode]?.voice ?? null;
}

/**
 * Build one MP3 aligned to Whisper segment start times (same timeline as extracted audio / video).
 * Each segment is synthesized with the voice assigned to its detected speaker.
 * @param {TranscriptSegment[]} segments
 * @param {string} langCode
 * @param {number} [minOutputDurationSec] pad with silence to at least this length (e.g. video duration)
 * @param {Record<string, string>} [speakerVoices] speaker → voice name mapping
 */
export async function synthesizeSegmentsToTimelineMp3Buffer(
	segments,
	langCode,
	minOutputDurationSec = 0,
	speakerVoices = {},
	speakerEmbeddings = {},
) {
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
			const speaker = seg.speaker ?? null;
			const voice = resolveVoice(speaker, langCode, speakerVoices);
			const embeddingUrl = speaker ? speakerEmbeddings[speaker] || null : null;
			const parts = chunkTextForTts(text, 4000);
			const partPaths = [];
			for (let p = 0; p < parts.length; p++) {
				const buf = await synthesizeChunkTextToMp3Buffer(
					parts[p],
					langCode,
					voice,
					embeddingUrl,
				);
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
