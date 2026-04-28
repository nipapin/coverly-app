import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { fal } from "@fal-ai/client";
import ffmpegPath from "ffmpeg-static";
import { FAL_DUBBING_PROFILES, LOCKED_DUBBING_PROFILE } from "../../src/lib/falDubbingProfiles.js";

const SOURCE_AUDIO_URL =
	"https://ihlhivqvotguuqycfcvj.supabase.co/storage/v1/object/public/public-text-to-speech/scratch-testing/earth-history-19mins.mp3";
const BENCHMARK_SECONDS = 360;
const TARGET_LANGS = ["de", "it", "es"];

function assertEnv() {
	if (!process.env.FAL_KEY) {
		throw new Error("FAL_KEY is required. Run with: node --env-file=.env scripts/fal/run-balanced-benchmark.mjs");
	}
}

function nowIso() {
	return new Date().toISOString();
}

function floor2(value) {
	return Number((value ?? 0).toFixed(2));
}

async function timed(label, fn) {
	const startedAt = nowIso();
	const start = performance.now();
	const result = await fn();
	const elapsedMs = performance.now() - start;
	return { label, startedAt, elapsedMs: floor2(elapsedMs), result };
}

async function fetchToBuffer(url) {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to download source audio (${res.status})`);
	}
	return Buffer.from(await res.arrayBuffer());
}

async function runFfmpeg(args) {
	if (!ffmpegPath) {
		throw new Error("ffmpeg-static could not resolve a binary path");
	}
	await new Promise((resolve, reject) => {
		const cp = spawn(ffmpegPath, args, { stdio: "inherit" });
		cp.on("error", reject);
		cp.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg exited with code ${code}`));
		});
	});
}

function pullSpeakerStats(chunks) {
	if (!Array.isArray(chunks)) {
		return { uniqueSpeakers: [], speakerTurns: 0 };
	}
	const unique = new Set();
	let turns = 0;
	let prev = null;
	for (const chunk of chunks) {
		const s = typeof chunk?.speaker === "string" ? chunk.speaker : null;
		if (s) {
			unique.add(s);
			if (prev !== s) turns += 1;
			prev = s;
		}
	}
	return { uniqueSpeakers: [...unique].sort(), speakerTurns: turns };
}

function buildTranslationPrompt(text, langCode) {
	return [
		`Translate the transcript to ${langCode.toUpperCase()}.`,
		"Keep meaning, sentence boundaries, punctuation, and speaker-neutral style.",
		"Do not add comments, markdown, or explanations.",
		"",
		text,
	].join("\n");
}

function estimateCostUsd(profile, summary) {
	const p = FAL_DUBBING_PROFILES[profile];
	const translationCalls = TARGET_LANGS.length;
	const translatedChars = summary.translation.totalTranslatedChars;
	const qwenChars = summary.tts.qwenChars;
	const xaiChars = summary.tts.xaiChars;
	const cloneMinutes = summary.voiceClone.referenceDurationSec / 60;

	const translationCost = translationCalls * p.translation.pricing.usd;
	const cloneCost = cloneMinutes * p.voiceClone.pricing.usd;
	const qwenCost = (qwenChars / 1000) * p.tts.pricing.usd;
	const xaiCost = (xaiChars / 1000) * p.emotion.pricing.usd;
	const lipsyncCost = 0;

	const total = translationCost + cloneCost + qwenCost + xaiCost + lipsyncCost;

	return {
		translationCostUsd: floor2(translationCost),
		voiceCloneCostUsd: floor2(cloneCost),
		qwenTtsCostUsd: floor2(qwenCost),
		xaiTtsCostUsd: floor2(xaiCost),
		lipsyncCostUsd: floor2(lipsyncCost),
		totalEstimatedUsd: floor2(total),
	};
}

function markdownReport(payload) {
	const s = payload.summary;
	return [
		"# Balanced fal.ai Benchmark",
		"",
		`- Timestamp: ${payload.completedAt}`,
		`- Locked profile: ${payload.profile}`,
		`- Source audio: ${payload.inputs.sourceAudioUrl}`,
		`- Benchmark audio length: ${payload.inputs.benchmarkSeconds}s`,
		"",
		"## Latency",
		"",
		`- ASR (${payload.models.asr}): ${s.latency.asrMs} ms`,
		`- Translation (${payload.models.translation} x${TARGET_LANGS.length}): ${s.latency.translationMs} ms`,
		`- Voice clone (${payload.models.voiceClone}): ${s.latency.voiceCloneMs} ms`,
		`- Qwen TTS (${payload.models.tts}): ${s.latency.qwenTtsMs} ms`,
		`- Emotion TTS (${payload.models.emotion}): ${s.latency.xaiTtsMs} ms`,
		"",
		"## Quality Proxies",
		"",
		`- ASR chars: ${s.asr.transcriptChars}`,
		`- ASR segments: ${s.asr.segmentCount}`,
		`- Detected speakers: ${s.asr.uniqueSpeakers.join(", ") || "none"}`,
		`- Speaker turns: ${s.asr.speakerTurns}`,
		`- Translation chars total (${TARGET_LANGS.join(", ")}): ${s.translation.totalTranslatedChars}`,
		`- Translation ratio (target/source): ${s.translation.charRatio}`,
		"",
		"## Cost (estimated from fal unit rates)",
		"",
		`- Translation: $${s.cost.translationCostUsd}`,
		`- Voice clone: $${s.cost.voiceCloneCostUsd}`,
		`- Qwen TTS: $${s.cost.qwenTtsCostUsd}`,
		`- xAI expressive TTS: $${s.cost.xaiTtsCostUsd}`,
		`- Lip-sync: $${s.cost.lipsyncCostUsd} (not run in benchmark)`,
		`- Total: $${s.cost.totalEstimatedUsd}`,
		"",
		"## Notes",
		"",
		"- ASR pricing for `fal-ai/whisper` is listed as compute-based on model page; this benchmark records latency and output quality proxies but leaves ASR dollar cost as 0 in estimate.",
		"- Lip-sync is intentionally excluded from this benchmark run to keep the stack composable and cheap in draft stage.",
		"",
	].join("\n");
}

async function main() {
	assertEnv();
	fal.config({ credentials: process.env.FAL_KEY });

	const profile = LOCKED_DUBBING_PROFILE;
	const models = {
		asr: FAL_DUBBING_PROFILES[profile].asr.model,
		translation: FAL_DUBBING_PROFILES[profile].translation.model,
		voiceClone: FAL_DUBBING_PROFILES[profile].voiceClone.model,
		tts: FAL_DUBBING_PROFILES[profile].tts.model,
		emotion: FAL_DUBBING_PROFILES[profile].emotion.model,
	};

	const workDir = await mkdtemp(join(tmpdir(), "fal-balanced-bench-"));
	const outDir = join(process.cwd(), "benchmarks", "fal");
	await mkdir(outDir, { recursive: true });

	try {
		const sourcePath = join(workDir, "source.mp3");
		const benchPath = join(workDir, "benchmark-6min.mp3");
		const voiceRefPath = join(workDir, "voice-ref-15s.mp3");

		const sourceBuffer = await fetchToBuffer(SOURCE_AUDIO_URL);
		await writeFile(sourcePath, sourceBuffer);

		await runFfmpeg(["-y", "-i", sourcePath, "-t", String(BENCHMARK_SECONDS), "-ac", "1", "-ar", "24000", benchPath]);
		await runFfmpeg(["-y", "-i", benchPath, "-t", "15", "-ac", "1", "-ar", "24000", voiceRefPath]);

		const benchmarkFile = new File([await readFile(benchPath)], "benchmark-6min.mp3", { type: "audio/mpeg" });
		const voiceRefFile = new File([await readFile(voiceRefPath)], "voice-ref-15s.mp3", { type: "audio/mpeg" });
		const uploadedAudioUrl = await fal.storage.upload(benchmarkFile);
		const uploadedRefUrl = await fal.storage.upload(voiceRefFile);

		const asr = await timed("asr", async () =>
			fal.subscribe(models.asr, {
				input: {
					audio_url: uploadedAudioUrl,
					task: "transcribe",
					language: "en",
					chunk_level: "segment",
					diarize: true,
					batch_size: 64,
				},
				logs: false,
			}),
		);

		const transcript = String(asr.result?.data?.text ?? "").trim();
		const chunks = Array.isArray(asr.result?.data?.chunks) ? asr.result.data.chunks : [];
		const speakerStats = pullSpeakerStats(chunks);

		const translations = {};
		let translationChars = 0;
		const translationTimed = await timed("translation", async () => {
			for (const langCode of TARGET_LANGS) {
				const translated = await fal.subscribe(models.translation, {
					input: {
						model: "google/gemini-2.5-flash-lite",
						priority: "latency",
						prompt: buildTranslationPrompt(transcript, langCode),
						max_tokens: 12000,
					},
					logs: false,
				});
				const output = String(translated?.data?.output ?? "").trim();
				translations[langCode] = output;
				translationChars += output.length;
			}
		});

		const referenceText = transcript.slice(0, 220).trim();
		const clone = await timed("voiceClone", async () =>
			fal.subscribe(models.voiceClone, {
				input: {
					audio_url: uploadedRefUrl,
					reference_text: referenceText || undefined,
				},
				logs: false,
			}),
		);
		const embeddingUrl = clone.result?.data?.speaker_embedding?.url;
		if (!embeddingUrl) {
			throw new Error("Qwen clone voice response did not include speaker embedding URL");
		}

		const qwenText = translations.de.slice(0, 900);
		const qwen = await timed("qwenTts", async () =>
			fal.subscribe(models.tts, {
				input: {
					text: qwenText,
					language: "German",
					speaker_voice_embedding_file_url: embeddingUrl,
					reference_text: referenceText || undefined,
				},
				logs: false,
			}),
		);

		const emotionText = "[pause] Das ist ein wichtiger Moment. [sigh] Wir muessen jetzt ruhig bleiben.";
		const xai = await timed("xaiTts", async () =>
			fal.subscribe(models.emotion, {
				input: {
					text: emotionText,
					voice: "ara",
					language: "de",
				},
				logs: false,
			}),
		);

		const summary = {
			asr: {
				transcriptChars: transcript.length,
				segmentCount: chunks.length,
				uniqueSpeakers: speakerStats.uniqueSpeakers,
				speakerTurns: speakerStats.speakerTurns,
			},
			translation: {
				totalTranslatedChars: translationChars,
				charRatio: floor2(translationChars / Math.max(1, transcript.length)),
				byLanguageChars: Object.fromEntries(
					Object.entries(translations).map(([k, v]) => [k, String(v).length]),
				),
			},
			voiceClone: {
				referenceDurationSec: 15,
			},
			tts: {
				qwenChars: qwenText.length,
				xaiChars: emotionText.length,
				qwenDurationSec: floor2(Number(qwen.result?.data?.audio?.duration ?? 0)),
				xaiAudioUrl: String(xai.result?.data?.audio?.url ?? ""),
			},
			latency: {
				asrMs: asr.elapsedMs,
				translationMs: translationTimed.elapsedMs,
				voiceCloneMs: clone.elapsedMs,
				qwenTtsMs: qwen.elapsedMs,
				xaiTtsMs: xai.elapsedMs,
			},
		};
		summary.cost = estimateCostUsd(profile, summary);

		const payload = {
			profile,
			inputs: {
				sourceAudioUrl: SOURCE_AUDIO_URL,
				benchmarkSeconds: BENCHMARK_SECONDS,
				targetLanguages: TARGET_LANGS,
			},
			models,
			translationsPreview: Object.fromEntries(
				Object.entries(translations).map(([k, v]) => [k, String(v).slice(0, 300)]),
			),
			summary,
			completedAt: nowIso(),
		};

		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const jsonPath = join(outDir, `balanced-benchmark-${ts}.json`);
		const mdPath = join(outDir, `balanced-benchmark-${ts}.md`);
		await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
		await writeFile(mdPath, markdownReport(payload), "utf8");

		console.log(`Benchmark JSON: ${jsonPath}`);
		console.log(`Benchmark Markdown: ${mdPath}`);
	} finally {
		await rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
