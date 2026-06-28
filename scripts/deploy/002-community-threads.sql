-- Community discussion threads (replaces Mongo/in-memory)
CREATE TABLE IF NOT EXISTS community_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_video_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  author_clerk_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  replies JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_threads_video_idx
  ON community_threads (external_video_id);
