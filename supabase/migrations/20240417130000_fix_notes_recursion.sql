-- Migration: Fix Notes RLS Recursion
-- Description: Eliminates infinite recursion in notes and note_collaborators policies.

-- 1. Create a non-recursive helper to check note permissions
-- This bypasses RLS on note_collaborators to break the chain.
CREATE OR REPLACE FUNCTION public.get_note_permission(n_id UUID, u_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN (
        SELECT permission 
        FROM public.note_collaborators 
        WHERE note_id = n_id AND user_id = u_id
    );
END;
$$;

-- 2. Create a non-recursive helper to get a note's workspace
CREATE OR REPLACE FUNCTION public.get_note_workspace_id(n_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN (
        SELECT workspace_id 
        FROM public.notes 
        WHERE id = n_id
    );
END;
$$;

-- 3. Redefine Notes Update Policy
DROP POLICY IF EXISTS "Authors/Collaborators can update notes" ON public.notes;
CREATE POLICY "Authors/Collaborators can update notes" ON public.notes
    FOR UPDATE USING (
        author_id = auth.uid() OR
        public.get_note_permission(id) = 'edit'
    );

-- 4. Redefine Note Collaborators Select Policy
-- This used to query 'notes' via EXISTS, creating recursion.
-- Now it uses get_note_workspace_id and get_workspace_role (which are both SECURITY DEFINER)
DROP POLICY IF EXISTS "Workspace members can view collaborators" ON public.note_collaborators;
CREATE POLICY "Workspace members can view collaborators" ON public.note_collaborators
    FOR SELECT USING (
        public.get_workspace_role(public.get_note_workspace_id(note_id)) IS NOT NULL
    );

-- 5. Redefine Note Links Select Policy (preventing potential recursion there too)
DROP POLICY IF EXISTS "Workspace members can view links" ON public.note_links;
CREATE POLICY "Workspace members can view links" ON public.note_links
    FOR SELECT USING (
        public.get_workspace_role(public.get_note_workspace_id(from_note_id)) IS NOT NULL OR
        public.get_workspace_role(public.get_note_workspace_id(to_note_id)) IS NOT NULL
    );

-- 6. Redefine Note Versions Select Policy
DROP POLICY IF EXISTS "Workspace members can view versions" ON public.note_versions;
CREATE POLICY "Workspace members can view versions" ON public.note_versions
    FOR SELECT USING (
        public.get_workspace_role(public.get_note_workspace_id(note_id)) IS NOT NULL
    );
