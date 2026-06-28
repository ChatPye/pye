-- ChatPye Aurora migration 001 — run once against DATABASE_URL
-- Usage: npm run db:migrate

-- Video notes (from prior migration)
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

-- Pods
CREATE TABLE IF NOT EXISTS pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) NOT NULL UNIQUE,
  owner_clerk_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{"isPublic":false,"allowInvites":true,"maxMembers":50}',
  metadata JSONB DEFAULT '{}',
  videos JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  resources JSONB DEFAULT '[]',
  rewards JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pods_owner_idx ON pods (owner_clerk_id);

CREATE TABLE IF NOT EXISTS pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  clerk_user_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pod_id, clerk_user_id)
);
CREATE INDEX IF NOT EXISTS pod_members_user_idx ON pod_members (clerk_user_id);

CREATE TABLE IF NOT EXISTS pod_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  invited_by_clerk_id VARCHAR(255) NOT NULL,
  invited_email VARCHAR(255),
  invited_clerk_id VARCHAR(255),
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pod_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id VARCHAR(100) NOT NULL UNIQUE,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  owner_clerk_id VARCHAR(255),
  access VARCHAR(20) NOT NULL DEFAULT 'public',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat / response shares
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id VARCHAR(100) NOT NULL UNIQUE,
  tenant_id VARCHAR(255),
  owner_clerk_id VARCHAR(255) NOT NULL,
  external_video_id VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'response',
  content TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS share_links_owner_idx ON share_links (owner_clerk_id);

-- XP
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_level_xp INTEGER NOT NULL DEFAULT 0,
  next_level_xp INTEGER NOT NULL DEFAULT 100,
  badges JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  streak INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  xp_earned INTEGER NOT NULL,
  external_video_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS xp_activities_user_idx ON xp_activities (clerk_user_id);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) NOT NULL,
  external_video_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  messages JSONB DEFAULT '[]',
  video_metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, external_video_id, session_id)
);
CREATE INDEX IF NOT EXISTS chat_sessions_user_video_idx
  ON chat_sessions (clerk_user_id, external_video_id);

-- Quiz & flashcards (Talk-to-Videos pattern)
CREATE TABLE IF NOT EXISTS video_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_video_id VARCHAR(255) NOT NULL,
  owner_clerk_id VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS video_quizzes_video_owner_idx
  ON video_quizzes (external_video_id, owner_clerk_id);

CREATE TABLE IF NOT EXISTS video_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_video_id VARCHAR(255) NOT NULL,
  owner_clerk_id VARCHAR(255) NOT NULL,
  cards JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS video_flashcards_video_owner_idx
  ON video_flashcards (external_video_id, owner_clerk_id);
