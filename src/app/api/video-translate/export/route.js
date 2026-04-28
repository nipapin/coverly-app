import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import {
	downloadS3ObjectToFile,
	getVideoTranslateS3,
	muxVideoWithAccompanimentAndDub,
	muxVideoWithDuckedOriginalAndDub,
	padMp3ToMinDuration,
	probeMediaDurationSeconds,
	signGetUrl,
	uploadFileToS3,
} from "@/lib/videoTranslate";
import { getJobById, setMuxedVideoS3KeyForLang } from "@/lib/videoTranslationRepo";
import { SUPPORTED_LANGS } from "@/lib/videoTranslateAi";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";
export const maxDuration = 600;

const URL_TTL = 60 * 60 * 24 * 7;

function originalGainFromEnv() {
	const n = Number(process.env.VIDEO_TRANSLATE_ORIGINAL_GAIN);
	if (Number.isFinite(n) && n >= 0 && n <= 1) {
		return n;
	}
	return 0.22;
}

export async function POST(req) {
	try {
		const body = await req.json();
		const translationId = body?.translationId;
		const lang = body?.lang;
		const force = Boolean(body?.force);

		if (!translationId || typeof translationId !== "string") {
			return Response.json(
				{ error: "Request is incomplete. Reload the page and try again.", code: "VALIDATION" },
				{ status: 400 },
			);
		}
		if (!lang || typeof lang !== "string" || !SUPPORTED_LANGS.includes(lang)) {
			return Response.json({ error: "Invalid language", code: "VALIDATION" }, { status: 400 });
		}

		const row = await getJobById(translationId);
		if (!row) {
			return Response.json(
				{ error: "This translation was not found.", code: "NOT_FOUND" },
				{ status: 404 },
			);
		}
		const videoKey = row.videoS3Key;
		const accompanimentKey = row.accompanimentS3Key;
		const rawKeys = row.audioS3Keys;
		const audioKeys = typeof rawKeys === "object" && rawKeys !== null ? rawKeys : {};
		const audioKey = audioKeys[lang];
		if (!videoKey || !audioKey) {
			return Response.json(
				{ error: "Video or voiceover for this language is not ready yet.", code: "VALIDATION" },
				{ status: 400 },
			);
		}

		const { client, bucket } = getVideoTranslateS3();
		const objectKey = `video-translate/muxed/${row.jobId}/${lang}.mp4`;

		if (!force) {
			try {
				await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
				const videoUrl = await signGetUrl(client, bucket, objectKey, URL_TTL);
				if (row.muxedVideoS3Keys?.[lang] !== objectKey) {
					await setMuxedVideoS3KeyForLang(translationId, lang, objectKey);
				}
				return Response.json({ videoUrl, objectKey, cached: true });
			} catch {
				/* build below */
			}
		}

		const workDir = await mkdtemp(join(tmpdir(), "video-translate-export-"));
		try {
			const videoPath = join(workDir, "source_video");
			const dubPath = join(workDir, "dub.mp3");
			const dubPadded = join(workDir, "dub_padded.mp3");
			const accompanimentPath = join(workDir, "accompaniment.mp3");
			const accompanimentPadded = join(workDir, "accompaniment_padded.mp3");
			const outPath = join(workDir, "out.mp4");

			await downloadS3ObjectToFile(client, bucket, videoKey, videoPath);
			await downloadS3ObjectToFile(client, bucket, audioKey, dubPath);
			if (accompanimentKey) {
				await downloadS3ObjectToFile(client, bucket, accompanimentKey, accompanimentPath);
			}

			const videoDur = await probeMediaDurationSeconds(videoPath);
			await padMp3ToMinDuration(dubPath, dubPadded, videoDur);
			if (!accompanimentKey) {
				await muxVideoWithDuckedOriginalAndDub(videoPath, dubPadded, outPath, {
					originalGain: originalGainFromEnv(),
				});
			} else {
				await padMp3ToMinDuration(accompanimentPath, accompanimentPadded, videoDur);
				await muxVideoWithAccompanimentAndDub(
					videoPath,
					accompanimentPadded,
					dubPadded,
					outPath,
				);
			}

			const buf = await readFile(outPath);
			await uploadFileToS3(client, bucket, objectKey, buf, "video/mp4");
			await setMuxedVideoS3KeyForLang(translationId, lang, objectKey);
			const videoUrl = await signGetUrl(client, bucket, objectKey, URL_TTL);
			return Response.json({ videoUrl, objectKey, cached: false });
		} finally {
			await rm(workDir, { recursive: true, force: true }).catch(() => {});
		}
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err, { phase: "export" });
		return Response.json({ error: message, code }, { status: 500 });
	}
}
