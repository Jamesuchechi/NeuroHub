-- Migration: Social Layer (Profiles, Stories, Follows, Activities)
-- Description: Adds the storage and relationship structures for an X/IG hybrid social experience.

-- 1. Profile Enhancements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS header_url TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::JSONB;

-- 2. Follows System (X-style)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- 3. Stories System (IG-style)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL means Global Story
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image' NOT NULL, -- 'image' or 'video'
    content TEXT, -- Optional caption
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for expiring stories cleanup
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);

-- 4. Unified Activity Feed
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'post', 'snippet_share', 'note_publish', 'workspace_join'
    payload JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. RLS Policies

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Follows Policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Stories Policies
CREATE POLICY "Global stories are viewable by everyone" 
ON public.stories FOR SELECT USING (workspace_id IS NULL AND expires_at > NOW());

CREATE POLICY "Workspace stories are viewable by members" 
ON public.stories FOR SELECT USING (
    workspace_id IS NOT NULL 
    AND public.authorize('workspace.read', workspace_id) 
    AND expires_at > NOW()
);

CREATE POLICY "Users can create stories" 
ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" 
ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- Activity Policies
CREATE POLICY "Activities are viewable by everyone" 
ON public.activities FOR SELECT USING (workspace_id IS NULL);

CREATE POLICY "Workspace activities are viewable by members" 
ON public.activities FOR SELECT USING (
    workspace_id IS NOT NULL 
    AND public.authorize('workspace.read', workspace_id)
);

CREATE POLICY "Users can create activities" 
ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
