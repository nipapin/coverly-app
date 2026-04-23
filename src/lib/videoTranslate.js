import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { createWriteStream, existsSync } from "node:fs";
import { copyFile, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { join, dirname } from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const execFileAsync = promisify(execFile);

/** Real path to ffmpeg — avoids Turbopack turning ffmpeg-static into \\ROOT\\… */
function getFfmpegBinaryPath() {
	const fromEnv = process.env.FFMPEG_PATH;
	if (fromEnv && existsSync(fromEnv)) {
		return fromEnv;
	}
	const name = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
	const fromCwd = join(process.cwd(), "node_modules", "ffmpeg-static", name);
	if (existsSync(fromCwd)) {
		return fromCwd;
	}
	try {
		const require = createRequire(join(process.cwd(), "package.json"));
		const resolved = require("ffmpeg-static");
		if (typeof resolved === "string" && resolved && existsSync(resolved)) {
			return resolved;
		}
	} catch {
		/* ignore */
	}
	return null;
}

export function getVideoTranslateS3() {
	const bucket =
		process.env.AWS_S3_BUCKET ||
		process.env.S3_BUCKET ||
		process.env.AWS_BUCKET;
	if (!bucket) {
		throw new Error(
			"S3 bucket is not set. Add AWS_S3_BUCKET=<name> to .env (Nebius example: coverly-app-storage — the name after s3:// in aws s3 ls).",
		);
	}
	const endpoint =
		process.env.AWS_ENDPOINT_URL ||
		process.env.AWS_S3_ENDPOINT ||
		undefined;
	const accessKeyId =
		process.env.AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
	const secretAccessKey =
		process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
	if (!accessKeyId || !secretAccessKey) {
		throw new Error(
			"S3 credentials missing. Set AWS_KEY_ID + AWS_SECRET_KEY, or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (same values as in aws configure).",
		);
	}
	const client = new S3Client({
		region: process.env.AWS_REGION || "us-east-1",
		endpoint,
		credentials: { accessKeyId, secretAccessKey },
		forcePathStyle: Boolean(endpoint),
	});
	return { client, bucket };
}

export async function runFfmpeg(args) {
	const bin = getFfmpegBinaryPath();
	if (!bin) {
		throw new Error(
			"ffmpeg binary not found. Install dependencies (npm install) or set FFMPEG_PATH to your ffmpeg executable.",
		);
	}
	await execFileAsync(bin, args, { maxBuffer: 1024 * 1024 * 100 });
}

export async function downloadS3ObjectToFile(client, bucket, key, destPath) {
	const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
	await pipeline(out.Body, createWriteStream(destPath));
}

/**
 * @param {import("@aws-sdk/client-s3").S3Client} client
 * @param {string} bucket
 * @param {Iterable<string>} keys
 */
export async function deleteS3Objects(client, bucket, keys) {
	for (const key of keys) {
		if (!key || typeof key !== "string") {
			continue;
		}
		try {
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		} catch (e) {
			console.error("deleteS3Objects:", key, e);
		}
	}
}

/**
 * All object keys referenced by a video translation row (for cleanup before DB delete).
 * @param {object} row — row from getJobById
 */
export function collectVideoTranslateS3Keys(row) {
	const keys = new Set();
	if (row.videoS3Key) {
		keys.add(row.videoS3Key);
	}
	if (row.extractedAudioS3Key) {
		keys.add(row.extractedAudioS3Key);
	}
	const audio = row.audioS3Keys;
	if (audio && typeof audio === "object") {
		for (const v of Object.values(audio)) {
			if (typeof v === "string" && v) {
				keys.add(v);
			}
		}
	}
	const mux = row.muxedVideoS3Keys;
	if (mux && typeof mux === "object") {
		for (const v of Object.values(mux)) {
			if (typeof v === "string" && v) {
				keys.add(v);
			}
		}
	}
	return [...keys];
}

export async function uploadFileToS3(client, bucket, key, body, contentType) {
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function signGetUrl(client, bucket, key, expiresIn = 3600) {
	return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export function chunkTextForTts(text, maxLen = 280) {
	const cleaned = (text || "").trim();
	if (!cleaned) return [];
	const chunks = [];
	const parts = cleaned.split(/(?<=[.!?])\s+/);
	let cur = "";
	for (const piece of parts) {
		if (!piece) continue;
		if (cur.length + piece.length + (cur ? 1 : 0) <= maxLen) {
			cur = cur ? `${cur} ${piece}` : piece;
		} else {
			if (cur) chunks.push(cur);
			if (piece.length > maxLen) {
				for (let i = 0; i < piece.length; i += maxLen) {
					chunks.push(piece.slice(i, i + maxLen));
				}
				cur = "";
			} else {
				cur = piece;
			}
		}
	}
	if (cur) chunks.push(cur);
	return chunks;
}

export async function extractAudioMp3(videoPath, audioPath) {
	await runFfmpeg(["-y", "-i", videoPath, "-vn", "-acodec", "libmp3lame", "-q:a", "4", audioPath]);
}

async function normalizeWavForConcat(input, output) {
	await runFfmpeg(["-y", "-i", input, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", output]);
}

export async function concatAudioToWav(chunkPaths, outputWav) {
	if (chunkPaths.length === 0) {
		throw new Error("No audio chunks");
	}
	const dir = dirname(outputWav);
	if (chunkPaths.length === 1) {
		await normalizeWavForConcat(chunkPaths[0], outputWav);
		return;
	}
	const normalized = [];
	for (let i = 0; i < chunkPaths.length; i++) {
		const nPath = join(dir, `norm_${i}.wav`);
		await normalizeWavForConcat(chunkPaths[i], nPath);
		normalized.push(nPath);
	}
	const listPath = join(dir, "concat_list.txt");
	const lines = normalized.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n");
	await writeFile(listPath, lines, "utf8");
	await runFfmpeg([
		"-y",
		"-f",
		"concat",
		"-safe",
		"0",
		"-i",
		listPath.replace(/\\/g, "/"),
		"-c",
		"copy",
		outputWav.replace(/\\/g, "/"),
	]);
}

export async function wavToMp3(wavPath, mp3Path) {
	await runFfmpeg(["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-qscale:a", "4", mp3Path]);
}

/**
 * Join MP3 files produced in sequence (e.g. TTS chunks). Same codec from the same API is required for stream-copy concat.
 */
export async function concatMp3Files(mp3Paths, outputMp3) {
	if (mp3Paths.length === 0) {
		throw new Error("No audio chunks");
	}
	if (mp3Paths.length === 1) {
		await copyFile(mp3Paths[0], outputMp3);
		return;
	}
	const dir = dirname(outputMp3);
	const listPath = join(dir, "mp3_concat_list.txt");
	const lines = mp3Paths.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n");
	await writeFile(listPath, lines, "utf8");
	await runFfmpeg([
		"-y",
		"-f",
		"concat",
		"-safe",
		"0",
		"-i",
		listPath.replace(/\\/g, "/"),
		"-c",
		"copy",
		outputMp3.replace(/\\/g, "/"),
	]);
}

/** ffmpeg -i exits 1 while printing stream list to stderr */
async function ffmpegInspectStderr(mediaPath) {
	const bin = getFfmpegBinaryPath();
	if (!bin) {
		throw new Error(
			"ffmpeg binary not found. Install dependencies (npm install) or set FFMPEG_PATH to your ffmpeg executable.",
		);
	}
	try {
		await execFileAsync(bin, ["-hide_banner", "-i", mediaPath], { maxBuffer: 10 * 1024 * 1024 });
	} catch (e) {
		return e.stderr?.toString() || "";
	}
	return "";
}

export async function probeMediaDurationSeconds(mediaPath) {
	const stderr = await ffmpegInspectStderr(mediaPath);
	const m = /Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/.exec(stderr);
	if (!m) {
		throw new Error("Could not read media duration");
	}
	return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function ffmpegProbeHasAudio(stderr) {
	return /Audio:\s/.test(stderr);
}

const AMIX_BATCH = 12;

async function amixOneBatchMp3(inputPaths, outputMp3) {
	const args = ["-y"];
	for (const p of inputPaths) {
		args.push("-i", p);
	}
	const n = inputPaths.length;
	const mixIn = inputPaths.map((_, i) => `[${i}:a]`).join("");
	args.push(
		"-filter_complex",
		`${mixIn}amix=inputs=${n}:duration=longest:dropout_transition=0:normalize=0[out]`,
		"-map",
		"[out]",
		"-c:a",
		"libmp3lame",
		"-q:a",
		"4",
		outputMp3,
	);
	await runFfmpeg(args);
}

/**
 * Sum delayed MP3 segments (same sample layouts) into one MP3.
 * @param {string[]} inputPaths
 * @param {string} outputMp3
 * @param {string} workDir
 */
export async function amixAudioFilesToMp3(inputPaths, outputMp3, workDir) {
	if (inputPaths.length === 0) {
		throw new Error("amix: no inputs");
	}
	if (inputPaths.length === 1) {
		await copyFile(inputPaths[0], outputMp3);
		return;
	}
	let layer = [...inputPaths];
	let depth = 0;
	while (layer.length > 1) {
		const next = [];
		for (let i = 0; i < layer.length; i += AMIX_BATCH) {
			const batch = layer.slice(i, i + AMIX_BATCH);
			const out =
				batch.length === 1
					? batch[0]
					: join(workDir, `_amix_${depth}_${i}_${batch.length}.mp3`);
			if (batch.length > 1) {
				await amixOneBatchMp3(batch, out);
			}
			next.push(out);
		}
		layer = next;
		depth += 1;
	}
	await copyFile(layer[0], outputMp3);
}

export async function padMp3ToMinDuration(inputPath, outputPath, minDurationSec, sampleRate = 48000) {
	const cur = await probeMediaDurationSeconds(inputPath);
	if (cur >= minDurationSec - 0.08) {
		await copyFile(inputPath, outputPath);
		return;
	}
	const padSamples = Math.ceil((minDurationSec - cur) * sampleRate);
	await runFfmpeg([
		"-y",
		"-i",
		inputPath,
		"-af",
		`apad=pad_len=${padSamples}`,
		"-c:a",
		"libmp3lame",
		"-q:a",
		"4",
		outputPath,
	]);
}

/**
 * One MP4 with original video, original soundtrack ducked, and dubbed MP3.
 * @param {string} videoPath
 * @param {string} dubbedMp3Path
 * @param {string} outputPath
 * @param {{ originalGain?: number }} [opts]
 */
export async function muxVideoWithDuckedOriginalAndDub(videoPath, dubbedMp3Path, outputPath, opts = {}) {
	const stderr = await ffmpegInspectStderr(videoPath);
	const hasAudio = ffmpegProbeHasAudio(stderr);
	const gain = opts.originalGain ?? 0.22;
	if (hasAudio) {
		await runFfmpeg([
			"-y",
			"-i",
			videoPath,
			"-i",
			dubbedMp3Path,
			"-filter_complex",
			`[0:a]volume=${gain}[a0];[a0][1:a]amix=inputs=2:duration=first:normalize=0[aout]`,
			"-map",
			"0:v",
			"-map",
			"[aout]",
			"-c:v",
			"copy",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"-movflags",
			"+faststart",
			outputPath,
		]);
	} else {
		await runFfmpeg([
			"-y",
			"-i",
			videoPath,
			"-i",
			dubbedMp3Path,
			"-map",
			"0:v",
			"-map",
			"1:a",
			"-c:v",
			"copy",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"-shortest",
			"-movflags",
			"+faststart",
			outputPath,
		]);
	}
}
