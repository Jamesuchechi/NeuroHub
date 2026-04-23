-- Review and Tighten RLS Policies
-- 1. Tighten Profiles access: only authenticated users can view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. Ensure Deny-by-default on any potential new tables
-- (Already handled by ALTER TABLE ... ENABLE ROW LEVEL SECURITY)

-- 3. Review Workspace Members access
-- Only allow members to see other members of the SAME workspace
-- (Existing policy "Members are viewable by workspace members" already does this via authorize helper)

-- 4. Audit Note Collaborators
-- Ensure users can only see collaborators for notes they have access to
DROP POLICY IF EXISTS "Workspace members can view collaborators" ON public.note_collaborators;
CREATE POLICY "Note collaborators are viewable by authorized users"
ON public.note_collaborators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.notes n
        WHERE n.id = note_id AND (
            n.author_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = n.workspace_id AND wm.user_id = auth.uid()
            )
        )
    )
);
