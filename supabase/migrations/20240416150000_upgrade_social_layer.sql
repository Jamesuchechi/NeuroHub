-- Migration: Upgrade Social Layer (Text Stories, Rich Feeds, Visibility)
-- Description: Enhances stories with text/font support and activities with public visibility and attachments.

-- 1. Upgrade Stories Table
ALTER TABLE public.stories 
ALTER COLUMN media_url DROP NOT NULL,
ALTER COLUMN media_type DROP NOT NULL;

ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS background_gradient TEXT,
ADD COLUMN IF NOT EXISTS font_family TEXT;

-- 2. Upgrade Activities Table
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB;

-- 3. Update RLS for Activities to support Public + Workspace dual visibility
DROP POLICY IF EXISTS "Activities are viewable by everyone" ON public.activities;
CREATE POLICY "Activities are viewable by everyone if public" 
ON public.activities FOR SELECT USING (is_public = true OR workspace_id IS NULL);

-- Refresh the workspace membership policy just in case
DROP POLICY IF EXISTS "Workspace activities are viewable by members" ON public.activities;
CREATE POLICY "Workspace activities are viewable by members" 
ON public.activities FOR SELECT USING (
    workspace_id IS NOT NULL 
    AND public.authorize('workspace.read', workspace_id)
);
