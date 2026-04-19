-- Migration: Phase 8 Search & Discovery
-- Description: Implement Full-Text Search for messages and unified search RPC for workspace-wide discovery.

-- 1. Add FTS to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS fts tsvector;

-- Create trigger function for message FTS
CREATE OR REPLACE FUNCTION public.messages_update_fts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fts := to_tsvector('english', NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to messages table
DROP TRIGGER IF EXISTS tr_messages_update_fts ON public.messages;
CREATE TRIGGER tr_messages_update_fts
    BEFORE INSERT OR UPDATE OF content ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.messages_update_fts();

-- Backfill existing messages with FTS data
UPDATE public.messages SET fts = to_tsvector('english', content) WHERE fts IS NULL;

-- Create GIN index for fast keyword search on messages
CREATE INDEX IF NOT EXISTS messages_fts_idx ON public.messages USING gin(fts);

-- 2. Unified Search RPC
-- Provides grouped search across messages, notes, and snippets with highlighting and ranking.
CREATE OR REPLACE FUNCTION search_workspace(
  p_workspace_id UUID,
  p_query TEXT,
  p_type TEXT DEFAULT 'all',
  p_author_id UUID DEFAULT NULL,
  p_channel_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  result_type TEXT,
  title TEXT,
  preview TEXT,
  author_name TEXT,
  author_avatar TEXT,
  workspace_name TEXT,
  channel_name TEXT,
  channel_id UUID,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
DECLARE
  search_query tsquery;
BEGIN
  -- Validate query
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  -- Convert query to websearch format (supports quotes, minus for exclusion)
  search_query := websearch_to_tsquery('english', p_query);

  RETURN QUERY
  (
    -- Messages
    SELECT 
      m.id,
      'message'::TEXT AS result_type,
      c.name::TEXT AS title,
      ts_headline('english', m.content, search_query, 'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15')::TEXT AS preview,
      p.username::TEXT AS author_name,
      p.avatar_url::TEXT AS author_avatar,
      w.name::TEXT AS workspace_name,
      c.name::TEXT AS channel_name,
      m.channel_id,
      m.created_at,
      ts_rank(m.fts, search_query) AS rank
    FROM public.messages m
    JOIN public.profiles p ON m.user_id = p.id
    JOIN public.channels c ON m.channel_id = c.id
    JOIN public.workspaces w ON c.workspace_id = w.id
    WHERE w.id = p_workspace_id
      AND m.deleted_at IS NULL
      AND m.fts @@ search_query
      AND (p_type = 'all' OR p_type = 'message')
      AND (p_author_id IS NULL OR m.user_id = p_author_id)
      AND (p_channel_id IS NULL OR m.channel_id = p_channel_id)

    UNION ALL

    -- Notes
    SELECT 
      n.id,
      'note'::TEXT AS result_type,
      n.title::TEXT AS title,
      ts_headline('english', public.extract_text_from_tiptap(n.content), search_query, 'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15')::TEXT AS preview,
      p.username::TEXT AS author_name,
      p.avatar_url::TEXT AS author_avatar,
      w.name::TEXT AS workspace_name,
      NULL::TEXT AS channel_name,
      NULL::UUID AS channel_id,
      n.created_at,
      ts_rank(n.fts, search_query) AS rank
    FROM public.notes n
    JOIN public.profiles p ON n.author_id = p.id
    JOIN public.workspaces w ON n.workspace_id = w.id
    WHERE w.id = p_workspace_id
      AND n.fts @@ search_query
      AND (p_type = 'all' OR p_type = 'note')
      AND (p_author_id IS NULL OR n.author_id = p_author_id)

    UNION ALL

    -- Snippets
    SELECT 
      s.id,
      'snippet'::TEXT AS result_type,
      s.title::TEXT AS title,
      ts_headline('english', coalesce(s.description, '') || ' ' || s.code, search_query, 'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15')::TEXT AS preview,
      p.username::TEXT AS author_name,
      p.avatar_url::TEXT AS author_avatar,
      w.name::TEXT AS workspace_name,
      NULL::TEXT AS channel_name,
      NULL::UUID AS channel_id,
      s.created_at,
      ts_rank(s.fts, search_query) AS rank
    FROM public.snippets s
    JOIN public.profiles p ON s.author_id = p.id
    JOIN public.workspaces w ON s.workspace_id = w.id
    WHERE w.id = p_workspace_id
      AND s.fts @@ search_query
      AND (p_type = 'all' OR p_type = 'snippet')
      AND (p_author_id IS NULL OR s.author_id = p_author_id)
  )
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
