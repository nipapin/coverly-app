-- Editor workflow sessions (replaces ./sessions/*.json on disk).
CREATE TABLE IF NOT EXISTS editor_sessions (
	id UUID PRIMARY KEY,
	payload JSONB NOT NULL,
	user_id TEXT,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editor_sessions_user_updated
	ON editor_sessions (user_id, updated_at DESC);
