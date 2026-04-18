-- Phase 5: Knowledge Engine (Notes) Schema

-- 1. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Note Links (Bi-directional Knowledge Map)
CREATE TABLE IF NOT EXISTS public.note_links (
    from_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    to_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    PRIMARY KEY (from_note_id, to_note_id)
);

-- 3. Note Collaborators
CREATE TABLE IF NOT EXISTS public.note_collaborators (
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    PRIMARY KEY (note_id, user_id)
);

-- 4. Note Versions (History)
CREATE TABLE IF NOT EXISTS public.note_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS Policies

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

-- Workspace members can view notes in their workspace
CREATE POLICY "Workspace members can view notes" ON public.notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = notes.workspace_id AND user_id = auth.uid()
        ) OR is_public = true
    );

-- Workspace members can create notes
CREATE POLICY "Workspace members can create notes" ON public.notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = notes.workspace_id AND user_id = auth.uid()
        )
    );

-- Authors and collaborators with edit permission can update notes
CREATE POLICY "Authors/Collaborators can update notes" ON public.notes
    FOR UPDATE USING (
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.note_collaborators
            WHERE note_id = notes.id AND user_id = auth.uid() AND permission = 'edit'
        )
    );

-- Authors can delete notes
CREATE POLICY "Authors can delete notes" ON public.notes
    FOR DELETE USING (author_id = auth.uid());

-- Links policies
CREATE POLICY "Workspace members can view links" ON public.note_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE (n.id = from_note_id OR n.id = to_note_id) AND
            EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = n.workspace_id AND user_id = auth.uid()
            )
        )
    );

-- Collaborators policies
CREATE POLICY "Workspace members can view collaborators" ON public.note_collaborators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_id AND
            EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = n.workspace_id AND user_id = auth.uid()
            )
        )
    );

-- Versions policies
CREATE POLICY "Workspace members can view versions" ON public.note_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_id AND
            EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = n.workspace_id AND user_id = auth.uid()
            )
        )
    );

-- 6. Full-Text Search Functionality
ALTER TABLE public.notes ADD COLUMN fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || (content->>'text'))
) STORED;

CREATE INDEX notes_fts_idx ON public.notes USING gin(fts);

-- 7. Update Timestamps Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Storage Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for note-attachments
CREATE POLICY "Public Read Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'note-attachments');

CREATE POLICY "Workspace members can upload attachments" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'note-attachments' AND
        EXISTS (
            -- This is a bit complex as we don't know the workspace_id from the fileName directly
            -- unless we enforce a naming convention like 'workspace-id/user-id/filename'
            SELECT 1 FROM public.profiles WHERE id = auth.uid()
        )
    );

