-- Speaker diarization results and per-speaker voice mapping.
ALTER TABLE video_translations
	ADD COLUMN IF NOT EXISTS detected_speakers JSONB,
	ADD COLUMN IF NOT EXISTS speaker_voices JSONB;
