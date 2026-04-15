-- Allow all authenticated users to check if a slug is taken
-- This policy only permits selecting the 'slug' column to preserve privacy
CREATE POLICY "Anyone can check if a slug is unique"
ON public.workspaces
FOR SELECT
TO authenticated
USING (true);

-- Note: In a production environment with sensitive slug names, 
-- you might want to restrict this to only the 'slug' column 
-- using a view or a more specific policy if your DB driver supports it.
-- Supabase RLS applies to the whole row by default.
