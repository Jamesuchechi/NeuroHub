-- Migration: Robust Note Search
-- Description: Implement recursive text extraction for TipTap JSONB and update search index.

-- 1. Function to extract plain text from TipTap JSONB
CREATE OR REPLACE FUNCTION public.extract_text_from_tiptap(content JSONB) 
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    item JSONB;
BEGIN
    IF content IS NULL THEN
        RETURN '';
    END IF;

    -- If it's a text node, return the text
    IF content->>'type' = 'text' THEN
        RETURN content->>'text';
    END IF;

    -- Handle hard breaks
    IF content->>'type' = 'hardBreak' THEN
        RETURN E'\n';
    END IF;

    -- If it has content, recurse
    IF content ? 'content' AND jsonb_typeof(content->'content') = 'array' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(content->'content') LOOP
            result := result || ' ' || public.extract_text_from_tiptap(item);
        END LOOP;
    END IF;

    RETURN trim(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update the Full-Text Search column
-- Use a standard column + trigger instead of a generated column to avoid immutability errors
ALTER TABLE public.notes DROP COLUMN IF EXISTS fts;
ALTER TABLE public.notes ADD COLUMN fts tsvector;

-- 3. Create a trigger function to update the FTS column
CREATE OR REPLACE FUNCTION public.notes_update_fts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fts := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(array_to_string(NEW.tags, ' '), '') || ' ' || 
        COALESCE(public.extract_text_from_tiptap(NEW.content), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS tr_notes_update_fts ON public.notes;
CREATE TRIGGER tr_notes_update_fts
    BEFORE INSERT OR UPDATE OF title, tags, content ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.notes_update_fts();

-- 5. Backfill existing data
UPDATE public.notes SET fts = to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(array_to_string(tags, ' '), '') || ' ' || 
    COALESCE(public.extract_text_from_tiptap(content), '')
);

-- 6. Recreate the index
CREATE INDEX IF NOT EXISTS notes_fts_idx ON public.notes USING gin(fts);
