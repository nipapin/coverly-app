-- Source separation artifacts and speaker clone embeddings.
ALTER TABLE video_translations
	ADD COLUMN IF NOT EXISTS vocals_s3_key TEXT,
	ADD COLUMN IF NOT EXISTS accompaniment_s3_key TEXT,
	ADD COLUMN IF NOT EXISTS speaker_embeddings JSONB;

