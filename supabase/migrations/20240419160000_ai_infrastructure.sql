-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Usage Logging Table
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    feature TEXT NOT NULL, -- 'chat', 'summarize', 'note_draft', etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on ai_requests
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own requests
CREATE POLICY "Users can view their own AI requests"
ON ai_requests FOR SELECT
USING (auth.uid() = user_id);

-- Add embedding columns to core tables
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Semantic search function for messages
CREATE OR REPLACE FUNCTION match_messages(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    p_workspace_id UUID
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    channel_id UUID,
    user_id UUID,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.channel_id,
        m.user_id,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM messages m
    WHERE m.workspace_id = p_workspace_id
      AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Semantic search function for notes
CREATE OR REPLACE FUNCTION match_notes(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    p_workspace_id UUID
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content_text TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.content::text as content_text,
        1 - (n.embedding <=> query_embedding) AS similarity
    FROM notes n
    WHERE n.workspace_id = p_workspace_id
      AND 1 - (n.embedding <=> query_embedding) > match_threshold
    ORDER BY n.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Semantic search function for snippets
CREATE OR REPLACE FUNCTION match_snippets(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    p_workspace_id UUID
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    code TEXT,
    language TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.code,
        s.language,
        1 - (s.embedding <=> query_embedding) AS similarity
    FROM snippets s
    WHERE s.workspace_id = p_workspace_id
      AND 1 - (s.embedding <=> query_embedding) > match_threshold
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Simple rate limiting function using the logging table
-- Returns true if allowed, false if limited
CREATE OR REPLACE FUNCTION check_ai_rate_limit(
    p_user_id UUID,
    p_window_minutes int DEFAULT 1,
    p_max_requests int DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    request_count int;
BEGIN
    SELECT count(*)
    INTO request_count
    FROM ai_requests
    WHERE user_id = p_user_id
      AND created_at > now() - (p_window_minutes || ' minutes')::interval;

    RETURN request_count < p_max_requests;
END;
$$;
