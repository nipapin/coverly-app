ALTER TABLE video_translations
	ADD COLUMN IF NOT EXISTS extracted_audio_s3_key TEXT;

COMMENT ON COLUMN video_translations.extracted_audio_s3_key IS 'MP3 extracted from the uploaded video, stored in S3 before Fal.ai.';
