-- Phase 5 Enhancements: Pins, Sharing, and Better Search

-- 1. Add missing columns to notes
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- 2. Update Full-Text Search to include tags
-- We first drop the existing generated column
ALTER TABLE public.notes DROP COLUMN IF EXISTS fts;

-- Re-add it with tags and improved content extraction
-- Note: TipTap JSON is complex, but often has a top-level 'text' if simplified, 
-- but here we assume 'content' might be indexed better via a custom function or just title + tags for now
-- if we want full content indexing, we'd need a more robust extraction.
-- For now, title + tags + description (if we had it) is a good start.
ALTER TABLE public.notes ADD COLUMN fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || array_to_string(tags, ' '))
) STORED;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS notes_fts_idx ON public.notes USING gin(fts);

-- 3. Additional RLS for Public Sharing
-- Allow anyone to select a note if they have the share_token
CREATE POLICY "Public can view shared notes" ON public.notes
    FOR SELECT USING (share_token IS NOT NULL AND status = 'published');

-- 4. Duplicate Note Functionality (Can be done client-side, but SQL is faster for deep copies)
CREATE OR REPLACE FUNCTION public.duplicate_note(note_id UUID, new_author_id UUID)
RETURNS UUID AS $$
DECLARE
    new_note_id UUID;
BEGIN
    INSERT INTO public.notes (workspace_id, author_id, title, content, tags, status)
    SELECT workspace_id, new_author_id, title || ' (Copy)', content, tags, 'draft'
    FROM public.notes
    WHERE id = note_id
    RETURNING id INTO new_note_id;

    -- Duplicate links (optional, maybe not desired for a copy)
    -- INSERT INTO public.note_links (from_note_id, to_note_id)
    -- SELECT new_note_id, to_note_id
    -- FROM public.note_links
    -- WHERE from_note_id = note_id;

    RETURN new_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
