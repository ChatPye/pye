-- Run against Aurora PostgreSQL (DATABASE_URL) to enable persistent video notes.
CREATE TABLE IF NOT EXISTS video_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_clerk_id VARCHAR(255) NOT NULL,
  external_video_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_notes_owner_video_idx
  ON video_notes (owner_clerk_id, external_video_id);
