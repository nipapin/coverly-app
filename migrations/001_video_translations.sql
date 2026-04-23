-- Video translate jobs: shareable pages and S3 key references.
CREATE TABLE IF NOT EXISTS video_translations (
	id UUID PRIMARY KEY,
	job_id TEXT NOT NULL UNIQUE,
	title TEXT,
	original_filename TEXT NOT NULL DEFAULT 'video',
	video_s3_key TEXT,
	transcript TEXT,
	translations JSONB,
	audio_s3_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
	status TEXT NOT NULL DEFAULT 'pending_upload',
	last_error_code TEXT,
	last_error_message TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_translations_created
	ON video_translations (created_at DESC);
