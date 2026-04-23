/**
 * Map technical errors to short user-facing copy (English, matches current UI).
 * Full details stay in server logs only.
 */

const GENERIC = {
	message: "Something went wrong. Please try again in a moment.",
	code: "UNKNOWN",
};

/**
 * @param {unknown} err
 * @param {{ phase?: 'upload' | 'extract' | 'prepare' | 'synthesize' }} [ctx]
 * @returns {{ message: string, code: string }}
 */
export function toPublicError(err, ctx) {
	const raw = err instanceof Error ? err.message : String(err ?? "");
	const msg = raw || "";

	// File / validation
	if (/^No file|Missing key|Invalid or missing|Missing (jobId|text)/i.test(msg)) {
		return { message: "Request is incomplete. Reload the page and try again.", code: "VALIDATION" };
	}
	if (/^No file uploaded$/i.test(msg) || /Missing translationId/i.test(msg)) {
		return { message: "Upload did not go through. Please choose the video again.", code: "UPLOAD" };
	}

	// S3 / credentials
	if (/S3|AWS|NoSuchKey|not set|credentials missing|AccessDenied|getaddrinfo|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
		if (ctx?.phase === "upload" || ctx?.phase === "extract") {
			return { message: "We could not use storage for this step. Check your connection and try again.", code: "STORAGE" };
		}
		return { message: "We could not access your file in storage. Try uploading again.", code: "STORAGE" };
	}

	// Empty speech
	if (/transcription is empty|empty.*speech|no speech/i.test(msg)) {
		return { message: "No speech was detected. Try a video with clear spoken audio.", code: "EMPTY_SPEECH" };
	}

	// Translation / Gemini
	if (/GEMINI|generateContent|translation missing|invalid for/i.test(msg)) {
		return { message: "Translation failed. Please try again.", code: "TRANSLATION" };
	}

	// TTS / Fal / prepare pipeline
	if (/FAL_KEY|FAL|fal|whisper|TTS|subscribe|audio url/i.test(msg)) {
		if (/timeout|ETIMEDOUT|abort|rate|429/i.test(msg)) {
			return { message: "The AI service is busy. Please wait a bit and try again.", code: "AI_BUSY" };
		}
		if (ctx?.phase === "prepare") {
			return { message: "We could not transcribe this audio. Try a shorter clip or different format.", code: "SPEECH" };
		}
		if (ctx?.phase === "synthesize") {
			return { message: "We could not generate this voiceover. Please retry this language.", code: "VOICE" };
		}
		return { message: "Audio processing failed. Please try again.", code: "AI_AUDIO" };
	}

	// ffmpeg
	if (/ffmpeg|libmp3lame|No such file or directory.*ffmpeg/i.test(msg)) {
		return { message: "The server could not process this video format. Try MP4 or WebM.", code: "ENCODE" };
	}

	return GENERIC;
}
