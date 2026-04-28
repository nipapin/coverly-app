export const FAL_DUBBING_PROFILES = {
	mvp: {
		id: "mvp",
		label: "MVP",
		asr: {
			model: "fal-ai/whisper",
			input: {
				task: "transcribe",
				chunk_level: "segment",
				diarize: true,
				batch_size: 64,
			},
			pricing: { unit: "compute-second", usd: 0 },
		},
		translation: {
			model: "fal-ai/any-llm",
			modelName: "google/gemini-2.5-flash-lite",
			pricing: { unit: "request", usd: 0.001 },
		},
		tts: {
			model: "fal-ai/lux-tts",
			pricing: { unit: "1k-char", usd: 0.0014 },
		},
		emotion: {
			model: "xai/tts/v1",
			pricing: { unit: "1k-char", usd: 0.0042 },
			mode: "scene-only",
		},
		lipsync: {
			model: "fal-ai/sync-lipsync",
			pricing: { unit: "minute-video", usd: 0.7 },
			enabledByDefault: false,
		},
	},
	balanced: {
		id: "balanced",
		label: "Balanced",
		asr: {
			model: "fal-ai/whisper",
			input: {
				task: "transcribe",
				chunk_level: "segment",
				diarize: true,
				batch_size: 64,
			},
			pricing: { unit: "compute-second", usd: 0 },
		},
		translation: {
			model: "fal-ai/any-llm",
			modelName: "google/gemini-2.5-flash-lite",
			pricing: { unit: "request", usd: 0.001 },
		},
		voiceClone: {
			model: "fal-ai/qwen-3-tts/clone-voice/0.6b",
			pricing: { unit: "minute-audio", usd: 0.0007 },
		},
		tts: {
			model: "fal-ai/qwen-3-tts/text-to-speech/0.6b",
			pricing: { unit: "1k-char", usd: 0.07 },
		},
		emotion: {
			model: "xai/tts/v1",
			pricing: { unit: "1k-char", usd: 0.0042 },
			mode: "scene-only",
		},
		lipsync: {
			model: "fal-ai/sync-lipsync",
			pricing: { unit: "minute-video", usd: 0.7 },
			enabledByDefault: false,
		},
	},
	highQuality: {
		id: "highQuality",
		label: "High Quality",
		asr: {
			model: "fal-ai/whisper",
			input: {
				task: "transcribe",
				chunk_level: "segment",
				diarize: true,
				batch_size: 64,
			},
			pricing: { unit: "compute-second", usd: 0 },
		},
		translation: {
			model: "fal-ai/any-llm",
			modelName: "openai/gpt-5-chat",
			pricing: { unit: "request", usd: 0.01 },
		},
		voiceClone: {
			model: "fal-ai/minimax/voice-clone",
			pricing: { unit: "clone-request", usd: 1.5 },
		},
		tts: {
			model: "fal-ai/elevenlabs/tts/turbo-v2.5",
			pricing: { unit: "1k-char", usd: 0.05 },
		},
		emotion: {
			model: "fal-ai/dia-tts",
			pricing: { unit: "1k-char", usd: 0.04 },
			mode: "full",
		},
		lipsync: {
			model: "fal-ai/sync-lipsync/v2",
			pricing: { unit: "minute-video", usd: 3 },
			enabledByDefault: true,
		},
	},
};

export const LOCKED_DUBBING_PROFILE = "balanced";
