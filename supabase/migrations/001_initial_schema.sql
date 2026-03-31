-- DocLear initial schema with Row Level Security
-- All tables enforce RLS so users can only access their own data.

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  country TEXT,
  city TEXT,
  status TEXT,
  plan TEXT DEFAULT 'free',
  trial_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_delete ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL DEFAULT 'Untitled',
  category TEXT NOT NULL DEFAULT 'other',
  doc_type TEXT NOT NULL DEFAULT 'other',
  doc_type_label TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  summary TEXT,
  what_is_this TEXT NOT NULL DEFAULT '',
  what_it_says TEXT NOT NULL DEFAULT '',
  what_to_do TEXT[] DEFAULT '{}',
  deadline TEXT,
  deadline_description TEXT,
  urgency TEXT NOT NULL DEFAULT 'none',
  amounts TEXT[] DEFAULT '{}',
  health_score INTEGER,
  health_score_explanation TEXT,
  risk_flags JSONB DEFAULT '[]',
  positive_points JSONB DEFAULT '[]',
  key_facts TEXT[] DEFAULT '{}',
  suggested_questions TEXT[] DEFAULT '{}',
  file_url TEXT,
  image_url TEXT,
  file_type TEXT,
  page_count INTEGER,
  raw_text TEXT,
  page_texts JSONB,
  language TEXT NOT NULL DEFAULT 'fr',
  recommendations JSONB DEFAULT '[]',
  entities JSONB,
  key_entities JSONB,
  specialist_type TEXT,
  specialist_recommendation TEXT
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY documents_insert ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY documents_update ON documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY documents_delete ON documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_select ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_messages_update ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_messages_delete ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_document ON chat_messages(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- ============================================================
-- AI REPORTS (user-reported bad AI responses)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  message_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_reports_select ON ai_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY ai_reports_insert ON ai_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users should not update or delete reports
-- Only admins (via service role) can manage reports
