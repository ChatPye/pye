-- Bookmarks + learner competency profiles (Phase B foundation)
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_clerk_id VARCHAR(255) NOT NULL,
  external_video_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  timestamp_seconds INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  category VARCHAR(50) DEFAULT 'general',
  tags JSONB DEFAULT '[]',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  thumbnail_url TEXT,
  video_title VARCHAR(500),
  channel_name VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bookmarks_owner_idx ON bookmarks (owner_clerk_id);
CREATE INDEX IF NOT EXISTS bookmarks_video_idx ON bookmarks (owner_clerk_id, external_video_id);

CREATE TABLE IF NOT EXISTS user_public_profiles (
  owner_clerk_id VARCHAR(255) PRIMARY KEY,
  public_slug VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  title VARCHAR(255),
  headline TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learner_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_clerk_id VARCHAR(255) NOT NULL,
  competency_name VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL DEFAULT 'foundational',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  evidence JSONB DEFAULT '[]',
  source_video_id VARCHAR(255),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_clerk_id, competency_name, source_video_id)
);
CREATE INDEX IF NOT EXISTS learner_competencies_owner_idx ON learner_competencies (owner_clerk_id);
