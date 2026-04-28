import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";

/** @typedef {'pending_upload' | 'uploaded' | 'audio_ready' | 'transcribed' | 'complete' | 'error'} VtStatus */

/**
 * @returns {Promise<{ id: string, jobId: string }>}
 */
export async function createJob({ originalFilename = "video" } = {}) {
	const pool = getPool();
	const id = randomUUID();
	const jobId = randomUUID();
	await pool.query(
		`INSERT INTO video_translations (id, job_id, original_filename, status)
     VALUES ($1, $2, $3, 'pending_upload')`,
		[id, jobId, String(originalFilename).slice(0, 512) || "video"],
	);
	return { id, jobId };
}

/**
 * @param {string} id
 */
export async function getJobById(id) {
	const pool = getPool();
	const { rows } = await pool.query(
		`SELECT id, job_id AS "jobId", title, original_filename AS "originalFilename",
        video_s3_key AS "videoS3Key",
        extracted_audio_s3_key AS "extractedAudioS3Key",
        vocals_s3_key AS "vocalsS3Key",
        accompaniment_s3_key AS "accompanimentS3Key",
        transcript, translations, transcript_segments AS "transcriptSegments",
        audio_s3_keys AS "audioS3Keys",
        muxed_video_s3_keys AS "muxedVideoS3Keys", status,
        detected_speakers AS "detectedSpeakers",
        speaker_embeddings AS "speakerEmbeddings",
        speaker_voices AS "speakerVoices",
        last_error_code AS "lastErrorCode", last_error_message AS "lastErrorMessage",
        created_at AS "createdAt", updated_at AS "updatedAt"
     FROM video_translations WHERE id = $1::uuid`,
		[id],
	);
	return rows[0] ?? null;
}

export async function listJobs(limit = 50) {
	const pool = getPool();
	const { rows } = await pool.query(
		`SELECT id, job_id AS "jobId", title, original_filename AS "originalFilename", status, created_at AS "createdAt"
     FROM video_translations
     ORDER BY created_at DESC
     LIMIT $1`,
		[Math.min(100, Math.max(1, limit))],
	);
	return rows;
}

/**
 * @param {string} id
 * @returns {Promise<boolean>} true if a row was deleted
 */
export async function deleteJobById(id) {
	const pool = getPool();
	const { rowCount } = await pool.query(`DELETE FROM video_translations WHERE id = $1::uuid`, [id]);
	return rowCount > 0;
}

export async function setUploadComplete(id, { videoS3Key, originalFilename, status = "uploaded" }) {
	const pool = getPool();
	await pool.query(
		`UPDATE video_translations
     SET video_s3_key = $2,
         original_filename = COALESCE($3, original_filename),
         status = $4,
         extracted_audio_s3_key = NULL,
         vocals_s3_key = NULL,
         accompaniment_s3_key = NULL,
         speaker_embeddings = NULL,
         last_error_code = NULL,
         last_error_message = NULL,
         updated_at = now()
     WHERE id = $1::uuid`,
		[id, videoS3Key, originalFilename ?? null, status],
	);
}

/**
 * After ffmpeg: extracted MP3 in S3, ready for Fal (Whisper) + downstream.
 */
export async function setAudioExtracted(id, { extractedAudioS3Key, status = "audio_ready" }) {
	const pool = getPool();
	await pool.query(
		`UPDATE video_translations
     SET extracted_audio_s3_key = $2,
         vocals_s3_key = NULL,
         accompaniment_s3_key = NULL,
         speaker_embeddings = NULL,
         status = $3,
         last_error_code = NULL,
         last_error_message = NULL,
         updated_at = now()
     WHERE id = $1::uuid`,
		[id, extractedAudioS3Key, status],
	);
}

export async function setPrepareResult(
	id,
	{
		transcript,
		translations,
		transcriptSegments = null,
		detectedSpeakers = null,
		speakerEmbeddings = null,
		vocalsS3Key = null,
		accompanimentS3Key = null,
		status = "transcribed",
	},
) {
	const pool = getPool();
	await pool.query(
		`UPDATE video_translations
     SET transcript = $2,
         translations = $3::jsonb,
         status = $4,
         transcript_segments = $5::jsonb,
         detected_speakers = $6::jsonb,
         speaker_embeddings = $7::jsonb,
         vocals_s3_key = $8,
         accompaniment_s3_key = $9,
         last_error_code = NULL,
         last_error_message = NULL,
         updated_at = now()
     WHERE id = $1::uuid`,
		[
			id,
			transcript,
			JSON.stringify(translations),
			status,
			transcriptSegments == null ? null : JSON.stringify(transcriptSegments),
			detectedSpeakers == null ? null : JSON.stringify(detectedSpeakers),
			speakerEmbeddings == null ? null : JSON.stringify(speakerEmbeddings),
			vocalsS3Key,
			accompanimentS3Key,
		],
	);
}

/**
 * Persist the speaker → voice mapping chosen by the user.
 * @param {string} id
 * @param {Record<string, string>} speakerVoices
 */
export async function setSpeakerVoices(id, speakerVoices) {
	const pool = getPool();
	await pool.query(
		`UPDATE video_translations SET speaker_voices = $2::jsonb, updated_at = now() WHERE id = $1::uuid`,
		[id, JSON.stringify(speakerVoices)],
	);
}

/**
 * Merges one language output key into audio_s3_keys. Sets status to complete when all four exist.
 * @param {string} id
 * @param {string} lang
 * @param {string} objectKey
 */
export async function setAudioS3KeyForLang(id, lang, objectKey) {
	const pool = getPool();
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const { rows } = await client.query(
			`SELECT audio_s3_keys, translations, muxed_video_s3_keys
       FROM video_translations WHERE id = $1::uuid FOR UPDATE`,
			[id],
		);
		if (!rows.length) {
			throw new Error("Job not found");
		}
		const rawKeys = rows[0].audio_s3_keys;
		/** @type {Record<string, string>} */
		const keys = typeof rawKeys === "object" && rawKeys !== null ? { ...rawKeys } : {};
		keys[lang] = objectKey;
		const translations = rows[0].translations;
		const langs =
			translations && typeof translations === "object"
				? Object.keys(translations)
				: ["en", "de", "it", "es"];
		const allDone = langs.length > 0 && langs.every((k) => keys[k]);
		const status = allDone ? "complete" : "transcribed";
		const rawMuxed = rows[0].muxed_video_s3_keys;
		const muxed = typeof rawMuxed === "object" && rawMuxed !== null ? { ...rawMuxed } : {};
		delete muxed[lang];
		await client.query(
			`UPDATE video_translations
       SET audio_s3_keys = $2::jsonb,
           muxed_video_s3_keys = $4::jsonb,
           status = $3,
           last_error_code = NULL,
           last_error_message = NULL,
           updated_at = now()
       WHERE id = $1::uuid`,
			[id, JSON.stringify(keys), status, JSON.stringify(muxed)],
		);
		await client.query("COMMIT");
	} catch (e) {
		await client.query("ROLLBACK");
		throw e;
	} finally {
		client.release();
	}
}

/**
 * @param {string} id
 * @param {string} lang
 * @param {string} objectKey
 */
export async function setMuxedVideoS3KeyForLang(id, lang, objectKey) {
	const pool = getPool();
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const { rows } = await client.query(
			`SELECT muxed_video_s3_keys FROM video_translations WHERE id = $1::uuid FOR UPDATE`,
			[id],
		);
		if (!rows.length) {
			throw new Error("Job not found");
		}
		const raw = rows[0].muxed_video_s3_keys;
		/** @type {Record<string, string>} */
		const keys = typeof raw === "object" && raw !== null ? { ...raw } : {};
		keys[lang] = objectKey;
		await client.query(
			`UPDATE video_translations SET muxed_video_s3_keys = $2::jsonb, updated_at = now() WHERE id = $1::uuid`,
			[id, JSON.stringify(keys)],
		);
		await client.query("COMMIT");
	} catch (e) {
		await client.query("ROLLBACK");
		throw e;
	} finally {
		client.release();
	}
}

export async function setJobError(id, { code, message }) {
	const pool = getPool();
	await pool.query(
		`UPDATE video_translations
     SET status = 'error',
         last_error_code = $2,
         last_error_message = $3,
         updated_at = now()
     WHERE id = $1::uuid`,
		[id, code, message],
	);
}

/**
 * After upload/extract/prepare failed, status is `error`. Restore a resumable status from persisted fields.
 * @param {string} id
 */
export async function restoreJobAfterError(id) {
	const row = await getJobById(id);
	if (!row || row.status !== "error") {
		return row;
	}

	/** @type {VtStatus} */
	let newStatus = "pending_upload";
	if (row.videoS3Key) {
		if (row.extractedAudioS3Key) {
			if (row.transcript) {
				const translations = row.translations;
				const langs =
					translations && typeof translations === "object"
						? Object.keys(translations)
						: ["en", "de", "it", "es"];
				const rawKeys = row.audioS3Keys;
				const keys = typeof rawKeys === "object" && rawKeys !== null ? rawKeys : {};
				const allDone = langs.length > 0 && langs.every((k) => keys[k]);
				newStatus = allDone ? "complete" : "transcribed";
			} else {
				newStatus = "audio_ready";
			}
		} else {
			newStatus = "uploaded";
		}
	}

	const pool = getPool();
	await pool.query(
		`UPDATE video_translations
     SET status = $2,
         last_error_code = NULL,
         last_error_message = NULL,
         updated_at = now()
     WHERE id = $1::uuid AND status = 'error'`,
		[id, newStatus],
	);
	return getJobById(id);
}
