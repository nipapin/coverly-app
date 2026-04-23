-- Timed transcript segments (Whisper) + per-language muxed MP4 outputs.
ALTER TABLE video_translations
	ADD COLUMN IF NOT EXISTS transcript_segments JSONB,
	ADD COLUMN IF NOT EXISTS muxed_video_s3_keys JSONB NOT NULL DEFAULT '{}'::jsonb;
